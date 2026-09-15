import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, experiments, lessonVariants } from "@/db/schema";

/**
 * FNV-1a. Deterministic and stable across processes, which matters: a learner
 * must land in the same bucket on every request even if no row exists yet.
 */
function hashToBucket(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export type Assignment = {
  variantId: string;
  label: string;
  exercises: Awaited<ReturnType<typeof loadVariants>>[number]["exercises"];
  experimentId: string | null;
  reason: "control_only" | "sticky" | "bucketed" | "candidate_halted" | "experiment_halted";
};

async function loadVariants(lessonId: string) {
  return db
    .select({
      id: lessonVariants.id,
      label: lessonVariants.label,
      isControl: lessonVariants.isControl,
      status: lessonVariants.status,
      exercises: lessonVariants.exercises,
    })
    .from(lessonVariants)
    .where(eq(lessonVariants.lessonId, lessonId));
}

/**
 * Resolve which variant a learner should see.
 *
 * Falls back to the control variant whenever anything is off — the experiment is
 * halted, the candidate variant is halted, or there is no running experiment.
 * A learner should never be blocked by experiment infrastructure.
 */
export async function resolveVariant(
  lessonId: string,
  learnerId: string,
): Promise<Assignment | null> {
  const variants = await loadVariants(lessonId);
  if (variants.length === 0) return null;

  const control = variants.find((v) => v.isControl) ?? variants[0];
  const asControl = (reason: Assignment["reason"], experimentId: string | null = null) => ({
    variantId: control.id,
    label: control.label,
    exercises: control.exercises,
    experimentId,
    reason,
  });

  const [experiment] = await db
    .select()
    .from(experiments)
    .where(and(eq(experiments.lessonId, lessonId), eq(experiments.status, "running")))
    .limit(1);

  if (!experiment) return asControl("control_only");

  const candidate = variants.find((v) => !v.isControl && v.id !== control.id);
  if (!candidate) return asControl("control_only", experiment.id);
  if (candidate.status === "halted") return asControl("candidate_halted", experiment.id);

  // Sticky: honour an existing assignment before re-bucketing.
  const [existing] = await db
    .select({ variantId: assignments.variantId })
    .from(assignments)
    .where(
      and(eq(assignments.experimentId, experiment.id), eq(assignments.learnerId, learnerId)),
    )
    .limit(1);

  if (existing) {
    const chosen = variants.find((v) => v.id === existing.variantId) ?? control;
    return {
      variantId: chosen.id,
      label: chosen.label,
      exercises: chosen.exercises,
      experimentId: experiment.id,
      reason: "sticky",
    };
  }

  const bucket = hashToBucket(`${experiment.key}:${learnerId}`);
  const chosen = bucket < experiment.trafficSplit ? candidate : control;

  await db
    .insert(assignments)
    .values({ experimentId: experiment.id, variantId: chosen.id, learnerId })
    .onConflictDoNothing();

  return {
    variantId: chosen.id,
    label: chosen.label,
    exercises: chosen.exercises,
    experimentId: experiment.id,
    reason: "bucketed",
  };
}

export const __testing = { hashToBucket };

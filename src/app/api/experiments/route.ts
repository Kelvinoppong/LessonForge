import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { experiments, lessonVariants, lessons } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: experiments.id,
      key: experiments.key,
      name: experiments.name,
      status: experiments.status,
      trafficSplit: experiments.trafficSplit,
      maxErrorRateDelta: experiments.maxErrorRateDelta,
      maxClientErrorRate: experiments.maxClientErrorRate,
      minSessions: experiments.minSessions,
      haltedAt: experiments.haltedAt,
      haltReason: experiments.haltReason,
      createdAt: experiments.createdAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      course: lessons.course,
    })
    .from(experiments)
    .innerJoin(lessons, eq(lessons.id, experiments.lessonId))
    .orderBy(desc(experiments.createdAt));

  return NextResponse.json({ experiments: rows });
}

const createExperiment = z.object({
  lessonId: z.string().uuid(),
  name: z.string().min(3).max(120),
  key: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  trafficSplit: z.number().int().min(1).max(99).default(50),
  maxErrorRateDelta: z.number().min(0.01).max(1).default(0.15),
  maxClientErrorRate: z.number().min(0.001).max(1).default(0.05),
  minSessions: z.number().int().min(1).max(10_000).default(20),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createExperiment.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid experiment", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const variants = await db
    .select({ id: lessonVariants.id, isControl: lessonVariants.isControl })
    .from(lessonVariants)
    .where(eq(lessonVariants.lessonId, parsed.data.lessonId));

  // An experiment needs something to compare. Refuse up front rather than
  // creating one that can never produce a result.
  if (variants.length < 2 || !variants.some((v) => v.isControl)) {
    return NextResponse.json(
      {
        error:
          "This lesson needs a control variant plus at least one candidate before it can run an experiment.",
      },
      { status: 409 },
    );
  }

  const [existing] = await db
    .select({ id: experiments.id })
    .from(experiments)
    .where(eq(experiments.key, parsed.data.key))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: `An experiment with key "${parsed.data.key}" already exists.` },
      { status: 409 },
    );
  }

  const [experiment] = await db.insert(experiments).values(parsed.data).returning();
  return NextResponse.json({ experiment }, { status: 201 });
}

const patchExperiment = z.object({
  id: z.string().uuid(),
  /** "halted" stops traffic; "running" resumes it and clears the halt reason. */
  status: z.enum(["running", "halted", "completed"]),
});

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = patchExperiment.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, status } = parsed.data;
  const [experiment] = await db
    .select()
    .from(experiments)
    .where(eq(experiments.id, id))
    .limit(1);

  if (!experiment) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(experiments)
    .set(
      status === "running"
        ? { status, haltedAt: null, haltReason: null }
        : {
            status,
            haltedAt: new Date(),
            haltReason: status === "halted" ? "Halted manually from the ops dashboard." : null,
          },
    )
    .where(eq(experiments.id, id))
    .returning();

  // Resuming an experiment has to un-halt the candidate too, otherwise assignment
  // keeps falling back to control and the experiment looks alive but isn't.
  if (status === "running") {
    await db
      .update(lessonVariants)
      .set({ status: "active", haltedAt: null, haltReason: null })
      .where(eq(lessonVariants.lessonId, experiment.lessonId));
  }

  return NextResponse.json({ experiment: updated });
}

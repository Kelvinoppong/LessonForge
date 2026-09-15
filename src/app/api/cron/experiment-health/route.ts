import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { experiments, healthChecks, lessonVariants } from "@/db/schema";
import { decideHealthAction, statsForVariants, type VariantStats } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled guardrail sweep (see the `crons` entry in vercel.json).
 *
 * On Vercel there is no long-lived process to watch experiments, so the monitor
 * runs on a schedule: every five minutes it re-reads recent telemetry for each
 * running experiment and halts any candidate variant that breaches a guardrail.
 * Halting flips both the experiment and the variant, which makes assignment fall
 * back to the control for every learner on their next request.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const running = await db.select().from(experiments).where(eq(experiments.status, "running"));

  const results: {
    experimentKey: string;
    action: string;
    detail: string;
  }[] = [];

  for (const experiment of running) {
    const variants = await db
      .select({
        id: lessonVariants.id,
        label: lessonVariants.label,
        isControl: lessonVariants.isControl,
        status: lessonVariants.status,
      })
      .from(lessonVariants)
      .where(eq(lessonVariants.lessonId, experiment.lessonId));

    const control = variants.find((v) => v.isControl);
    const candidate = variants.find((v) => !v.isControl && v.status === "active");

    if (!control || !candidate) {
      results.push({
        experimentKey: experiment.key,
        action: "none",
        detail: "No active control/candidate pair to compare.",
      });
      continue;
    }

    const stats = await statsForVariants([control.id, candidate.id], 24);
    const controlStats = stats.get(control.id) as VariantStats;
    const candidateStats = stats.get(candidate.id) as VariantStats;

    const decision = decideHealthAction(controlStats, candidateStats, {
      maxErrorRateDelta: experiment.maxErrorRateDelta,
      maxClientErrorRate: experiment.maxClientErrorRate,
      minSessions: experiment.minSessions,
    });

    await db.insert(healthChecks).values({
      experimentId: experiment.id,
      candidateSessions: candidateStats.sessions,
      candidateErrorRate: candidateStats.answerErrorRate,
      controlErrorRate: controlStats.answerErrorRate,
      candidateClientErrorRate: candidateStats.clientErrorRate,
      action: decision.action,
      detail: decision.detail,
    });

    if (decision.action === "halted") {
      const haltedAt = new Date();
      const reason = `Auto-halted by health monitor: ${decision.detail}`;

      await db
        .update(experiments)
        .set({ status: "halted", haltedAt, haltReason: reason })
        .where(eq(experiments.id, experiment.id));

      await db
        .update(lessonVariants)
        .set({ status: "halted", haltedAt, haltReason: reason })
        .where(eq(lessonVariants.id, candidate.id));

      console.warn(`[health] halted experiment ${experiment.key}: ${decision.detail}`);
    }

    results.push({
      experimentKey: experiment.key,
      action: decision.action,
      detail: decision.detail,
    });
  }

  return NextResponse.json({
    evaluated: running.length,
    halted: results.filter((r) => r.action === "halted").length,
    results,
  });
}

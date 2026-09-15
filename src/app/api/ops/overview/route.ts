import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { experiments, healthChecks, lessonVariants, lessons } from "@/db/schema";
import { errorRateSeries, statsForVariants } from "@/lib/metrics";

export const dynamic = "force-dynamic";

/** Everything the ops dashboard renders, in one round trip. */
export async function GET(request: Request) {
  const windowHours = Number(new URL(request.url).searchParams.get("windowHours") ?? 24);
  const window = Number.isFinite(windowHours) ? Math.min(Math.max(windowHours, 1), 168) : 24;

  const experimentRows = await db
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
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      course: lessons.course,
    })
    .from(experiments)
    .innerJoin(lessons, eq(lessons.id, experiments.lessonId))
    .orderBy(desc(experiments.createdAt));

  if (experimentRows.length === 0) {
    return NextResponse.json({ window, experiments: [], series: [], recentChecks: [] });
  }

  const lessonIds = [...new Set(experimentRows.map((e) => e.lessonId))];
  const variants = await db
    .select({
      id: lessonVariants.id,
      lessonId: lessonVariants.lessonId,
      label: lessonVariants.label,
      isControl: lessonVariants.isControl,
      status: lessonVariants.status,
      authoredBy: lessonVariants.authoredBy,
      haltReason: lessonVariants.haltReason,
    })
    .from(lessonVariants)
    .where(inArray(lessonVariants.lessonId, lessonIds));

  const stats = await statsForVariants(
    variants.map((v) => v.id),
    window,
  );

  const enriched = experimentRows.map((experiment) => {
    const own = variants.filter((v) => v.lessonId === experiment.lessonId);
    return {
      ...experiment,
      variants: own.map((v) => ({
        ...v,
        stats: stats.get(v.id) ?? null,
      })),
    };
  });

  const [series, recentChecks] = await Promise.all([
    errorRateSeries(
      variants.map((v) => v.id),
      window,
    ),
    db
      .select({
        id: healthChecks.id,
        experimentId: healthChecks.experimentId,
        experimentKey: experiments.key,
        evaluatedAt: healthChecks.evaluatedAt,
        action: healthChecks.action,
        detail: healthChecks.detail,
        candidateSessions: healthChecks.candidateSessions,
      })
      .from(healthChecks)
      .innerJoin(experiments, eq(experiments.id, healthChecks.experimentId))
      .orderBy(desc(healthChecks.evaluatedAt))
      .limit(25),
  ]);

  const variantLabels = Object.fromEntries(variants.map((v) => [v.id, v.label]));

  return NextResponse.json({
    window,
    experiments: enriched,
    series: series.map((row) => ({
      ...row,
      variantLabel: variantLabels[row.variantId] ?? "unknown",
      errorRate: row.answers > 0 ? row.wrong / row.answers : 0,
    })),
    recentChecks,
  });
}

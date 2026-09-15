import { and, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { emptyStats, type VariantStats } from "@/lib/guardrails";

export type { VariantStats } from "@/lib/guardrails";
export { decideHealthAction, type Guardrails, type HealthDecision } from "@/lib/guardrails";

/** Aggregate telemetry for a set of variants over a trailing window. */
export async function statsForVariants(
  variantIds: string[],
  windowHours = 24,
): Promise<Map<string, VariantStats>> {
  const result = new Map<string, VariantStats>();
  if (variantIds.length === 0) return result;

  for (const id of variantIds) result.set(id, emptyStats(id));

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const rows = await db
    .select({
      variantId: events.variantId,
      sessions: sql<number>`count(distinct ${events.learnerId})`.mapWith(Number),
      answers: sql<number>`count(*) filter (where ${events.type} = 'exercise_answer')`.mapWith(
        Number,
      ),
      wrongAnswers:
        sql<number>`count(*) filter (where ${events.type} = 'exercise_answer' and ${events.correct} = false)`.mapWith(
          Number,
        ),
      clientErrors:
        sql<number>`count(*) filter (where ${events.type} in ('client_error', 'audio_error'))`.mapWith(
          Number,
        ),
      completions:
        sql<number>`count(*) filter (where ${events.type} = 'lesson_complete')`.mapWith(Number),
      p95LatencyMs:
        sql<number>`coalesce(percentile_cont(0.95) within group (order by ${events.latencyMs}) filter (where ${events.latencyMs} is not null), 0)`.mapWith(
          Number,
        ),
    })
    .from(events)
    .where(and(gte(events.createdAt, since), inArray(events.variantId, variantIds)))
    .groupBy(events.variantId);

  for (const row of rows) {
    result.set(row.variantId, {
      variantId: row.variantId,
      sessions: row.sessions,
      answers: row.answers,
      wrongAnswers: row.wrongAnswers,
      answerErrorRate: row.answers > 0 ? row.wrongAnswers / row.answers : 0,
      clientErrors: row.clientErrors,
      clientErrorRate: row.sessions > 0 ? row.clientErrors / row.sessions : 0,
      completions: row.completions,
      completionRate: row.sessions > 0 ? row.completions / row.sessions : 0,
      p95LatencyMs: Math.round(row.p95LatencyMs),
    });
  }

  return result;
}

/** Hourly error-rate series for the ops dashboard. */
export async function errorRateSeries(variantIds: string[], windowHours = 24) {
  if (variantIds.length === 0) return [];
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  return db
    .select({
      bucket: sql<string>`to_char(date_trunc('hour', ${events.createdAt}), 'YYYY-MM-DD"T"HH24:00')`,
      variantId: events.variantId,
      answers: sql<number>`count(*) filter (where ${events.type} = 'exercise_answer')`.mapWith(
        Number,
      ),
      wrong:
        sql<number>`count(*) filter (where ${events.type} = 'exercise_answer' and ${events.correct} = false)`.mapWith(
          Number,
        ),
      clientErrors:
        sql<number>`count(*) filter (where ${events.type} in ('client_error', 'audio_error'))`.mapWith(
          Number,
        ),
    })
    .from(events)
    .where(and(gte(events.createdAt, since), inArray(events.variantId, variantIds)))
    .groupBy(sql`1`, events.variantId)
    .orderBy(sql`1`);
}

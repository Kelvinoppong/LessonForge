import { and, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";

export type VariantStats = {
  variantId: string;
  sessions: number;
  answers: number;
  wrongAnswers: number;
  /** Share of submitted answers that were wrong. High = lesson may be confusing. */
  answerErrorRate: number;
  clientErrors: number;
  /** Client/audio errors per session. High = the lesson is actually broken. */
  clientErrorRate: number;
  completions: number;
  completionRate: number;
  p95LatencyMs: number;
};

const EMPTY_STATS = (variantId: string): VariantStats => ({
  variantId,
  sessions: 0,
  answers: 0,
  wrongAnswers: 0,
  answerErrorRate: 0,
  clientErrors: 0,
  clientErrorRate: 0,
  completions: 0,
  completionRate: 0,
  p95LatencyMs: 0,
});

/** Aggregate telemetry for a set of variants over a trailing window. */
export async function statsForVariants(
  variantIds: string[],
  windowHours = 24,
): Promise<Map<string, VariantStats>> {
  const result = new Map<string, VariantStats>();
  if (variantIds.length === 0) return result;

  for (const id of variantIds) result.set(id, EMPTY_STATS(id));

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

export type Guardrails = {
  maxErrorRateDelta: number;
  maxClientErrorRate: number;
  minSessions: number;
};

export type HealthDecision = {
  action: "none" | "halted" | "skipped_low_traffic";
  detail: string;
};

/**
 * Pure guardrail evaluation, kept separate from IO so it can be reasoned about
 * and tested directly.
 *
 * Two independent halt conditions:
 *  1. The candidate is measurably harder to get right than the control, beyond
 *     the allowed delta. That's a content regression.
 *  2. The candidate is throwing client errors above an absolute threshold.
 *     That's a bug, and the delta against control doesn't matter.
 */
export function decideHealthAction(
  control: VariantStats,
  candidate: VariantStats,
  guardrails: Guardrails,
): HealthDecision {
  if (candidate.sessions < guardrails.minSessions) {
    return {
      action: "skipped_low_traffic",
      detail: `Candidate has ${candidate.sessions} sessions, needs ${guardrails.minSessions} before evaluation.`,
    };
  }

  if (candidate.clientErrorRate > guardrails.maxClientErrorRate) {
    return {
      action: "halted",
      detail:
        `Client error rate ${pct(candidate.clientErrorRate)} per session exceeds the ` +
        `${pct(guardrails.maxClientErrorRate)} ceiling (${candidate.clientErrors} errors across ${candidate.sessions} sessions).`,
    };
  }

  const delta = candidate.answerErrorRate - control.answerErrorRate;
  if (delta > guardrails.maxErrorRateDelta) {
    return {
      action: "halted",
      detail:
        `Answer error rate ${pct(candidate.answerErrorRate)} vs control ${pct(control.answerErrorRate)} ` +
        `is a +${pct(delta)} regression, above the +${pct(guardrails.maxErrorRateDelta)} guardrail.`,
    };
  }

  return {
    action: "none",
    detail:
      `Healthy: error rate ${pct(candidate.answerErrorRate)} vs control ${pct(control.answerErrorRate)}, ` +
      `client errors ${pct(candidate.clientErrorRate)} per session.`,
  };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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

/**
 * Guardrail evaluation.
 *
 * Deliberately free of database and network imports: deciding whether a variant
 * is harming learners is the most consequential logic in the platform, so it's a
 * pure function over aggregated numbers that can be tested directly.
 */

export type VariantStats = {
  variantId: string;
  sessions: number;
  answers: number;
  wrongAnswers: number;
  /** Share of submitted answers that were wrong. High = the lesson may be confusing. */
  answerErrorRate: number;
  clientErrors: number;
  /** Client/audio errors per session. High = the lesson is actually broken. */
  clientErrorRate: number;
  completions: number;
  completionRate: number;
  p95LatencyMs: number;
};

export type Guardrails = {
  /** Max tolerated increase in answer error rate over the control. */
  maxErrorRateDelta: number;
  /** Absolute ceiling on client errors per session. */
  maxClientErrorRate: number;
  /** Minimum candidate sessions before any judgement is made. */
  minSessions: number;
};

export type HealthDecision = {
  action: "none" | "halted" | "skipped_low_traffic";
  detail: string;
};

export function emptyStats(variantId: string): VariantStats {
  return {
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
  };
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Two independent halt conditions:
 *
 *  1. The candidate is measurably harder to answer correctly than the control,
 *     beyond the allowed delta. That's a content regression.
 *  2. The candidate is throwing client errors above an absolute threshold. That's
 *     a bug, and the comparison against control is irrelevant — broken is broken.
 *
 * Both are gated on a minimum sample size, because halting on three sessions of
 * noise would make the whole mechanism untrustworthy.
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
        `Client error rate ${formatPct(candidate.clientErrorRate)} per session exceeds the ` +
        `${formatPct(guardrails.maxClientErrorRate)} ceiling ` +
        `(${candidate.clientErrors} errors across ${candidate.sessions} sessions).`,
    };
  }

  const delta = candidate.answerErrorRate - control.answerErrorRate;
  if (delta > guardrails.maxErrorRateDelta) {
    return {
      action: "halted",
      detail:
        `Answer error rate ${formatPct(candidate.answerErrorRate)} vs control ` +
        `${formatPct(control.answerErrorRate)} is a +${formatPct(delta)} regression, ` +
        `above the +${formatPct(guardrails.maxErrorRateDelta)} guardrail.`,
    };
  }

  return {
    action: "none",
    detail:
      `Healthy: error rate ${formatPct(candidate.answerErrorRate)} vs control ` +
      `${formatPct(control.answerErrorRate)}, client errors ` +
      `${formatPct(candidate.clientErrorRate)} per session.`,
  };
}

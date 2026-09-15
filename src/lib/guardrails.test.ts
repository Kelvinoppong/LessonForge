import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideHealthAction, emptyStats, type Guardrails, type VariantStats } from "./guardrails.ts";

const GUARDRAILS: Guardrails = {
  maxErrorRateDelta: 0.15,
  maxClientErrorRate: 0.05,
  minSessions: 20,
};

function stats(overrides: Partial<VariantStats>): VariantStats {
  return { ...emptyStats("variant"), ...overrides };
}

describe("decideHealthAction", () => {
  it("waits for enough traffic before judging a variant", () => {
    const decision = decideHealthAction(
      stats({ sessions: 500, answerErrorRate: 0.2 }),
      stats({ sessions: 19, answerErrorRate: 0.9 }),
      GUARDRAILS,
    );

    assert.equal(decision.action, "skipped_low_traffic");
    assert.match(decision.detail, /19 sessions/);
  });

  it("leaves a healthy candidate running", () => {
    const decision = decideHealthAction(
      stats({ sessions: 200, answerErrorRate: 0.3 }),
      stats({ sessions: 200, answerErrorRate: 0.28 }),
      GUARDRAILS,
    );

    assert.equal(decision.action, "none");
  });

  it("tolerates a regression that stays inside the delta", () => {
    const decision = decideHealthAction(
      stats({ sessions: 200, answerErrorRate: 0.3 }),
      stats({ sessions: 200, answerErrorRate: 0.44 }),
      GUARDRAILS,
    );

    assert.equal(decision.action, "none");
  });

  it("halts a candidate whose error rate regresses past the delta", () => {
    const decision = decideHealthAction(
      stats({ sessions: 200, answerErrorRate: 0.3 }),
      stats({ sessions: 200, answerErrorRate: 0.5 }),
      GUARDRAILS,
    );

    assert.equal(decision.action, "halted");
    assert.match(decision.detail, /regression/);
  });

  it("halts on client errors regardless of how the control compares", () => {
    const decision = decideHealthAction(
      // Control is equally error-prone, so the delta check would pass.
      stats({ sessions: 200, answerErrorRate: 0.3, clientErrorRate: 0.4 }),
      stats({ sessions: 200, answerErrorRate: 0.3, clientErrorRate: 0.4, clientErrors: 80 }),
      GUARDRAILS,
    );

    assert.equal(decision.action, "halted");
    assert.match(decision.detail, /Client error rate/);
  });

  it("prefers the client-error reason when both guardrails are breached", () => {
    const decision = decideHealthAction(
      stats({ sessions: 200, answerErrorRate: 0.1 }),
      stats({ sessions: 200, answerErrorRate: 0.9, clientErrorRate: 0.5, clientErrors: 100 }),
      GUARDRAILS,
    );

    assert.equal(decision.action, "halted");
    assert.match(decision.detail, /Client error rate/);
  });

  it("does not halt exactly at the threshold", () => {
    const decision = decideHealthAction(
      stats({ sessions: 200, answerErrorRate: 0.2 }),
      stats({ sessions: 200, answerErrorRate: 0.35, clientErrorRate: 0.05 }),
      GUARDRAILS,
    );

    assert.equal(decision.action, "none");
  });
});

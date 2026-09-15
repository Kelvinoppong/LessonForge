import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashToBucket, inCandidateGroup } from "./bucketing.ts";

describe("hashToBucket", () => {
  it("is deterministic", () => {
    assert.equal(hashToBucket("exp-a:learner-1"), hashToBucket("exp-a:learner-1"));
  });

  it("stays within 0-99", () => {
    for (let i = 0; i < 2000; i++) {
      const bucket = hashToBucket(`exp:learner-${i}`);
      assert.ok(bucket >= 0 && bucket < 100, `bucket ${bucket} out of range`);
      assert.ok(Number.isInteger(bucket));
    }
  });

  it("spreads learners roughly evenly across deciles", () => {
    const deciles = new Array(10).fill(0);
    const total = 20_000;

    for (let i = 0; i < total; i++) {
      deciles[Math.floor(hashToBucket(`spread:learner-${i}`) / 10)]++;
    }

    // A biased hash would silently invalidate every experiment result, so allow
    // only a modest deviation from the expected 10% per decile.
    const expected = total / 10;
    for (const [index, count] of deciles.entries()) {
      const deviation = Math.abs(count - expected) / expected;
      assert.ok(deviation < 0.1, `decile ${index} deviates ${(deviation * 100).toFixed(1)}%`);
    }
  });
});

describe("inCandidateGroup", () => {
  it("honours the traffic split within a few percent", () => {
    const total = 20_000;
    let candidates = 0;

    for (let i = 0; i < total; i++) {
      if (inCandidateGroup("split-test", `learner-${i}`, 25)) candidates++;
    }

    const share = (candidates / total) * 100;
    assert.ok(Math.abs(share - 25) < 2, `expected ~25%, got ${share.toFixed(1)}%`);
  });

  it("sends nobody to the candidate at a 0% split", () => {
    for (let i = 0; i < 500; i++) {
      assert.equal(inCandidateGroup("zero", `learner-${i}`, 0), false);
    }
  });

  it("sends everybody to the candidate at a 100% split", () => {
    for (let i = 0; i < 500; i++) {
      assert.equal(inCandidateGroup("full", `learner-${i}`, 100), true);
    }
  });

  it("buckets the same learner independently across experiments", () => {
    // Reusing one seed across experiments would trap the same unlucky cohort in
    // every candidate group at once.
    let differing = 0;
    for (let i = 0; i < 1000; i++) {
      const learner = `learner-${i}`;
      if (inCandidateGroup("exp-one", learner, 50) !== inCandidateGroup("exp-two", learner, 50)) {
        differing++;
      }
    }

    assert.ok(differing > 350, `expected substantial independence, only ${differing}/1000 differed`);
  });
});

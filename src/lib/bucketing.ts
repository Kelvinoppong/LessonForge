/**
 * Deterministic traffic bucketing.
 *
 * Kept separate from assignment IO so the distribution properties can be tested:
 * a biased hash would quietly invalidate every experiment result.
 */

/** FNV-1a, chosen because it's stable across processes and cheap. */
export function hashToBucket(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

/**
 * Whether a learner falls into the candidate group.
 *
 * The experiment key is part of the seed so that two concurrent experiments don't
 * bucket the same learners together — otherwise the same unlucky cohort would be
 * in every candidate group at once.
 */
export function inCandidateGroup(
  experimentKey: string,
  learnerId: string,
  trafficSplit: number,
): boolean {
  return hashToBucket(`${experimentKey}:${learnerId}`) < trafficSplit;
}

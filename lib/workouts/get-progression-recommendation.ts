import type { ProgressionFeatures } from "@/lib/workouts/get-progression-features";
import type { TargetComplianceFeatures } from "@/lib/workouts/get-target-compliance";

export type ProgressionAction =
  | "increase_load"
  | "maintain"
  | "reduce_load"
  | "collect_more_data";

export type ProgressionRecommendation = {
  action: ProgressionAction;
  confidence: "low" | "medium" | "high";
  reason: string;

  targetRepRange: {
    min: number;
    max: number;
  } | null;
};

/*
 * Convert target reps stored as text into numbers.
 *
 * Examples:
 *
 * "8"     → { min: 8, max: 8 }
 * "8-10"  → { min: 8, max: 10 }
 * "10-12" → { min: 10, max: 12 }
 *
 * Unsupported values such as "AMRAP"
 * return null for now.
 */
function parseTargetReps(
  targetReps: string
): {
  min: number;
  max: number;
} | null {
  const cleaned = targetReps
    .trim()
    .replace(/\s/g, "")
    .replace(/[–—]/g, "-");

  /*
   * Single number:
   *
   * "8"
   */
  if (/^\d+$/.test(cleaned)) {
    const value = Number(cleaned);

    return {
      min: value,
      max: value,
    };
  }

  /*
   * Rep range:
   *
   * "8-10"
   */
  const rangeMatch = cleaned.match(
    /^(\d+)-(\d+)$/
  );

  if (!rangeMatch) {
    return null;
  }

  const min = Number(rangeMatch[1]);
  const max = Number(rangeMatch[2]);

  if (min > max) {
    return null;
  }

  return {
    min,
    max,
  };
}

export function getProgressionRecommendation(
  features: ProgressionFeatures,
  targetSets: number,
  targetReps: string,
   compliance: TargetComplianceFeatures | null = null
): ProgressionRecommendation {
  const repRange =
    parseTargetReps(targetReps);

  /*
   * Rule 1:
   *
   * We cannot reason properly about unsupported
   * target formats yet.
   */
  if (!repRange) {
    return {
      action: "collect_more_data",
      confidence: "low",
      reason:
        "The target rep format is not supported by the progression engine yet.",
      targetRepRange: null,
    };
  }

  /*
   * Rule 2:
   *
   * Very little history means we should avoid
   * aggressive recommendations.
   */
  if (features.sessionCount < 2) {
    return {
      action: "collect_more_data",
      confidence: "low",
      reason:
        "More workout history is needed before making a progression recommendation.",
      targetRepRange: repRange,
    };
  }

  /*
   * Protect against missing rep data.
   */
  if (
    features.latestMinReps === null ||
    features.latestAverageReps === null
  ) {
    return {
      action: "collect_more_data",
      confidence: "low",
      reason:
        "The latest workout does not contain enough rep data.",
      targetRepRange: repRange,
    };
  }

  const allTargetSetsCompleted =
    features.latestCompletedSets >= targetSets;

  /*
   * Measure how wide the prescribed rep range is.
   *
   * Example:
   *
   * Target: 6-8
   * Range width = 2
   */
  const targetRangeWidth =
    repRange.max - repRange.min;

  /*
   * Detect unusually uneven set performance.
   *
   * Example:
   *
   * Target: 6-8
   * Latest reps: 15, 10, 6
   *
   * Rep spread = 15 - 6 = 9
   * Target range width = 8 - 6 = 2
   *
   * Since 9 > 2, performance is considered uneven.
   */
  const hasUnevenRepPerformance =
    features.latestRepSpread !== null &&
    features.latestRepSpread >
      targetRangeWidth;

  /*
   * Rule 3:
   *
   * User completed all required sets and every
   * set reached the top of the target rep range.
   *
   * Example:
   *
   * Target: 3 × 8-10
   * Result: 10, 10, 10
   *
   * → increase load
   */
  if (
    allTargetSetsCompleted &&
    features.latestMinReps >= repRange.max
  ) {
    return {
      action: "increase_load",
      confidence: "high",
      reason:
        `All ${targetSets} target sets were completed at or above the top of the ${repRange.min}-${repRange.max} rep range.`,
      targetRepRange: repRange,
    };
  }

  /*
   * Rule 4:
   *
   * User completed all target sets and reached
   * at least the minimum rep target, but the
   * set-to-set performance was unusually uneven.
   *
   * Example:
   *
   * Target: 3 × 6-8
   * Result: 15, 10, 6
   *
   * → maintain load
   * → lower confidence
   * → focus on more consistent sets
   */
  if (
    allTargetSetsCompleted &&
    features.latestMinReps >= repRange.min &&
    hasUnevenRepPerformance
  ) {
    return {
      action: "maintain",
      confidence: "medium",
      reason:
        `All target sets reached the minimum of ${repRange.min} reps, but performance was uneven across sets. Maintain the current load and aim for more consistent reps before increasing weight.`,
      targetRepRange: repRange,
    };
  }

  /*
   * Rule 5:
   *
   * All sets completed and every set reached
   * at least the minimum target.
   *
   * Example:
   *
   * Target: 3 × 8-10
   * Result: 9, 8, 8
   *
   * → maintain current load
   */
  if (
    allTargetSetsCompleted &&
    features.latestMinReps >= repRange.min
  ) {
    return {
      action: "maintain",
      confidence: "high",
      reason:
        `All target sets reached the minimum of ${repRange.min} reps, but not every set reached the top of the range.`,
      targetRepRange: repRange,
    };
  }

  /*
   * Rule 6:
   *
   * Performance is below the minimum target AND
   * overall recent volume is declining.
   *
   * This is a stronger signal that the current load
   * may be too difficult.
   */
  const complianceIsImproving =
  compliance?.complianceTrend === "improving";

  if (
    features.latestMinReps < repRange.min &&
    features.trend === "declining" &&
    !complianceIsImproving
  ) {
    return {
      action: "reduce_load",
      confidence: "medium",
      reason:
        `The latest session fell below the minimum target of ${repRange.min} reps, recent training volume is declining, and target-range compliance is not improving.`,
      targetRepRange: repRange,
    };
  }
  // // if (
  // //   features.latestMinReps < repRange.min &&
  // //   features.trend === "declining"
  // // ) {
  //   return {
  //     action: "reduce_load",
  //     confidence: "medium",
  //     reason:
  //       `The latest session fell below the minimum target of ${repRange.min} reps and recent training volume is declining.`,
  //     targetRepRange: repRange,
  //   };
  // }

  /*
   * Rule 7:
   *
   * User missed the rep target, but there is not
   * enough evidence to immediately reduce load.
   */
  if (
    features.latestMinReps < repRange.min
  ) {
    return {
      action: "maintain",
      confidence: "medium",
      reason:
        `Some sets fell below the minimum target of ${repRange.min} reps. Keep the current load and gather another session before reducing it.`,
      targetRepRange: repRange,
    };
  }

  /*
   * Fallback.
   */
  return {
    action: "maintain",
    confidence: "low",
    reason:
      "There is not enough evidence to change the current training load.",
    targetRepRange: repRange,
  };
}
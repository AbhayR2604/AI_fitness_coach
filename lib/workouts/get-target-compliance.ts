import type { ExerciseHistorySession } from "@/lib/workouts/get-exercise-history";

export type TargetComplianceFeatures = {
  latestTargetCompliancePercent: number | null;
  previousTargetCompliancePercent: number | null;

  complianceTrend:
    | "improving"
    | "declining"
    | "stable"
    | "insufficient_data";
};

/*
 * Convert target reps such as:
 *
 * "8"
 * "6-8"
 * "6–8"
 *
 * into:
 *
 * { min: 6, max: 8 }
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
   * Fixed rep target.
   *
   * Example:
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
   * Rep range.
   *
   * Example:
   * "6-8"
   */
  const match = cleaned.match(
    /^(\d+)-(\d+)$/
  );

  if (!match) {
    return null;
  }

  const min = Number(match[1]);
  const max = Number(match[2]);

  if (min > max) {
    return null;
  }

  return {
    min,
    max,
  };
}

/*
 * Calculate what percentage of sets landed
 * inside the prescribed rep range.
 */
function calculateCompliance(
  session: ExerciseHistorySession,
  min: number,
  max: number
): number | null {
  if (session.reps.length === 0) {
    return null;
  }

  const setsInsideRange =
    session.reps.filter(
      (reps) =>
        reps >= min &&
        reps <= max
    ).length;

  const percentage =
    (setsInsideRange /
      session.reps.length) *
    100;

  return Number(
    percentage.toFixed(2)
  );
}

export function getTargetCompliance(
  history: ExerciseHistorySession[],
  targetReps: string
): TargetComplianceFeatures {
  const range =
    parseTargetReps(targetReps);

  /*
   * We cannot calculate compliance if
   * the target format is unsupported.
   */
  if (!range) {
    return {
      latestTargetCompliancePercent: null,
      previousTargetCompliancePercent: null,
      complianceTrend:
        "insufficient_data",
    };
  }

  /*
   * No workout history.
   */
  if (history.length === 0) {
    return {
      latestTargetCompliancePercent: null,
      previousTargetCompliancePercent: null,
      complianceTrend:
        "insufficient_data",
    };
  }

  const latest =
    history[0];

  const previous =
    history.length > 1
      ? history[1]
      : null;

  const latestTargetCompliancePercent =
    calculateCompliance(
      latest,
      range.min,
      range.max
    );

  const previousTargetCompliancePercent =
    previous
      ? calculateCompliance(
          previous,
          range.min,
          range.max
        )
      : null;

  let complianceTrend:
    TargetComplianceFeatures["complianceTrend"];

  if (
    latestTargetCompliancePercent === null ||
    previousTargetCompliancePercent === null
  ) {
    complianceTrend =
      "insufficient_data";
  } else if (
    latestTargetCompliancePercent >
    previousTargetCompliancePercent
  ) {
    complianceTrend =
      "improving";
  } else if (
    latestTargetCompliancePercent <
    previousTargetCompliancePercent
  ) {
    complianceTrend =
      "declining";
  } else {
    complianceTrend =
      "stable";
  }

  return {
    latestTargetCompliancePercent,
    previousTargetCompliancePercent,
    complianceTrend,
  };
}
import type { ExerciseHistorySession } from "@/lib/workouts/get-exercise-history";

export type ProgressionFeatures = {
  sessionCount: number;

  latestWeight: number | null;
  latestVolume: number;
  previousVolume: number | null;
  volumeChangePercent: number | null;

  latestCompletedSets: number;
  latestAverageReps: number | null;
  latestMinReps: number | null;
  latestMaxReps: number | null;
  latestRepSpread: number | null;

  trend:
    | "improving"
    | "declining"
    | "stable"
    | "insufficient_data";
};

export function getProgressionFeatures(
  history: ExerciseHistorySession[]
): ProgressionFeatures {
  /*
   * No workout history at all.
   */
  if (history.length === 0) {
    return {
      sessionCount: 0,

      latestWeight: null,
      latestVolume: 0,
      previousVolume: null,
      volumeChangePercent: null,

      latestCompletedSets: 0,
      latestAverageReps: null,
      latestMinReps: null,
      latestMaxReps: null,
      latestRepSpread: null,

      trend: "insufficient_data",
    };
  }

  /*
   * getExerciseHistory() already returns
   * newest session first.
   */
  const latest = history[0];

  const previous =
    history.length > 1 ? history[1] : null;

  /*
   * Calculate average reps for the latest session.
   */
  const latestAverageReps =
    latest.reps.length > 0
      ? latest.reps.reduce(
          (total, reps) => total + reps,
          0
        ) / latest.reps.length
      : null;

  /*
   * Find minimum and maximum reps
   * from the latest session.
   */
  const latestMinReps =
    latest.reps.length > 0
      ? Math.min(...latest.reps)
      : null;

  const latestMaxReps =
    latest.reps.length > 0
      ? Math.max(...latest.reps)
      : null;
  
  const latestRepSpread =
  latestMinReps !== null &&
  latestMaxReps !== null
    ? latestMaxReps - latestMinReps
    : null;

  /*
   * Calculate volume change compared
   * with the previous workout.
   */
  let volumeChangePercent: number | null = null;

  if (
    previous &&
    previous.volume > 0
  ) {
    volumeChangePercent =
      ((latest.volume - previous.volume) /
        previous.volume) *
      100;
  }

  /*
   * Simple trend classification.
   *
   * For now:
   *
   * > +5% volume = improving
   * < -5% volume = declining
   * otherwise = stable
   *
   * This is deliberately simple.
   * Later we can improve it using
   * more sessions and other metrics.
   */
  let trend: ProgressionFeatures["trend"];

  if (!previous) {
    trend = "insufficient_data";
  } else if (
    volumeChangePercent !== null &&
    volumeChangePercent > 5
  ) {
    trend = "improving";
  } else if (
    volumeChangePercent !== null &&
    volumeChangePercent < -5
  ) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  return {
    sessionCount: history.length,

    latestWeight: latest.weight,
    latestVolume: latest.volume,

    previousVolume:
      previous?.volume ?? null,

    volumeChangePercent:
      volumeChangePercent === null
        ? null
        : Number(
            volumeChangePercent.toFixed(2)
          ),

    latestCompletedSets:
      latest.completedSets,

    latestAverageReps:
      latestAverageReps === null
        ? null
        : Number(
            latestAverageReps.toFixed(2)
          ),

    latestMinReps,
    latestMaxReps,
    latestRepSpread,

    trend,
  };
}
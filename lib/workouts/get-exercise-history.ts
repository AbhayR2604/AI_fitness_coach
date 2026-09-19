import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ExerciseHistorySession = {
  sessionId: string;
  date: string;
  weight: number | null;
  reps: number[];
  completedSets: number;
  volume: number;
};

type SessionSetRow = {
  workout_session_id: string;
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps_performed: number | null;
  completed: boolean;

  workout_sessions:
    | {
        id: string;
        session_date: string;
        user_id: string;
      }
    | {
        id: string;
        session_date: string;
        user_id: string;
      }[]
    | null;
};

export async function getExerciseHistory(
  exerciseName: string,
  limit = 5
): Promise<ExerciseHistorySession[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User is not authenticated.");
  }

  const { data, error } = await supabase
    .from("session_sets")
    .select(`
      workout_session_id,
      exercise_name,
      set_number,
      weight,
      reps_performed,
      completed,
      workout_sessions (
        id,
        session_date,
        user_id
      )
    `)
    .eq("exercise_name", exerciseName)
    .eq("completed", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load exercise history: ${error.message}`
    );
  }

  const rows = (data ?? []) as SessionSetRow[];

  /*
   * Group individual set rows by workout session.
   */
  const grouped = new Map<
    string,
    {
      sessionId: string;
      date: string;
      weights: number[];
      reps: number[];
      completedSets: number;
      volume: number;
    }
  >();

  for (const row of rows) {
    const sessionRelation = row.workout_sessions;

    const session = Array.isArray(sessionRelation)
      ? sessionRelation[0]
      : sessionRelation;

    if (!session) {
      continue;
    }

    /*
     * Extra ownership check.
     * RLS should already protect this,
     * but this makes the logic explicit.
     */
    if (session.user_id !== user.id) {
      continue;
    }

    if (!grouped.has(row.workout_session_id)) {
      grouped.set(row.workout_session_id, {
        sessionId: row.workout_session_id,
        date: session.session_date,
        weights: [],
        reps: [],
        completedSets: 0,
        volume: 0,
      });
    }

    const sessionGroup = grouped.get(
      row.workout_session_id
    );

    if (!sessionGroup) {
      continue;
    }

    const weight =
      row.weight === null
        ? null
        : Number(row.weight);

    const reps =
      row.reps_performed === null
        ? null
        : Number(row.reps_performed);

    if (weight !== null) {
      sessionGroup.weights.push(weight);
    }

    if (reps !== null) {
      sessionGroup.reps.push(reps);
    }

    sessionGroup.completedSets += 1;

    if (
      weight !== null &&
      reps !== null
    ) {
      sessionGroup.volume += weight * reps;
    }
  }

  /*
   * Convert Map into a clean array.
   */
  const history: ExerciseHistorySession[] =
    Array.from(grouped.values()).map(
      (session) => ({
        sessionId: session.sessionId,
        date: session.date,

        /*
         * For now, use the first recorded weight
         * as the representative weight.
         *
         * Later we can support different weights
         * within one exercise session more explicitly.
         */
        weight:
          session.weights.length > 0
            ? session.weights[0]
            : null,

        reps: session.reps,
        completedSets:
          session.completedSets,

        volume:
          session.volume,
      })
    );

  /*
   * Sort newest sessions first.
   */
  history.sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );

  return history.slice(0, limit);
}
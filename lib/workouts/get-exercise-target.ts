import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ExerciseTarget = {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number | null;
};

export async function getExerciseTarget(
  exerciseName: string
): Promise<ExerciseTarget | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User is not authenticated.");
  }

  /*
   * We query workout_plan_exercises,
   * but also join workout_plans so we can
   * verify the exercise belongs to the
   * currently logged-in user.
   */
  const { data, error } = await supabase
    .from("workout_plan_exercises")
    .select(`
      id,
      exercise_name,
      target_sets,
      target_reps,
      rest_seconds,
      workout_plans (
        user_id
      )
    `)
    .eq("exercise_name", exerciseName)
    .limit(10);

  if (error) {
    throw new Error(
      `Failed to load exercise target: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  /*
   * Find the exercise that belongs
   * to the authenticated user.
   */
  const ownedExercise = data.find((row) => {
    const planRelation = row.workout_plans;

    const plan = Array.isArray(planRelation)
      ? planRelation[0]
      : planRelation;

    return plan?.user_id === user.id;
  });

  if (!ownedExercise) {
    return null;
  }

  return {
    exerciseId: ownedExercise.id,
    exerciseName: ownedExercise.exercise_name,
    targetSets: ownedExercise.target_sets,
    targetReps: ownedExercise.target_reps,
    restSeconds: ownedExercise.rest_seconds,
  };
}
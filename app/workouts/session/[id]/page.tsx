import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WorkoutSession } from "@/components/workout-session";

type SessionPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    sessionId?: string;
  }>;
};

export default async function SessionPage({
  params,
  searchParams,
}: SessionPageProps) {
  const { id: workoutPlanId } = await params;
  const { sessionId } = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: workoutPlan, error: planError } = await supabase
    .from("workout_plans")
    .select("id, name, description")
    .eq("id", workoutPlanId)
    .eq("user_id", user.id)
    .single();

  if (planError || !workoutPlan) {
    console.error("Failed to load workout plan:", planError);
    redirect("/workouts");
  }

  const { data: exercises, error: exerciseError } = await supabase
    .from("workout_plan_exercises")
    .select(`
      id,
      exercise_name,
      target_sets,
      target_reps,
      rest_seconds,
      order_index
    `)
    .eq("workout_plan_id", workoutPlanId)
    .order("order_index", { ascending: true });

  if (exerciseError) {
    console.error("Failed to load exercises:", exerciseError);
    redirect("/workouts");
  }

  return (
    <WorkoutSession
      workoutPlan={workoutPlan}
      exercises={exercises ?? []}
      sessionId={sessionId ?? null}
    />
  );
}
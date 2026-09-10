import { StartWorkoutButton } from "@/components/start-workout-button";

import {
  CalendarDays,
  Clock3,
  Dumbbell,
  Plus,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";

import {
  PageHeader,
  PrimaryButton,
} from "@/components/ui";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkoutPlanRow = {
  id: string;
  name: string;
  description: string | null;
  estimated_duration: number | null;
  workout_plan_exercises:
    | {
        id: string;
      }[]
    | null;
};

export default async function Workouts() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: workoutPlans, error } = await supabase
    .from("workout_plans")
    .select(`
      id,
      name,
      description,
      estimated_duration,
      workout_plan_exercises (
        id
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load workout plans:", error);
  }

  const plans = (workoutPlans ?? []) as WorkoutPlanRow[];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Training plan"
        title="Workouts"
        description="Manage your training and track your progression."
        action={
          <PrimaryButton href="/workouts/new">
            <Plus size={16} />
            Create workout
          </PrimaryButton>
        }
      />

      <div className="mb-6 flex gap-2 border-b border-[#e2e9e2] text-sm font-semibold">
        <button className="border-b-2 border-[#174b39] px-3 pb-3 text-[#174b39]">
          My plan
        </button>

        <button className="px-3 pb-3 text-[#8b968e]">
          History
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dce6da] bg-[#fbfcfa] p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#e7f3d0] text-[#174b39]">
            <Dumbbell size={20} />
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            No workouts yet
          </h2>

          <p className="mt-2 text-sm text-[#758078]">
            Create your first workout plan to get started.
          </p>

          <div className="mt-5">
            <PrimaryButton href="/workouts/new">
              <Plus size={16} />
              Create workout
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((workout) => {
            const exerciseCount =
              workout.workout_plan_exercises?.length ?? 0;

            return (
              <div
                key={workout.id}
                className="lift flex flex-col justify-between rounded-2xl border border-[#e2e9e2] bg-white p-5 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7f3d0] text-[#174b39]">
                    <Dumbbell size={19} />
                  </span>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-[#86a63b]">
                      Workout plan
                    </p>

                    <h2 className="mt-1 font-semibold">
                      {workout.name}
                    </h2>

                    <p className="mt-1 text-sm text-[#758078]">
                      {workout.description || "No description"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-4 sm:mt-0">
                  <div className="hidden text-right text-xs text-[#758078] sm:block">
                    <p className="flex items-center gap-1">
                      <Clock3 size={13} />

                      {workout.estimated_duration
                        ? `${workout.estimated_duration} min`
                        : "Duration not set"}
                    </p>

                    <p className="mt-1 flex items-center gap-1">
                      <CalendarDays size={13} />

                      {exerciseCount}{" "}
                      {exerciseCount === 1
                        ? "exercise"
                        : "exercises"}
                    </p>
                  </div>

                  <StartWorkoutButton
                    workoutPlanId={workout.id}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
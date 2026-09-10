"use client";

import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PageHeader, PrimaryButton } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Exercise } from "@/types";
import { useRouter } from "next/navigation";
export default function NewWorkout() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("Push Day");
  const [description, setDescription] = useState("");

  const [exercises, setExercises] = useState<Exercise[]>([
    {
      name: "Bench Press",
      sets: 3,
      reps: "6–8",
      rest: "120",
    },
  ]);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        name: "",
        sets: 3,
        reps: "8–10",
        rest: "90",
      },
    ]);
  };

  const updateExercise = (
    index: number,
    field: keyof Exercise,
    value: string | number
  ) => {
    setExercises((currentExercises) =>
      currentExercises.map((exercise, i) =>
        i === index
          ? {
              ...exercise,
              [field]: value,
            }
          : exercise
      )
    );
  };

  const removeExercise = (index: number) => {
    setExercises((currentExercises) =>
      currentExercises.filter((_, i) => i !== index)
    );
  };
  const handleSaveWorkout = async () => {
  setMessage("");

  if (!name.trim()) {
    setMessage("Please enter a workout name.");
    return;
  }

  if (exercises.length === 0) {
    setMessage("Please add at least one exercise.");
    return;
  }

  const invalidExercise = exercises.some(
    (exercise) =>
      !exercise.name.trim() ||
      exercise.sets <= 0 ||
      !exercise.reps.trim()
  );

  if (invalidExercise) {
    setMessage("Please complete all exercise details.");
    return;
  }

  try {
    setSaving(true);

    const supabase = createSupabaseBrowserClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Your session has expired. Please log in again.");
      return;
    }

    const { data: workoutPlan, error: planError } = await supabase
      .from("workout_plans")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        estimated_duration: null,
      })
      .select("id")
      .single();

    if (planError || !workoutPlan) {
      console.error(planError);
      setMessage("Could not save workout plan.");
      return;
    }

    const exerciseRows = exercises.map((exercise, index) => ({
      workout_plan_id: workoutPlan.id,
      exercise_name: exercise.name.trim(),
      target_sets: exercise.sets,
      target_reps: exercise.reps.trim(),
      rest_seconds:
        exercise.rest === "" ? null : Number(exercise.rest),
      order_index: index + 1,
    }));

    const { error: exercisesError } = await supabase
      .from("workout_plan_exercises")
      .insert(exerciseRows);

    if (exercisesError) {
      console.error(exercisesError);

      await supabase
        .from("workout_plans")
        .delete()
        .eq("id", workoutPlan.id);

      setMessage("Could not save workout exercises.");
      return;
    }

    setMessage("Workout saved successfully.");

    setTimeout(() => {
      router.push("/workouts");
    }, 800);
  } catch (error) {
    console.error(error);
    setMessage("Something went wrong while saving the workout.");
  } finally {
    setSaving(false);
  }
};
  return (
    <AppShell>
      <Link
        href="/workouts"
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#758078]"
      >
        <ArrowLeft size={16} />
        Back to workouts
      </Link>

      <PageHeader
        eyebrow="Build a session"
        title="Create workout"
        description="Set up a repeatable session for your training plan."
        action={
        <PrimaryButton onClick={handleSaveWorkout}>
            <Save size={16} />
            {saving ? "Saving..." : "Save workout"}
        </PrimaryButton>
        }
      />
       {message && (
            <p className="mb-4 text-sm font-medium text-[#174b39]">
                {message}
            </p>
        )}

      <div className="max-w-3xl space-y-6">
        <section className="rounded-2xl border border-[#e2e9e2] bg-white p-6">
          <label className="block text-sm font-medium">
            Workout name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dfe8de] px-4 py-3 outline-none focus:border-[#174b39]"
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Description{" "}
            <span className="font-normal text-[#8b968e]">(optional)</span>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is the focus of this session?"
              className="mt-2 min-h-24 w-full rounded-xl border border-[#dfe8de] px-4 py-3 outline-none focus:border-[#174b39]"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-[#e2e9e2] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
                The work
              </p>

              <h2 className="mt-2 text-xl font-semibold">Exercises</h2>
            </div>

            <button
              type="button"
              onClick={addExercise}
              className="flex items-center gap-2 rounded-full border border-[#d9e3d8] px-4 py-2 text-sm font-semibold text-[#174b39] hover:border-[#174b39]"
            >
              <Plus size={15} />
              Add exercise
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {exercises.map((exercise, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl bg-[#f6f8f4] p-4 sm:grid-cols-[1fr_80px_100px_90px_30px] sm:items-end"
              >
                <label className="text-xs font-semibold text-[#758078] sm:col-span-1">
                  Exercise
                  <input
                    value={exercise.name}
                    onChange={(event) =>
                      updateExercise(index, "name", event.target.value)
                    }
                    placeholder="e.g. Squat"
                    className="mt-2 w-full rounded-lg border border-[#dfe8de] bg-white px-3 py-2 text-sm font-normal outline-none"
                  />
                </label>

                <label className="text-xs font-semibold text-[#758078]">
                  Sets
                  <input
                    type="number"
                    min={1}
                    value={exercise.sets}
                    onChange={(event) =>
                      updateExercise(
                        index,
                        "sets",
                        Number(event.target.value)
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-[#dfe8de] bg-white px-3 py-2 text-sm font-normal outline-none"
                  />
                </label>

                <label className="text-xs font-semibold text-[#758078]">
                  Rep range
                  <input
                    value={exercise.reps}
                    onChange={(event) =>
                      updateExercise(index, "reps", event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-[#dfe8de] bg-white px-3 py-2 text-sm font-normal outline-none"
                  />
                </label>

                <label className="text-xs font-semibold text-[#758078]">
                  Rest (sec)
                  <input
                    type="number"
                    min={0}
                    value={exercise.rest}
                    onChange={(event) =>
                      updateExercise(index, "rest", event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-[#dfe8de] bg-white px-3 py-2 text-sm font-normal outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeExercise(index)}
                  className="mb-2 text-[#9ca79f] hover:text-red-600"
                  aria-label={`Remove ${exercise.name || "exercise"}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
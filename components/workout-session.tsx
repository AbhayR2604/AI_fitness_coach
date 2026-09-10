"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Pause,
  Play,
  Trophy,
} from "lucide-react";

import Link from "next/link";
import { useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
};

type WorkoutExercise = {
  id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: string;
  rest_seconds: number | null;
  order_index: number;
};

type SetEntry = {
  weight: string;
  reps: string;
  completed: boolean;
};

type WorkoutSessionProps = {
  workoutPlan: WorkoutPlan;
  exercises: WorkoutExercise[];
  sessionId: string | null;
};

export function WorkoutSession({
  workoutPlan,
  exercises,
  sessionId,
}: WorkoutSessionProps) {
  const [current, setCurrent] = useState(0);
  const [running, setRunning] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [completedDuration, setCompletedDuration] =
    useState<number | null>(null);

  const [completedVolume, setCompletedVolume] =
    useState<number | null>(null);

  /*
   * Store the time when this workout page first loads.
   *
   * useRef is useful here because changing this value
   * should not cause the component to re-render.
   */
  const workoutStartedAt = useRef(Date.now());

  /*
   * Store set data separately for every exercise.
   */
  const [setEntriesByExercise, setSetEntriesByExercise] = useState<
    Record<string, SetEntry[]>
  >(() => {
    const initialEntries: Record<string, SetEntry[]> = {};

    exercises.forEach((exercise) => {
      initialEntries[exercise.id] = Array.from(
        { length: exercise.target_sets },
        () => ({
          weight: "",
          reps: "",
          completed: false,
        })
      );
    });

    return initialEntries;
  });

  /*
   * Finish the workout:
   *
   * 1. Convert React state into session_sets rows
   * 2. Save those rows to Supabase
   * 3. Calculate workout duration
   * 4. Save duration to workout_sessions
   * 5. Calculate total training volume
   * 6. Show completion screen
   */
  const finishWorkout = async () => {
    if (!sessionId) {
      setSaveError("Workout session could not be found.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");

      const supabase = createSupabaseBrowserClient();

      /*
       * Turn all exercise/set data into database rows.
       */
      const rows = exercises.flatMap((exercise) => {
        const entries =
          setEntriesByExercise[exercise.id] ?? [];

        return entries.map((entry, index) => ({
          workout_session_id: sessionId,
          exercise_name: exercise.exercise_name,
          set_number: index + 1,

          weight:
            entry.weight === ""
              ? null
              : Number(entry.weight),

          reps_performed:
            entry.reps === ""
              ? null
              : Number(entry.reps),

          rpe: null,

          completed: entry.completed,
        }));
      });

      /*
       * Save all performed sets.
       */
      const { error: setsError } = await supabase
        .from("session_sets")
        .insert(rows);

      if (setsError) {
        console.error(
          "Failed to save workout sets:",
          setsError
        );

        setSaveError(
          "Could not save your workout sets."
        );

        return;
      }

      /*
       * Calculate how long the workout took.
       *
       * Date.now() gives milliseconds.
       * Divide by 60,000 to convert to minutes.
       */
      const elapsedMilliseconds =
        Date.now() - workoutStartedAt.current;

      const durationMinutes = Math.max(
        1,
        Math.round(elapsedMilliseconds / 60000)
      );

      /*
       * Save duration into the workout_sessions row
       * created when the user clicked Start.
       */
      const { error: sessionError } = await supabase
        .from("workout_sessions")
        .update({
          actual_duration: durationMinutes,
        })
        .eq("id", sessionId);

      if (sessionError) {
        console.error(
          "Failed to update workout session:",
          sessionError
        );

        setSaveError(
          "Workout sets were saved, but duration could not be saved."
        );

        return;
      }

      /*
       * Calculate workout volume.
       *
       * Formula:
       *
       * Volume = Weight × Reps
       *
       * Example:
       * 60 kg × 8 reps = 480 kg
       *
       * We only count sets marked as completed.
       */
      const totalVolume = exercises.reduce(
        (workoutTotal, exercise) => {
          const entries =
            setEntriesByExercise[exercise.id] ?? [];

          const exerciseVolume = entries.reduce(
            (exerciseTotal, entry) => {
              if (!entry.completed) {
                return exerciseTotal;
              }

              const weight = Number(entry.weight);
              const reps = Number(entry.reps);

              if (
                Number.isNaN(weight) ||
                Number.isNaN(reps)
              ) {
                return exerciseTotal;
              }

              return (
                exerciseTotal +
                weight * reps
              );
            },
            0
          );

          return workoutTotal + exerciseVolume;
        },
        0
      );

      /*
       * Store summary values so the completion
       * screen can display them.
       */
      setCompletedDuration(durationMinutes);
      setCompletedVolume(totalVolume);

      /*
       * Move beyond the final exercise.
       * This triggers the completion screen.
       */
      setCurrent(exercises.length);
    } catch (error) {
      console.error(
        "Unexpected workout save error:",
        error
      );

      setSaveError(
        "Something went wrong while saving your workout."
      );
    } finally {
      setSaving(false);
    }
  };

  const moveToPreviousExercise = () => {
    if (current === 0) {
      return;
    }

    setCurrent(current - 1);
    setSaveError("");
  };

  const moveToNextExercise = () => {
    setCurrent(current + 1);
    setSaveError("");
  };

  /*
   * No exercises in the workout.
   */
  if (exercises.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl py-12">
          <div className="rounded-2xl border border-[#e2e9e2] bg-white p-6">
            <h1 className="text-xl font-semibold">
              No exercises found
            </h1>

            <p className="mt-2 text-sm text-[#758078]">
              This workout plan does not contain any exercises yet.
            </p>

            <div className="mt-5">
              <PrimaryButton href="/workouts">
                Back to workouts
              </PrimaryButton>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /*
   * Workout completion screen.
   */
  if (current === exercises.length) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl py-8">
          <div className="rounded-3xl border border-[#dfe8de] bg-white p-8 text-center sm:p-12">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e7f3d0] text-[#174b39]">
              <Trophy size={28} />
            </span>

            <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
              Session complete
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-[#174b39]">
              {workoutPlan.name}
            </h1>

            <p className="mt-2 text-[#758078]">
              That&apos;s another one in the bank.
            </p>

            <div className="my-9 grid grid-cols-3 gap-3 text-left">
              <div className="rounded-xl bg-[#f6f8f4] p-4">
                <p className="text-xs text-[#8b968e]">
                  Duration
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {completedDuration !== null
                    ? `${completedDuration} min`
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-[#f6f8f4] p-4">
                <p className="text-xs text-[#8b968e]">
                  Exercises
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {exercises.length}
                </p>
              </div>

              <div className="rounded-xl bg-[#f6f8f4] p-4">
                <p className="text-xs text-[#8b968e]">
                  Volume
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {completedVolume !== null
                    ? `${completedVolume.toLocaleString()} kg`
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <PrimaryButton href="/workouts">
                Back to workouts
                <ArrowRight size={16} />
              </PrimaryButton>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /*
   * Current exercise.
   */
  const exercise = exercises[current];

  const setEntries =
    setEntriesByExercise[exercise.id] ?? [];

  const percent =
    ((current + 1) / exercises.length) * 100;

  const updateSetWeight = (
    index: number,
    value: string
  ) => {
    setSetEntriesByExercise((currentState) => ({
      ...currentState,

      [exercise.id]: currentState[
        exercise.id
      ].map((entry, i) =>
        i === index
          ? {
              ...entry,
              weight: value,
            }
          : entry
      ),
    }));
  };

  const updateSetReps = (
    index: number,
    value: string
  ) => {
    setSetEntriesByExercise((currentState) => ({
      ...currentState,

      [exercise.id]: currentState[
        exercise.id
      ].map((entry, i) =>
        i === index
          ? {
              ...entry,
              reps: value,
            }
          : entry
      ),
    }));
  };

  const toggleSet = (index: number) => {
    setSetEntriesByExercise((currentState) => ({
      ...currentState,

      [exercise.id]: currentState[
        exercise.id
      ].map((entry, i) =>
        i === index
          ? {
              ...entry,
              completed: !entry.completed,
            }
          : entry
      ),
    }));
  };

  return (
    <AppShell>
      <Link
        href="/workouts"
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#758078]"
      >
        <ArrowLeft size={16} />
        Exit session
      </Link>

      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
              {workoutPlan.name}
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-[-.06em]">
              {exercise.exercise_name}
            </h1>

            <p className="mt-2 text-sm text-[#758078]">
              Exercise {current + 1} of{" "}
              {exercises.length}
              {" · "}
              Target {exercise.target_sets} ×{" "}
              {exercise.target_reps}
            </p>

            {exercise.rest_seconds !== null && (
              <p className="mt-1 text-xs text-[#8b968e]">
                Rest: {exercise.rest_seconds} seconds
              </p>
            )}

            {sessionId && (
              <p className="mt-1 text-[11px] text-[#a0aaa3]">
                Session active
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setRunning(!running)}
            className="flex w-fit items-center gap-2 rounded-full border border-[#d9e3d8] bg-white px-4 py-3 text-sm font-semibold text-[#174b39]"
          >
            <Clock3 size={16} />

            Timer

            {running ? (
              <Pause size={15} />
            ) : (
              <Play size={15} />
            )}
          </button>
        </div>

        <div className="mt-7 h-2 overflow-hidden rounded-full bg-[#e2e9e2]">
          <div
            className="h-full rounded-full bg-[#86a63b] transition-all"
            style={{
              width: `${percent}%`,
            }}
          />
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#e2e9e2] bg-white">
          <div className="grid grid-cols-[50px_1fr_1fr_80px_60px] border-b border-[#edf1eb] bg-[#fbfcfa] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#8b968e]">
            <span>Set</span>
            <span>Previous</span>
            <span>Weight</span>
            <span>Reps</span>
            <span>Done</span>
          </div>

          {setEntries.map((entry, index) => (
            <div
              key={`${exercise.id}-${index}`}
              className="grid grid-cols-[50px_1fr_1fr_80px_60px] items-center border-b border-[#edf1eb] px-4 py-4 text-sm last:border-0"
            >
              <span className="font-semibold">
                {index + 1}
              </span>

              <span className="text-[#758078]">
                —
              </span>

              <input
                type="number"
                min="0"
                step="0.5"
                value={entry.weight}
                onChange={(event) =>
                  updateSetWeight(
                    index,
                    event.target.value
                  )
                }
                placeholder="kg"
                className="mr-3 min-w-0 rounded-lg border border-[#dfe8de] px-2 py-2 text-sm outline-none focus:border-[#174b39]"
              />

              <input
                type="number"
                min="0"
                value={entry.reps}
                onChange={(event) =>
                  updateSetReps(
                    index,
                    event.target.value
                  )
                }
                placeholder="Reps"
                className="mr-3 min-w-0 rounded-lg border border-[#dfe8de] px-2 py-2 text-sm outline-none focus:border-[#174b39]"
              />

              <button
                type="button"
                onClick={() => toggleSet(index)}
                className={`grid h-7 w-7 place-items-center rounded-full border ${
                  entry.completed
                    ? "border-[#174b39] bg-[#174b39] text-white"
                    : "border-[#dfe8de] text-transparent"
                }`}
                aria-label={`Complete set ${index + 1}`}
              >
                <Check size={14} />
              </button>
            </div>
          ))}
        </section>

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            disabled={current === 0 || saving}
            onClick={moveToPreviousExercise}
            className="flex items-center gap-2 text-sm font-semibold text-[#758078] disabled:opacity-30"
          >
            <ArrowLeft size={16} />
            Previous
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (
                current ===
                exercises.length - 1
              ) {
                finishWorkout();
              } else {
                moveToNextExercise();
              }
            }}
            className="flex items-center gap-2 rounded-full bg-[#174b39] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : current ===
                  exercises.length - 1
                ? "Finish workout"
                : "Next exercise"}

            <ArrowRight size={16} />
          </button>
        </div>

        {saveError && (
          <p className="mt-4 text-sm font-medium text-red-600">
            {saveError}
          </p>
        )}
      </div>
    </AppShell>
  );
}
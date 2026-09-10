"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StartWorkoutButtonProps = {
  workoutPlanId: string;
};

export function StartWorkoutButton({
  workoutPlanId,
}: StartWorkoutButtonProps) {
  const router = useRouter();

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const handleStartWorkout = async () => {
    try {
      setStarting(true);
      setError("");

      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please log in again.");
        return;
      }

      const now = new Date();

      const sessionDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");

      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          workout_plan_id: workoutPlanId,
          session_date: sessionDate,
        })
        .select("id")
        .single();

      if (sessionError || !session) {
        console.error(sessionError);
        setError("Could not start workout.");
        return;
      }

      router.push(
        `/workouts/session/${workoutPlanId}?sessionId=${session.id}`
      );
    } catch (error) {
      console.error(error);
      setError("Something went wrong.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleStartWorkout}
        disabled={starting}
        className="flex items-center gap-2 rounded-full border border-[#d9e3d8] px-4 py-2 text-sm font-semibold text-[#174b39] transition hover:border-[#174b39] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {starting ? "Starting..." : "Start"}
        <ArrowRight size={15} />
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
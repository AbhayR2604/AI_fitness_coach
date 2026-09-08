"use client";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
const steps = [
  {
    title: "What is your primary fitness goal?",
    options: [
      "Lose fat",
      "Build muscle",
      "Improve fitness",
      "Maintain fitness",
    ],
  },
  {
    title: "What’s your training experience?",
    options: ["Beginner", "Intermediate", "Advanced"],
  },
  {
    title: "How many days per week do you want to train?",
    options: ["2", "3", "4", "5", "6"],
  },
  {
    title: "How long do you want each session to be?",
    options: ["30 minutes", "45 minutes", "60 minutes", "75+ minutes"],
  },
];
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([
    "Build muscle",
    "Intermediate",
    "4",
    "60 minutes",
  ]);
  const choose = (option: string) =>
    setAnswers((current) =>
      current.map((item, index) => (index === step ? option : item)),
    );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const next = () => setStep((current) => Math.min(current + 1, steps.length));
  async function saveOnboarding() {
    setSaving(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Your session has expired. Please log in again.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          fitness_goal: answers[0],
          experience_level: answers[1],
          training_days: Number(answers[2]),
          session_length: answers[3],
        })
        .eq("id", user.id);

      if (updateError) {
        setError("We could not save your preferences. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We could not save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="noise min-h-screen px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-[#174b39]"
        >
          AI FITNESS <span className="text-[#86a63b]">COACH</span>
        </Link>
        <div className="mt-16 flex gap-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[#174b39]" : "bg-[#dfe8de]"}`}
            />
          ))}
        </div>
        {step < steps.length ? (
          <div className="mt-14">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
              Step {step + 1} of {steps.length}
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-.06em] text-[#174b39]">
              {steps[step].title}
            </h1>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {steps[step].options.map((option) => (
                <button
                  key={option}
                  onClick={() => choose(option)}
                  className={`flex items-center justify-between rounded-2xl border p-5 text-left font-semibold transition hover:border-[#86a63b] ${answers[step] === option ? "border-[#174b39] bg-[#e7f3d0] text-[#174b39]" : "border-[#dfe8de] bg-white"}`}
                >
                  {option}
                  {answers[step] === option && <Check size={18} />}
                </button>
              ))}
            </div>
            <div className="mt-10 flex justify-between">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                className="flex items-center gap-2 text-sm font-semibold text-[#758078]"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <PrimaryButton onClick={next}>
                Continue <ArrowRight size={16} />
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="mt-16 rounded-3xl border border-[#dfe8de] bg-white p-8 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
              Your baseline
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-.06em] text-[#174b39]">
              Your plan is ready.
            </h1>
            <p className="mt-3 text-[#758078]">
              A focused starting point for the next 12 weeks.
            </p>
            <div className="mt-8 space-y-4 rounded-2xl bg-[#f6f8f4] p-5 text-sm">
              <p>
                <span className="text-[#8b968e]">Goal</span>
                <strong className="float-right">{answers[0]}</strong>
              </p>
              <p>
                <span className="text-[#8b968e]">Experience</span>
                <strong className="float-right">{answers[1]}</strong>
              </p>
              <p>
                <span className="text-[#8b968e]">Training</span>
                <strong className="float-right">{answers[2]} days/week</strong>
              </p>
              <p>
                <span className="text-[#8b968e]">Session length</span>
                <strong className="float-right">{answers[3]}</strong>
              </p>
            </div>
            <div className="mt-8">
              {error && (
                <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              <PrimaryButton onClick={saveOnboarding}>
                {saving ? "Saving..." : "Go to dashboard"} <ArrowRight size={16} />
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

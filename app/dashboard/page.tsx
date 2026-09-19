import {
  ArrowRight,
  Brain,
  Camera,
  Dumbbell,
  Sparkles,
  Utensils,
} from "lucide-react";

import Link from "next/link";

import {
  AppShell,
} from "@/components/app-shell";

const features = [
  {
    title:
      "Workout Coach",
    description:
      "Create and complete workouts with AI-powered progression recommendations based on your training history.",
    href:
      "/workouts",
    action:
      "View workouts",
    icon:
      Dumbbell,
    badge:
      "AI progression",
  },

  {
    title:
      "AI Nutrition",
    description:
      "Upload a photo of your meal and receive an estimated calorie and macronutrient breakdown.",
    href:
      "/nutrition",
    action:
      "Analyse a meal",
    icon:
      Utensils,
    badge:
      "Multimodal AI",
  },

  {
    title:
      "Exercise Form Coach",
    description:
      "Use your camera for real-time pose tracking, automatic rep counting and exercise movement analysis.",
    href:
      "/form-coach",
    action:
      "Start form coach",
    icon:
      Camera,
    badge:
      "Computer vision",
  },
];

export default function Dashboard() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
            AI Fitness Coach
          </p>

          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-.06em] text-[#174b39] sm:text-5xl">
            Train smarter with
            your AI fitness
            assistant.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#758078] sm:text-base">
            Plan workouts,
            analyse meals and
            track exercise
            movement using AI
            and computer vision.
          </p>
        </section>

        {/* Main feature cards */}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles
              size={18}
              className="text-[#86a63b]"
            />

            <h2 className="text-lg font-semibold text-[#174b39]">
              What would you
              like to do?
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {features.map(
              ({
                title,
                description,
                href,
                action,
                icon: Icon,
                badge,
              }) => (
                <Link
                  href={href}
                  key={title}
                  className="group flex min-h-[260px] flex-col rounded-3xl border border-[#e2e9e2] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#bfd29c]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e7f3d0] text-[#174b39]">
                      <Icon
                        size={22}
                      />
                    </span>

                    <span className="rounded-full bg-[#f6f8f4] px-3 py-1 text-[11px] font-semibold text-[#758078]">
                      {badge}
                    </span>
                  </div>

                  <h3 className="mt-6 text-xl font-semibold tracking-[-.03em] text-[#174b39]">
                    {title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-6 text-[#758078]">
                    {description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#174b39]">
                    {action}

                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              )
            )}
          </div>
        </section>

        {/* How the app connects */}
        <section className="mt-8 rounded-3xl border border-[#e2e9e2] bg-white p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f0f5ed] text-[#174b39]">
              <Brain
                size={20}
              />
            </span>

            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
                Your fitness
                workflow
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-[#174b39]">
                Three tools,
                one coaching
                experience
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#758078]">
                Use workout
                intelligence to
                guide training,
                nutrition analysis
                to understand your
                meals, and the form
                coach to monitor
                movement during
                selected exercises.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <Link
              href="/workouts"
              className="rounded-2xl bg-[#f6f8f4] p-4 transition hover:bg-[#eef4e9]"
            >
              <p className="text-xs font-semibold text-[#86a63b]">
                STEP 01
              </p>

              <p className="mt-2 font-semibold text-[#174b39]">
                Train
              </p>

              <p className="mt-1 text-xs leading-5 text-[#758078]">
                Follow your
                workout and AI
                progression
                guidance.
              </p>
            </Link>

            <Link
              href="/nutrition"
              className="rounded-2xl bg-[#f6f8f4] p-4 transition hover:bg-[#eef4e9]"
            >
              <p className="text-xs font-semibold text-[#86a63b]">
                STEP 02
              </p>

              <p className="mt-2 font-semibold text-[#174b39]">
                Fuel
              </p>

              <p className="mt-1 text-xs leading-5 text-[#758078]">
                Analyse meals
                using image-based
                AI nutrition.
              </p>
            </Link>

            <Link
              href="/form-coach"
              className="rounded-2xl bg-[#f6f8f4] p-4 transition hover:bg-[#eef4e9]"
            >
              <p className="text-xs font-semibold text-[#86a63b]">
                STEP 03
              </p>

              <p className="mt-2 font-semibold text-[#174b39]">
                Move
              </p>

              <p className="mt-1 text-xs leading-5 text-[#758078]">
                Use real-time
                pose detection
                for supported
                exercises.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
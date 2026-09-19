"use client";

import {
  Camera,
  ImagePlus,
  Sparkles,
} from "lucide-react";

import Image from "next/image";
import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";

type NutritionFoodItem = {
  name: string;
  estimatedAmount: string;
  estimatedCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

type NutritionClarification = {
  question: string;
  options: string[];
};

type NutritionAnalysis = {
  status:
    | "complete"
    | "needs_clarification";

  mealName: string;

  estimatedCalories:
    | number
    | null;

  proteinGrams:
    | number
    | null;

  carbsGrams:
    | number
    | null;

  fatGrams:
    | number
    | null;

  foods: NutritionFoodItem[];

  confidence:
    | "low"
    | "medium"
    | "high";

  notes: string;

  clarification:
    | NutritionClarification
    | null;
};

type NutritionValidation = {
  valid: boolean;
  warnings: string[];
};

export default function NutritionPage() {
  const [image, setImage] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [analysis, setAnalysis] =
    useState<NutritionAnalysis | null>(
      null
    );

  const [validation, setValidation] =
    useState<NutritionValidation | null>(
      null
    );

  const [
    clarificationAnswer,
    setClarificationAnswer,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  const handleImageChange = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    const newPreviewUrl =
      URL.createObjectURL(file);

    setImage(file);
    setPreviewUrl(
      newPreviewUrl
    );

    setAnalysis(null);
    setValidation(null);
    setClarificationAnswer("");
    setError("");
  };

  const resetMeal = () => {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setImage(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setValidation(null);
    setClarificationAnswer("");
    setError("");
    setLoading(false);
  };

  const analyseMeal = async (
    answer?: string
  ) => {
    if (!image) {
      setError(
        "Please choose a meal image first."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData =
        new FormData();

      formData.append(
        "image",
        image
      );

      if (
        answer &&
        answer.trim() !== ""
      ) {
        formData.append(
          "clarificationAnswer",
          answer.trim()
        );
      }

      const response =
        await fetch(
          "/api/ai/nutrition-analysis",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Meal analysis failed."
        );
      }

      setAnalysis(
        data.analysis
      );

      setValidation(
        data.validation ?? null
      );

      if (
        data.analysis.status ===
        "complete"
      ) {
        setClarificationAnswer("");
      }
    } catch (error) {
      console.error(
        "Nutrition analysis error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const submitClarification =
    async () => {
      if (
        clarificationAnswer
          .trim() === ""
      ) {
        setError(
          "Please enter a clarification."
        );
        return;
      }

      await analyseMeal(
        clarificationAnswer
      );
    };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
            AI Nutrition
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-[-.06em] text-[#174b39]">
            Analyse your meal
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#758078]">
            Upload a meal photo to estimate
            calories, protein, carbohydrates,
            fat, and visible food portions.
            Estimates are based on visual
            analysis and may require a quick
            clarification.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/*
           * -----------------------------------------
           * IMAGE UPLOAD
           * -----------------------------------------
           */}
          <section className="rounded-3xl border border-[#dfe8de] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f3d0] text-[#174b39]">
                <Camera size={20} />
              </span>

              <div>
                <h2 className="font-semibold text-[#174b39]">
                  Meal photo
                </h2>

                <p className="text-xs text-[#8b968e]">
                  JPEG, PNG or WebP · max 5 MB
                </p>
              </div>
            </div>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#ccd8cc] bg-[#fafcf8] px-6 py-10 text-center">
              <ImagePlus
                size={28}
                className="text-[#86a63b]"
              />

              <p className="mt-3 text-sm font-semibold text-[#174b39]">
                Choose a meal image
              </p>

              <p className="mt-1 text-xs text-[#8b968e]">
                Clear images with visible portions
                work best.
              </p>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handleImageChange
                }
                className="hidden"
              />
            </label>

            {previewUrl && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#edf1eb] bg-[#f7f8f6]">
                <Image
                  src={previewUrl}
                  alt="Meal preview"
                  width={900}
                  height={700}
                  unoptimized
                  className="max-h-[420px] w-full object-contain"
                />
              </div>
            )}

            {analysis?.status !==
              "complete" && (
              <button
                type="button"
                onClick={() =>
                  analyseMeal()
                }
                disabled={
                  !image ||
                  loading
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#174b39] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={16} />

                {loading
                  ? "Analysing meal..."
                  : analysis?.status ===
                      "needs_clarification"
                    ? "Analyse again"
                    : "Analyse meal"}
              </button>
            )}

            {error && (
              <p className="mt-4 text-sm font-medium text-red-600">
                {error}
              </p>
            )}
          </section>

          {/*
           * -----------------------------------------
           * RESULT AREA
           * -----------------------------------------
           */}
          <section className="rounded-3xl border border-[#dfe8de] bg-white p-6">
            {!analysis && (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f1f5ed] text-[#86a63b]">
                  <Sparkles size={23} />
                </span>

                <h2 className="mt-4 text-lg font-semibold text-[#174b39]">
                  Your analysis will appear here
                </h2>

                <p className="mt-2 max-w-sm text-sm leading-6 text-[#8b968e]">
                  Upload a meal photo and the AI
                  will estimate the meal components
                  and nutritional breakdown.
                </p>
              </div>
            )}

            {analysis && (
              <>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#86a63b]">
                  AI Analysis
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#174b39]">
                  {analysis.mealName}
                </h2>

                <p className="mt-2 text-xs text-[#8b968e]">
                  Confidence:{" "}
                  <span className="font-semibold capitalize text-[#5f6c63]">
                    {analysis.confidence}
                  </span>
                </p>

                {/*
                 * -----------------------------------
                 * CLARIFICATION
                 * -----------------------------------
                 */}
                {analysis.status ===
                  "needs_clarification" &&
                  analysis.clarification && (
                    <div className="mt-6 rounded-2xl bg-[#fff8e8] p-5">
                      <p className="text-xs font-bold uppercase tracking-[.14em] text-amber-700">
                        One more detail
                      </p>

                      <h3 className="mt-2 font-semibold text-[#2d332f]">
                        {
                          analysis
                            .clarification
                            .question
                        }
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#6c756f]">
                        Type what you know about
                        the meal. Natural language
                        and minor spelling mistakes
                        are fine.
                      </p>

                      {analysis
                        .clarification
                        .options.length >
                        0 && (
                        <p className="mt-3 text-xs text-[#8b968e]">
                          Examples:{" "}
                          {analysis.clarification.options.join(
                            ", "
                          )}
                        </p>
                      )}

                      <input
                        type="text"
                        value={
                          clarificationAnswer
                        }
                        onChange={(
                          event
                        ) =>
                          setClarificationAnswer(
                            event.target
                              .value
                          )
                        }
                        placeholder="e.g. Lamb"
                        disabled={
                          loading
                        }
                        className="mt-4 w-full rounded-xl border border-[#d9e3d8] bg-white px-4 py-3 text-sm outline-none focus:border-[#174b39]"
                      />

                      <button
                        type="button"
                        onClick={
                          submitClarification
                        }
                        disabled={
                          loading ||
                          clarificationAnswer
                            .trim() ===
                            ""
                        }
                        className="mt-4 rounded-full bg-[#174b39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {loading
                          ? "Updating..."
                          : "Submit clarification"}
                      </button>

                      <p className="mt-4 text-xs leading-5 text-[#8b968e]">
                        {analysis.notes}
                      </p>
                    </div>
                  )}

                {/*
                 * -----------------------------------
                 * COMPLETE RESULT
                 * -----------------------------------
                 */}
                {analysis.status ===
                  "complete" && (
                  <>
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-[#f6f8f4] p-4">
                        <p className="text-xs text-[#8b968e]">
                          Calories
                        </p>

                        <p className="mt-1 text-xl font-semibold text-[#174b39]">
                          {
                            analysis.estimatedCalories
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f6f8f4] p-4">
                        <p className="text-xs text-[#8b968e]">
                          Protein
                        </p>

                        <p className="mt-1 text-xl font-semibold text-[#174b39]">
                          {
                            analysis.proteinGrams
                          }{" "}
                          g
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f6f8f4] p-4">
                        <p className="text-xs text-[#8b968e]">
                          Carbs
                        </p>

                        <p className="mt-1 text-xl font-semibold text-[#174b39]">
                          {
                            analysis.carbsGrams
                          }{" "}
                          g
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f6f8f4] p-4">
                        <p className="text-xs text-[#8b968e]">
                          Fat
                        </p>

                        <p className="mt-1 text-xl font-semibold text-[#174b39]">
                          {
                            analysis.fatGrams
                          }{" "}
                          g
                        </p>
                      </div>
                    </div>

                    <div className="mt-7">
                      <h3 className="font-semibold text-[#174b39]">
                        Detected foods
                      </h3>

                      <div className="mt-3 space-y-3">
                        {analysis.foods.map(
                          (
                            food,
                            index
                          ) => (
                            <div
                              key={`${food.name}-${index}`}
                              className="rounded-xl border border-[#edf1eb] bg-[#fbfcfa] p-4"
                            >
                              <div className="flex items-start justify-between gap-5">
                                <div>
                                  <p className="font-semibold text-[#2d332f]">
                                    {
                                      food.name
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-[#8b968e]">
                                    {
                                      food.estimatedAmount
                                    }
                                  </p>
                                </div>

                                <p className="text-sm font-semibold text-[#174b39]">
                                  {
                                    food.estimatedCalories
                                  }{" "}
                                  kcal
                                </p>
                              </div>

                              <p className="mt-3 text-xs text-[#758078]">
                                Protein{" "}
                                {
                                  food.proteinGrams
                                }
                                g · Carbs{" "}
                                {
                                  food.carbsGrams
                                }
                                g · Fat{" "}
                                {
                                  food.fatGrams
                                }
                                g
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl bg-[#f6f8f4] p-4">
                      <p className="text-sm leading-6 text-[#758078]">
                        {
                          analysis.notes
                        }
                      </p>
                    </div>

                    {validation &&
                      validation
                        .warnings
                        .length >
                        0 && (
                        <div className="mt-4 rounded-xl bg-amber-50 p-4">
                          <p className="text-sm font-semibold text-amber-800">
                            Nutrition estimate warning
                          </p>

                          <ul className="mt-2 space-y-2 text-sm text-amber-700">
                            {validation.warnings.map(
                              (
                                warning,
                                index
                              ) => (
                                <li
                                  key={
                                    index
                                  }
                                >
                                  •{" "}
                                  {
                                    warning
                                  }
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    <div className="mt-6 rounded-2xl border border-[#dfe8de] bg-[#f7f9f5] p-5">
                      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#86a63b]">
                        Analysis complete
                      </p>

                      <h3 className="mt-2 text-lg font-semibold text-[#174b39]">
                        What would you like to do next?
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-[#758078]">
                        Analyse another meal or return to your dashboard.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={resetMeal}
                          className="rounded-full bg-[#174b39] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Analyse another meal
                        </button>

                        <Link
                          href="/dashboard"
                          className="rounded-full border border-[#dfe8de] bg-white px-5 py-3 text-sm font-semibold text-[#174b39] transition hover:bg-[#f0f4ed]"
                        >
                          Back to dashboard
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { workoutRecommendationSchema } from "@/lib/ai/workout-recommendation-schema";

import { getExerciseHistory } from "@/lib/workouts/get-exercise-history";
import { getExerciseTarget } from "@/lib/workouts/get-exercise-target";
import { getProgressionFeatures } from "@/lib/workouts/get-progression-features";
import { getProgressionRecommendation } from "@/lib/workouts/get-progression-recommendation";
import { getTargetCompliance } from "@/lib/workouts/get-target-compliance";

type WorkoutRecommendationRequest = {
  exerciseName?: string;
};

export async function POST(request: Request) {
  try {
    /*
     * ---------------------------------------------
     * 1. CHECK GEMINI API KEY
     * ---------------------------------------------
     */

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing.");

      return NextResponse.json(
        {
          error: "AI service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Create the Gemini client.
     *
     * This code runs on the server.
     * The browser never receives the API key.
     */
    const ai = new GoogleGenAI({
      apiKey,
    });

    /*
     * ---------------------------------------------
     * 2. READ REQUEST
     * ---------------------------------------------
     */

    const body =
      (await request.json()) as WorkoutRecommendationRequest;

    const exerciseName =
      body.exerciseName?.trim();

    if (!exerciseName) {
      return NextResponse.json(
        {
          error: "exerciseName is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------
     * 3. GET EXERCISE TARGET
     * ---------------------------------------------
     */

    const target =
      await getExerciseTarget(exerciseName);

    if (!target) {
      return NextResponse.json(
        {
          error:
            "Exercise target could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ---------------------------------------------
     * 4. GET RECENT WORKOUT HISTORY
     * ---------------------------------------------
     */

    const history =
      await getExerciseHistory(exerciseName);

    /*
     * ---------------------------------------------
     * 5. CALCULATE FEATURES
     * ---------------------------------------------
     */

    const features =
      getProgressionFeatures(history);
    
    const compliance =
      getTargetCompliance(
        history,
        target.targetReps
      );

    /*
     * ---------------------------------------------
     * 6. CALCULATE BASELINE RECOMMENDATION
     * ---------------------------------------------
     */

    const baselineRecommendation =
      getProgressionRecommendation(
        features,
        target.targetSets,
        target.targetReps,
        compliance
      );

    /*
     * ---------------------------------------------
     * 7. BUILD CLEAN AI CONTEXT
     * ---------------------------------------------
     */

    const aiContext = {
      exercise: {
        name: target.exerciseName,
        targetSets: target.targetSets,
        targetReps: target.targetReps,
        restSeconds: target.restSeconds,
      },

      recentHistory: history,

      calculatedFeatures: features,

      targetCompliance: compliance,

      baselineRecommendation,
    };

    /*
     * ---------------------------------------------
     * 8. CREATE PROMPT
     * ---------------------------------------------
     */

    const prompt = `
You are the workout progression assistant inside an AI fitness application.

Your job is to turn the workout data below into a practical next-session recommendation.

RULES:

1. Use only the workout data provided.
2. Do not invent workout history.
3. The deterministic baseline recommendation is the primary safety rule.
4. Keep the same action as the baseline recommendation.
5. If the action is "maintain", keep the same weight as the latest workout when a latest weight is available.
6. If the action is "increase_load", recommend only a small conservative increase from the latest weight.
7. Never recommend a weight lower than 0.
8. recommendedReps should be a concrete next-session target.
If the action is "maintain", use the same weight and set rep targets that move the user toward the top of the target rep range.
For example, if the target is 6–8 reps for 3 sets and the user has already achieved at least 6 
9. The number of rep targets should match the target number of sets.
10. Keep the reason concise and understandable.
11. Do not provide medical advice.
12. If there is not enough data, use null for recommendedWeightKg and explain that more sessions are needed.
13. Return only data matching the requested JSON structure.
14. "focus" should describe the main thing the user should concentrate on in the next session.
15. "coachingNote" should give one practical execution cue based on the workout data.

Workout data:

${JSON.stringify(aiContext, null, 2)}
`;

    /*
     * ---------------------------------------------
     * 9. CALL GEMINI
     * ---------------------------------------------
     *
     * This is the actual external AI API call.
     */

    const response =
      await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",

        contents: prompt,

        config: {
          /*
           * Tell Gemini that we require JSON.
           */
          responseMimeType: "application/json",

          /*
           * Tell Gemini exactly which JSON
           * structure it must return.
           */
          responseJsonSchema: {
            type: "object",

            properties: {
              action: {
                type: "string",
                enum: [
                  "increase_load",
                  "increase_reps",
                  "maintain",
                  "reduce_load",
                  "recover",
                  "collect_more_data",
                ],
              },

              recommendedWeightKg: {
                anyOf: [
                  {
                    type: "number",
                  },
                  {
                    type: "null",
                  },
                ],
              },

              recommendedReps: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
              },

              confidence: {
                type: "string",
                enum: [
                  "low",
                  "medium",
                  "high",
                ],
              },

              reason: {
                type: "string",
              },

              caution: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
              },
              focus: {
                type: "string",
              },

              coachingNote: {
                type: "string",
              },
            },

            required: [
              "action",
              "recommendedWeightKg",
              "recommendedReps",
              "confidence",
              "reason",
              "focus",
              "coachingNote",
              "caution",
            ],

            additionalProperties: false,
          },
        },
      });

    /*
     * ---------------------------------------------
     * 10. GET GEMINI OUTPUT
     * ---------------------------------------------
     */

    const rawOutput = response.text;

    if (!rawOutput) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    /*
     * Gemini gave us JSON text.
     *
     * Convert it into a JavaScript object.
     */
    const parsedOutput =
      JSON.parse(rawOutput);

    /*
     * ---------------------------------------------
     * 11. VALIDATE WITH ZOD
     * ---------------------------------------------
     */

    const validationResult =
      workoutRecommendationSchema.safeParse(
        parsedOutput
      );

    if (!validationResult.success) {
      console.error(
        "Gemini recommendation failed Zod validation:",
        validationResult.error
      );

      return NextResponse.json(
        {
          error:
            "AI recommendation returned an invalid format.",

          baselineRecommendation,
        },
        {
          status: 500,
        }
      );
    }

    const aiRecommendation =
      validationResult.data;

        /*
    * ---------------------------------------------
    * 12. BUSINESS-LOGIC VALIDATION
    * ---------------------------------------------
    *
    * Gemini may produce perfectly valid JSON,
    * but we still check whether it agrees with
    * our deterministic recommendation.
    */

    if (
      aiRecommendation.action !==
      baselineRecommendation.action
    ) {
      console.warn(
        "Gemini recommendation disagreed with baseline.",
        {
          geminiAction:
            aiRecommendation.action,

          baselineAction:
            baselineRecommendation.action,
        }
      );

      return NextResponse.json({
        exercise: {
          id: target.exerciseId,
          name: target.exerciseName,
          targetSets: target.targetSets,
          targetReps: target.targetReps,
          restSeconds:
            target.restSeconds,
        },

        history,

        features,

        baselineRecommendation,

        aiRecommendation: null,

        warning:
          "AI recommendation was rejected because it conflicted with the baseline progression rule.",
      });
    }

    /*
     * ---------------------------------------------
     * 13. WEIGHT-INCREASE SAFETY CHECK
     * ---------------------------------------------
     */

    const latestWeight =
      features.latestWeight;

    if (
      latestWeight !== null &&
      aiRecommendation.recommendedWeightKg !== null
    ) {
      const maxAllowedIncrease =
        latestWeight * 1.1;

      if (
        aiRecommendation.recommendedWeightKg >
        maxAllowedIncrease
      ) {
        console.warn(
          "Gemini recommended an excessive weight increase.",
          {
            latestWeight,
            recommendedWeight:
              aiRecommendation.recommendedWeightKg,
          }
        );

        return NextResponse.json({
          exercise: {
            id: target.exerciseId,
            name: target.exerciseName,
            targetSets: target.targetSets,
            targetReps: target.targetReps,
            restSeconds:
              target.restSeconds,
          },

          history,

          features,

          baselineRecommendation,

          aiRecommendation: null,

          warning:
            "AI recommendation was rejected because the suggested weight increase was too large.",
        });
      }
    }

    /*
     * ---------------------------------------------
     * 14. RETURN FINAL RESULT
     * ---------------------------------------------
     */

    return NextResponse.json({
      exercise: {
        id: target.exerciseId,
        name: target.exerciseName,
        targetSets: target.targetSets,
        targetReps: target.targetReps,
        restSeconds:
          target.restSeconds,
      },

      history,

      features,

      baselineRecommendation,

      aiRecommendation,
    });
  } catch (error) {
    console.error(
      "Workout recommendation API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while generating the workout recommendation.",
      },
      {
        status: 500,
      }
    );
  }
}
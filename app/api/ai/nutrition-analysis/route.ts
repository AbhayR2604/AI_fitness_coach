import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { nutritionAnalysisSchema } from "@/lib/ai/nutrition-analysis-schema";
import { validateNutritionAnalysis } from "@/lib/ai/validate-nutrition-analysis";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    /*
     * ---------------------------------------------
     * 1. CHECK GEMINI API KEY
     * ---------------------------------------------
     */

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ---------------------------------------------
     * 2. READ IMAGE FROM FORM DATA
     * ---------------------------------------------
     */

    const formData =
      await request.formData();

    const image =
      formData.get("image");
    
    const clarificationAnswerRaw =
        formData.get("clarificationAnswer");

    const clarificationAnswer =
    typeof clarificationAnswerRaw === "string"
        ? clarificationAnswerRaw.trim()
        : "";

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          error:
            "An image is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------
     * 3. VALIDATE IMAGE TYPE
     * ---------------------------------------------
     */

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        image.type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only JPEG, PNG, and WebP images are supported.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------
     * 4. VALIDATE FILE SIZE
     * ---------------------------------------------
     *
     * Maximum size:
     * 5 MB
     */

    const maxFileSize =
      5 * 1024 * 1024;

    if (
      image.size >
      maxFileSize
    ) {
      return NextResponse.json(
        {
          error:
            "Image must be smaller than 5 MB.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------
     * 5. CONVERT IMAGE TO BASE64
     * ---------------------------------------------
     */

    const imageBuffer =
      await image.arrayBuffer();

    const base64Image =
      Buffer.from(
        imageBuffer
      ).toString("base64");

    /*
     * ---------------------------------------------
     * 6. CREATE GEMINI CLIENT
     * ---------------------------------------------
     */

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    /*
     * ---------------------------------------------
     * 7. CREATE NUTRITION PROMPT
     * ---------------------------------------------
     *
     * Gemini now has two possible jobs:
     *
     * 1. Complete the nutrition analysis
     * 2. Ask the user for clarification
     *
     * We deliberately tell the model not to guess
     * visually ambiguous ingredients.
     */

    const prompt = `
You are a nutrition analysis assistant inside an AI fitness application.

Analyse the meal shown in the image.

Your first responsibility is to decide whether the visible food can be identified well enough to estimate nutrition responsibly.

IMPORTANT RULES:

1. If a key ingredient is visually ambiguous and would materially affect the nutrition estimate, do not guess.

2. In that case, return:
   status = "needs_clarification"

3. Ask exactly one concise clarification question.

4. Provide between 2 and 6 practical clarification options.

5. Use a broad meal name when necessary.

Example:
If you can see a curry containing red meat but cannot reliably distinguish lamb from beef, use a meal name such as:
"Meat curry"

Do not confidently label it as beef or lamb based only on appearance.

6. Ingredients that may require clarification include:
   - meat type
   - protein source
   - milk type
   - sauce base
   - cooking oil
   - cheese type
   - similar visually ambiguous ingredients

7. Only request clarification when knowing the ingredient would meaningfully improve the calorie or macronutrient estimate.

8. If the meal is identifiable well enough, return:
   status = "complete"

9. Treat all nutritional values as estimates.

10. Do not claim exact nutritional accuracy from an image.

11. Use only foods that are reasonably visible or strongly implied by the meal.

12. Do not invent ingredients that cannot reasonably be inferred.

13. If portion sizes are uncertain, reflect this in the confidence level and notes.

14. All calorie and macronutrient values must be non-negative.

15. Keep notes concise and useful.

16. Return only data matching the required JSON structure.

${clarificationAnswer
  ? `
The user has provided this clarification:

"${clarificationAnswer}"

Use this clarification as reliable context for the ambiguous ingredient.

Do not ask the same clarification question again unless another major ambiguity remains.

If the clarification resolves the key uncertainty, return:
status = "complete"

Use the user's clarification when estimating the final calories and macros.
`
  : ""}

WHEN status = "needs_clarification":

- estimatedCalories must be null
- proteinGrams must be null
- carbsGrams must be null
- fatGrams must be null
- clarification must contain:
  - question
  - options

The foods array may be empty if reliable nutritional analysis cannot yet be completed.

WHEN status = "complete":

- clarification must be null
- estimatedCalories must contain a number
- proteinGrams must contain a number
- carbsGrams must contain a number
- fatGrams must contain a number
- foods should contain the identified meal components

For each identified food item estimate:

- name
- estimatedAmount
- estimatedCalories
- proteinGrams
- carbsGrams
- fatGrams
`;

    /*
     * ---------------------------------------------
     * 8. CALL GEMINI
     * ---------------------------------------------
     */

    const response =
      await ai.models.generateContent({
        model:
          "gemini-3.5-flash-lite",

        contents: [
          {
            role: "user",

            parts: [
              {
                text: prompt,
              },

              {
                inlineData: {
                  mimeType:
                    image.type,

                  data:
                    base64Image,
                },
              },
            ],
          },
        ],

        /*
         * Structured output ensures Gemini
         * returns predictable JSON.
         */
        config: {
          responseMimeType:
            "application/json",

          responseJsonSchema: {
            type: "object",

            properties: {
              /*
               * Tells the app whether we have
               * enough information to finish.
               */
              status: {
                type: "string",

                enum: [
                  "complete",
                  "needs_clarification",
                ],
              },

              mealName: {
                type: "string",
              },

              /*
               * Nutrition totals are nullable
               * because we may need clarification
               * before estimating them.
               */
              estimatedCalories: {
                anyOf: [
                  {
                    type: "number",
                    minimum: 0,
                  },

                  {
                    type: "null",
                  },
                ],
              },

              proteinGrams: {
                anyOf: [
                  {
                    type: "number",
                    minimum: 0,
                  },

                  {
                    type: "null",
                  },
                ],
              },

              carbsGrams: {
                anyOf: [
                  {
                    type: "number",
                    minimum: 0,
                  },

                  {
                    type: "null",
                  },
                ],
              },

              fatGrams: {
                anyOf: [
                  {
                    type: "number",
                    minimum: 0,
                  },

                  {
                    type: "null",
                  },
                ],
              },

              /*
               * Individual detected foods.
               */
              foods: {
                type: "array",

                items: {
                  type: "object",

                  properties: {
                    name: {
                      type: "string",
                    },

                    estimatedAmount: {
                      type: "string",
                    },

                    estimatedCalories: {
                      type: "number",
                      minimum: 0,
                    },

                    proteinGrams: {
                      type: "number",
                      minimum: 0,
                    },

                    carbsGrams: {
                      type: "number",
                      minimum: 0,
                    },

                    fatGrams: {
                      type: "number",
                      minimum: 0,
                    },
                  },

                  required: [
                    "name",
                    "estimatedAmount",
                    "estimatedCalories",
                    "proteinGrams",
                    "carbsGrams",
                    "fatGrams",
                  ],

                  additionalProperties:
                    false,
                },
              },

              confidence: {
                type: "string",

                enum: [
                  "low",
                  "medium",
                  "high",
                ],
              },

              notes: {
                type: "string",
              },

              /*
               * This contains a question only when
               * Gemini needs user clarification.
               */
              clarification: {
                anyOf: [
                  {
                    type: "object",

                    properties: {
                      question: {
                        type: "string",
                      },

                      options: {
                        type: "array",

                        items: {
                          type: "string",
                        },

                        minItems: 2,
                        maxItems: 6,
                      },
                    },

                    required: [
                      "question",
                      "options",
                    ],

                    additionalProperties:
                      false,
                  },

                  {
                    type: "null",
                  },
                ],
              },
            },

            required: [
              "status",
              "mealName",
              "estimatedCalories",
              "proteinGrams",
              "carbsGrams",
              "fatGrams",
              "foods",
              "confidence",
              "notes",
              "clarification",
            ],

            additionalProperties:
              false,
          },
        },
      });

    /*
     * ---------------------------------------------
     * 9. READ GEMINI OUTPUT
     * ---------------------------------------------
     */

    const rawOutput =
      response.text;

    if (!rawOutput) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    /*
     * Convert JSON text into a JavaScript object.
     */
    const parsedOutput =
      JSON.parse(rawOutput);

    /*
     * ---------------------------------------------
     * 10. VALIDATE WITH ZOD
     * ---------------------------------------------
     */

    const validationResult =
      nutritionAnalysisSchema.safeParse(
        parsedOutput
      );

    if (
      !validationResult.success
    ) {
      console.error(
        "Nutrition analysis failed Zod validation:",
        validationResult.error
      );

      return NextResponse.json(
        {
          error:
            "AI nutrition analysis returned an invalid format.",
        },
        {
          status: 500,
        }
      );
    }

    const analysis =
      validationResult.data;

    const nutritionValidation =
      validateNutritionAnalysis(
        analysis
      );

    /*
     * ---------------------------------------------
     * 11. BUSINESS-RULE VALIDATION
     * ---------------------------------------------
     *
     * Zod confirms the shape.
     *
     * These checks confirm that the values also
     * make sense for the selected status.
     */

    if (
      analysis.status ===
      "needs_clarification"
    ) {
      if (
        analysis.clarification ===
        null
      ) {
        return NextResponse.json(
          {
            error:
              "AI requested clarification but did not provide a clarification question.",
          },
          {
            status: 500,
          }
        );
      }

      /*
       * We intentionally do not accept final macro
       * estimates before clarification is resolved.
       */
      if (
        analysis.estimatedCalories !==
          null ||
        analysis.proteinGrams !==
          null ||
        analysis.carbsGrams !==
          null ||
        analysis.fatGrams !==
          null
      ) {
        return NextResponse.json(
          {
            error:
              "AI returned nutrition totals before the required clarification was resolved.",
          },
          {
            status: 500,
          }
        );
      }
    }

    if (
      analysis.status ===
      "complete"
    ) {
      if (
        analysis.clarification !==
        null
      ) {
        return NextResponse.json(
          {
            error:
              "AI returned an unexpected clarification for a completed nutrition analysis.",
          },
          {
            status: 500,
          }
        );
      }

      if (
        analysis.estimatedCalories ===
          null ||
        analysis.proteinGrams ===
          null ||
        analysis.carbsGrams ===
          null ||
        analysis.fatGrams ===
          null
      ) {
        return NextResponse.json(
          {
            error:
              "Completed nutrition analysis is missing nutritional totals.",
          },
          {
            status: 500,
          }
        );
      }
    }

    /*
     * ---------------------------------------------
     * 12. RETURN RESULT
     * ---------------------------------------------
     */

    return NextResponse.json({
      analysis,
      validation: nutritionValidation,
    });
  } catch (error) {
    console.error(
      "Nutrition analysis API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while analysing the meal.",
      },
      {
        status: 500,
      }
    );
  }
}
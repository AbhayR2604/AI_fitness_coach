import { z } from "zod";

export const nutritionFoodItemSchema = z.object({
  name: z.string().min(1),

  estimatedAmount: z.string().min(1),

  estimatedCalories: z.number().min(0),

  proteinGrams: z.number().min(0),

  carbsGrams: z.number().min(0),

  fatGrams: z.number().min(0),
});

export const nutritionClarificationSchema = z.object({
  question: z.string().min(1),

  options: z
    .array(z.string().min(1))
    .min(2),
});

export const nutritionAnalysisSchema = z.object({
  status: z.enum([
    "complete",
    "needs_clarification",
  ]),

  mealName: z.string().min(1),

  estimatedCalories: z
    .number()
    .min(0)
    .nullable(),

  proteinGrams: z
    .number()
    .min(0)
    .nullable(),

  carbsGrams: z
    .number()
    .min(0)
    .nullable(),

  fatGrams: z
    .number()
    .min(0)
    .nullable(),

  foods: z.array(
    nutritionFoodItemSchema
  ),

  confidence: z.enum([
    "low",
    "medium",
    "high",
  ]),

  notes: z.string().min(1),

  clarification:
    nutritionClarificationSchema.nullable(),
});

export type NutritionFoodItem =
  z.infer<
    typeof nutritionFoodItemSchema
  >;

export type NutritionClarification =
  z.infer<
    typeof nutritionClarificationSchema
  >;

export type NutritionAnalysis =
  z.infer<
    typeof nutritionAnalysisSchema
  >;
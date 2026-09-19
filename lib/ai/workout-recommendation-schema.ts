import { z } from "zod";

export const workoutRecommendationSchema = z.object({
  action: z.enum([
    "increase_load",
    "increase_reps",
    "maintain",
    "reduce_load",
    "recover",
    "collect_more_data",
  ]),

  recommendedWeightKg: z.number().nullable(),

  recommendedReps: z.string().nullable(),

  confidence: z.enum([
    "low",
    "medium",
    "high",
  ]),

  reason: z.string().min(1),

  focus: z.string().min(1),

  coachingNote: z.string().min(1),

  caution: z.string().nullable(),
});

export type WorkoutRecommendation = z.infer<
  typeof workoutRecommendationSchema
>;
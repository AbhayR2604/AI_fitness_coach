import type { NutritionAnalysis } from "@/lib/ai/nutrition-analysis-schema";

export type NutritionValidationResult = {
  valid: boolean;
  warnings: string[];
};

/*
 * Compare estimated calories against calories
 * implied by the macros.
 *
 * Protein = 4 kcal / gram
 * Carbs   = 4 kcal / gram
 * Fat     = 9 kcal / gram
 */
function calculateCaloriesFromMacros(
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number
) {
  return (
    proteinGrams * 4 +
    carbsGrams * 4 +
    fatGrams * 9
  );
}

export function validateNutritionAnalysis(
  analysis: NutritionAnalysis
): NutritionValidationResult {
  const warnings: string[] = [];

  /*
   * Clarification responses do not yet have
   * final nutrition totals, so there is nothing
   * meaningful to validate here.
   */
  if (
    analysis.status ===
    "needs_clarification"
  ) {
    return {
      valid: true,
      warnings,
    };
  }

  /*
   * Defensive check.
   *
   * The schema should already guarantee these
   * values exist for a completed analysis.
   */
  if (
    analysis.estimatedCalories === null ||
    analysis.proteinGrams === null ||
    analysis.carbsGrams === null ||
    analysis.fatGrams === null
  ) {
    return {
      valid: false,
      warnings: [
        "Completed analysis is missing nutrition totals.",
      ],
    };
  }

  /*
   * ---------------------------------------------
   * CHECK 1: MACRO CALORIES VS REPORTED CALORIES
   * ---------------------------------------------
   */

  const caloriesFromMacros =
    calculateCaloriesFromMacros(
      analysis.proteinGrams,
      analysis.carbsGrams,
      analysis.fatGrams
    );

  const reportedCalories =
    analysis.estimatedCalories;

  if (reportedCalories > 0) {
    const calorieDifferencePercent =
      Math.abs(
        caloriesFromMacros -
          reportedCalories
      ) /
      reportedCalories *
      100;

    /*
     * Allow some tolerance because these are
     * estimates and nutrition labels also involve
     * rounding, fibre, sugar alcohols, etc.
     */
    if (
      calorieDifferencePercent >
      20
    ) {
      warnings.push(
        `Reported calories differ substantially from the calories implied by the macros.`
      );
    }
  }

  /*
   * ---------------------------------------------
   * CHECK 2: FOOD-ITEM TOTALS VS MEAL TOTALS
   * ---------------------------------------------
   */

  if (analysis.foods.length > 0) {
    const foodCalories =
      analysis.foods.reduce(
        (total, food) =>
          total +
          food.estimatedCalories,
        0
      );

    const foodProtein =
      analysis.foods.reduce(
        (total, food) =>
          total +
          food.proteinGrams,
        0
      );

    const foodCarbs =
      analysis.foods.reduce(
        (total, food) =>
          total +
          food.carbsGrams,
        0
      );

    const foodFat =
      analysis.foods.reduce(
        (total, food) =>
          total +
          food.fatGrams,
        0
      );

    const calorieDifference =
      reportedCalories > 0
        ? Math.abs(
            foodCalories -
              reportedCalories
          ) /
          reportedCalories *
          100
        : 0;

    if (calorieDifference > 20) {
      warnings.push(
        "The sum of individual food calories differs substantially from the meal total."
      );
    }

    /*
     * Macro totals are allowed a small percentage
     * difference because the model is estimating
     * portions rather than reading exact labels.
     */

    const proteinDifference =
      analysis.proteinGrams > 0
        ? Math.abs(
            foodProtein -
              analysis.proteinGrams
          ) /
          analysis.proteinGrams *
          100
        : 0;

    const carbsDifference =
      analysis.carbsGrams > 0
        ? Math.abs(
            foodCarbs -
              analysis.carbsGrams
          ) /
          analysis.carbsGrams *
          100
        : 0;

    const fatDifference =
      analysis.fatGrams > 0
        ? Math.abs(
            foodFat -
              analysis.fatGrams
          ) /
          analysis.fatGrams *
          100
        : 0;

    if (
      proteinDifference >
        25 ||
      carbsDifference >
        25 ||
      fatDifference >
        25
    ) {
      warnings.push(
        "The individual food macros do not closely match the reported meal macros."
      );
    }
  }

  /*
   * ---------------------------------------------
   * CHECK 3: EXTREME VALUES
   * ---------------------------------------------
   *
   * These limits are intentionally generous.
   * They are only meant to catch clearly
   * unrealistic model outputs.
   */

  if (
    analysis.estimatedCalories >
    5000
  ) {
    warnings.push(
      "Estimated calories are unusually high for a single meal."
    );
  }

  if (
    analysis.proteinGrams >
    300
  ) {
    warnings.push(
      "Estimated protein is unusually high for a single meal."
    );
  }

  if (
    analysis.carbsGrams >
    600
  ) {
    warnings.push(
      "Estimated carbohydrates are unusually high for a single meal."
    );
  }

  if (
    analysis.fatGrams >
    300
  ) {
    warnings.push(
      "Estimated fat is unusually high for a single meal."
    );
  }

  return {
    /*
     * For now, warnings do not automatically
     * reject the analysis.
     *
     * We want to observe real model behaviour
     * first before deciding which warnings
     * should become hard failures.
     */
    valid: true,
    warnings,
  };
}
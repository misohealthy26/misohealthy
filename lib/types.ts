// Shared response shape for /api/convert and saved recipes (v2 redesign).
// Single-level sub-recipes; ingredient-line objects with optional homemade
// and store-bought (descriptor, no brand) swap options; LLM-emitted goal tags.

export const HEALTH_GOALS = [
  "weight loss",
  "heart health",
  "pre-diabetes",
  "gut health",
  "brain health",
  "cancer prevention",
  "menopause / perimenopause",
] as const;

export type HealthGoal = (typeof HEALTH_GOALS)[number];

export function isHealthGoal(value: unknown): value is HealthGoal {
  return (
    typeof value === "string" &&
    (HEALTH_GOALS as readonly string[]).includes(value)
  );
}

export type SubRecipe = {
  name: string;
  ingredients: string[];
  method: string[];
};

export type StoreBoughtSwap = {
  descriptor: string;
  criteria: string[];
};

export type NutrientContribution = {
  label: string;
  pct: string;
};

export type IngredientLine = {
  text: string;
  superfood?: boolean;
  goalTags?: HealthGoal[];
  nutrients?: NutrientContribution[];
  swap?: {
    homemade?: SubRecipe;
    storeBought?: StoreBoughtSwap;
  };
};

export type OriginalRecipe = {
  title: string;
  ingredients: string[];
  method: string[];
  servings: number;
};

export type HealthyRecipe = {
  title: string;
  ingredients: IngredientLine[];
  method: string[];
  servings: number;
};

export type NutritionRow = {
  label: string;
  original: string;
  healthy: string;
  healthyDV?: string; // e.g. "24%" — % of FDA daily value for healthy version
};

export type SwapNote = {
  from: string;
  to: string;
  why: string;
  goalTags?: HealthGoal[];
};

export type NutritionMeta = {
  source: "estimate" | "usda" | "usda-partial";
};

export type ConvertResponse = {
  original: OriginalRecipe;
  healthy: HealthyRecipe;
  nutrition: NutritionRow[];
  nutritionMeta?: NutritionMeta;
  swaps: SwapNote[];
};

// What we persist under saved_recipes.payload. Healthy only.
// Legacy rows may still carry an `original` field — readers should tolerate it.
export type SavedRecipePayload = {
  healthy: HealthyRecipe;
  nutrition: NutritionRow[];
  nutritionMeta?: NutritionMeta;
  swaps: SwapNote[];
  healthGoals: HealthGoal[];
  vegetarian: boolean;
};

import type { HealthGoal, HealthyRecipe, IngredientLine } from "@/lib/types";

export type SuperfoodEntry = {
  id: string;
  name: string;
  goals: HealthGoal[];
  addition: string; // The ingredient line we add (e.g. "1 tbsp ground flax").
  howTo: string;    // How to weave it into the method, as a finishing step.
};

export const SUPERFOODS: SuperfoodEntry[] = [
  {
    id: "ground-flax",
    name: "Ground flax",
    goals: ["heart health", "blood sugar", "gut health", "cognitive"],
    addition: "1 tbsp ground flax",
    howTo: "Stir the ground flax into the sauce or batter — it dissolves invisibly and adds 3g fiber + omega-3s.",
  },
  {
    id: "chia",
    name: "Chia seeds",
    goals: ["blood sugar", "gut health", "energy", "cognitive"],
    addition: "1 tbsp chia seeds",
    howTo: "Sprinkle the chia seeds in during the last few minutes of cooking — they'll absorb liquid and thicken the dish slightly.",
  },
  {
    id: "hemp-seeds",
    name: "Hemp seeds",
    goals: ["bone and muscle", "heart health", "cognitive"],
    addition: "2 tbsp hemp seeds",
    howTo: "Sprinkle the hemp seeds on top just before serving — nutty, soft, and protein-rich.",
  },
  {
    id: "turmeric",
    name: "Turmeric",
    goals: ["inflammation", "immunity", "cognitive"],
    addition: "½ tsp ground turmeric",
    howTo: "Bloom the turmeric in the cooking oil with the aromatics at the start — pair with a pinch of black pepper for absorption.",
  },
  {
    id: "ginger",
    name: "Fresh ginger",
    goals: ["immunity", "gut health", "inflammation"],
    addition: "1 tsp freshly grated ginger",
    howTo: "Grate the fresh ginger in with the aromatics at the start of cooking.",
  },
  {
    id: "walnuts",
    name: "Walnuts",
    goals: ["heart health", "cognitive", "inflammation"],
    addition: "¼ cup chopped walnuts",
    howTo: "Toast the walnuts briefly in a dry pan, then fold them in just before serving.",
  },
  {
    id: "pumpkin-seeds",
    name: "Pumpkin seeds",
    goals: ["bone and muscle", "immunity", "heart health"],
    addition: "2 tbsp pumpkin seeds",
    howTo: "Toast the pumpkin seeds in a dry pan until they pop, then scatter on top as a finishing crunch.",
  },
  {
    id: "nutritional-yeast",
    name: "Nutritional yeast",
    goals: ["gut health", "bone and muscle", "immunity"],
    addition: "1 tbsp nutritional yeast",
    howTo: "Stir the nutritional yeast in at the end — it adds cheesy savor and a B-vitamin boost.",
  },
  {
    id: "pomegranate",
    name: "Pomegranate seeds",
    goals: ["heart health", "immunity", "inflammation"],
    addition: "2 tbsp pomegranate seeds",
    howTo: "Sprinkle the pomegranate seeds over the finished dish for color and brightness.",
  },
  {
    id: "blueberries",
    name: "Blueberries",
    goals: ["cognitive", "immunity", "inflammation"],
    addition: "¼ cup blueberries",
    howTo: "Best for sweet dishes, oats, or salads — add the blueberries at the end so they don't break down.",
  },
];

export function getSuperfoodsForGoal(goal: HealthGoal): SuperfoodEntry[] {
  return SUPERFOODS.filter((s) => s.goals.includes(goal));
}

export function findSuperfood(id: string): SuperfoodEntry | undefined {
  return SUPERFOODS.find((s) => s.id === id);
}

// Pure: returns a new HealthyRecipe with the superfood added.
// Appends an ingredient line (flagged superfood) + a finishing method step.
export function applySuperfood(
  recipe: HealthyRecipe,
  entry: SuperfoodEntry,
): HealthyRecipe {
  const ingredient: IngredientLine = {
    text: entry.addition,
    superfood: true,
    goalTags: entry.goals,
  };
  return {
    ...recipe,
    ingredients: [...recipe.ingredients, ingredient],
    method: [...recipe.method, entry.howTo],
  };
}

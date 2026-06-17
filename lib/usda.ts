// USDA FoodData Central integration
// Docs: https://api.nal.usda.gov/fdc/v1

const BASE = "https://api.nal.usda.gov/fdc/v1";

// USDA nutrient IDs
const NID = {
  calories:      1008,
  protein:       1003,
  fiber:         1079,
  totalFat:      1004,
  saturatedFat:  1258,
  addedSugars:   1235,
  totalSugars:   2000,
  sodium:        1093,
  carbs:         1005,
} as const;

// FDA 2020 Daily Values (2000 kcal reference diet)
const DAILY_VALUES = {
  calories:     2000,
  protein:      50,
  fiber:        28,
  saturatedFat: 20,
  addedSugars:  50,
  sodium:       2300,
} as const;

type FoodNutrient = {
  nutrientId: number;
  value: number;
  unitName: string;
};

type UsdaFood = {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: FoodNutrient[];
};

type SearchResponse = {
  foods?: UsdaFood[];
  totalHits?: number;
};

export type NutritionData = {
  calories:     number;
  protein:      number;
  fiber:        number;
  saturatedFat: number;
  addedSugars:  number;
  sodium:       number;
};

function getVal(food: UsdaFood, id: number): number {
  return food.foodNutrients.find((n) => n.nutrientId === id)?.value ?? 0;
}

function pct(value: number, key: keyof typeof DAILY_VALUES): string {
  const dv = DAILY_VALUES[key];
  return `${Math.round((value / dv) * 100)}%`;
}

// Strip common decorative prefixes from dish titles before searching
function cleanTitle(title: string): string {
  return title
    .replace(/^(classic|traditional|miso healthy|homestyle|easy|simple|the best)\s+/i, "")
    .replace(/\brecipe\b/gi, "")
    .trim();
}

async function searchFood(
  query: string,
  apiKey: string,
  dataType = "Survey%20(FNDDS),Foundation,SR%20Legacy",
): Promise<UsdaFood | null> {
  try {
    const url =
      `${BASE}/foods/search` +
      `?query=${encodeURIComponent(query)}` +
      `&api_key=${apiKey}` +
      `&pageSize=3` +
      `&dataType=${dataType}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = (await res.json()) as SearchResponse;
    return data.foods?.[0] ?? null;
  } catch {
    return null;
  }
}

// Scale USDA per-100g values to a serving size in grams
function scale(food: UsdaFood, servingGrams: number): NutritionData {
  const s = servingGrams / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    calories:     Math.round(getVal(food, NID.calories) * s),
    protein:      round1(getVal(food, NID.protein) * s),
    fiber:        round1(getVal(food, NID.fiber) * s),
    saturatedFat: round1(getVal(food, NID.saturatedFat) * s),
    // prefer added sugars; fall back to total sugars
    addedSugars:  round1((getVal(food, NID.addedSugars) || getVal(food, NID.totalSugars)) * s),
    sodium:       Math.round(getVal(food, NID.sodium) * s),
  };
}

export type UsdaLookupResult = {
  originalData: NutritionData;
  healthyData:  NutritionData;
  source: "usda" | "usda-partial";
};

// Look up the original dish in USDA and return its nutrition data.
// We only look up the original — the healthy version is a custom recipe
// that won't exist in USDA, so Claude's estimates are used for that side.
export async function lookupOriginalNutrition(
  originalTitle: string,
  apiKey: string,
  servingGrams = 300,
): Promise<{ data: NutritionData } | null> {
  const food = await searchFood(cleanTitle(originalTitle), apiKey);
  if (!food) return null;
  return { data: scale(food, servingGrams) };
}

// Merge USDA original values into Claude's nutrition rows, keeping
// Claude's healthy-version values and DV percentages intact.
export function mergeUsdaOriginal(
  claudeRows: Array<{ label: string; original: string; healthy: string; healthyDV?: string }>,
  usdaOriginal: NutritionData,
): Array<{ label: string; original: string; healthy: string; healthyDV?: string }> {
  const usdaMap: Record<string, string> = {
    "Calories":      `${usdaOriginal.calories} kcal`,
    "Protein":       `${usdaOriginal.protein}g`,
    "Fiber":         `${usdaOriginal.fiber}g`,
    "Saturated fat": `${usdaOriginal.saturatedFat}g`,
    "Added sugar":   `${usdaOriginal.addedSugars}g`,
    "Sodium":        `${usdaOriginal.sodium}mg`,
  };
  return claudeRows.map((row) => ({
    ...row,
    original: usdaMap[row.label] ?? row.original,
  }));
}

export function buildNutritionRows(
  original: NutritionData,
  healthy: NutritionData,
): Array<{ label: string; original: string; healthy: string; healthyDV: string }> {
  return [
    {
      label:     "Calories",
      original:  `${original.calories} kcal`,
      healthy:   `${healthy.calories} kcal`,
      healthyDV: pct(healthy.calories, "calories"),
    },
    {
      label:     "Protein",
      original:  `${original.protein}g`,
      healthy:   `${healthy.protein}g`,
      healthyDV: pct(healthy.protein, "protein"),
    },
    {
      label:     "Fiber",
      original:  `${original.fiber}g`,
      healthy:   `${healthy.fiber}g`,
      healthyDV: pct(healthy.fiber, "fiber"),
    },
    {
      label:     "Saturated fat",
      original:  `${original.saturatedFat}g`,
      healthy:   `${healthy.saturatedFat}g`,
      healthyDV: pct(healthy.saturatedFat, "saturatedFat"),
    },
    {
      label:     "Added sugar",
      original:  `${original.addedSugars}g`,
      healthy:   `${healthy.addedSugars}g`,
      healthyDV: pct(healthy.addedSugars, "addedSugars"),
    },
    {
      label:     "Sodium",
      original:  `${original.sodium}mg`,
      healthy:   `${healthy.sodium}mg`,
      healthyDV: pct(healthy.sodium, "sodium"),
    },
  ];
}

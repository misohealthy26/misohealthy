import Anthropic from "@anthropic-ai/sdk";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { isHealthGoal, type MealPrepNutritionRow } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { lookupOriginalNutrition } from "@/lib/usda";

// FDA 2020 Daily Values
const DV = { calories: 2000, protein: 50, fiber: 28, saturatedFat: 20, addedSugar: 50, sodium: 2300 };

function parseNum(s: string): number {
  return parseFloat(String(s).replace(/[^\d.]/g, "")) || 0;
}

function dvPct(value: number, key: keyof typeof DV): string {
  return `${Math.round((value / DV[key]) * 100)}%`;
}

type ClaudeNutritionRow = {
  setName: string;
  servings?: number;
  calories?: string;
  protein?: string;
  fiber?: string;
  saturatedFat?: string;
  addedSugar?: string;
  sodium?: string;
};

// Use USDA value only when it's non-zero — a zero from USDA means missing data,
// not an actual zero. Fall back to Claude's estimate for any missing nutrient.
function mergeNutrient(usda: number, claude: number): number {
  return usda > 0 ? usda : claude;
}

async function buildNutrition(claudeRows: ClaudeNutritionRow[], usdaKey?: string): Promise<MealPrepNutritionRow[]> {
  return Promise.all(claudeRows.map(async (row) => {
    let calories = parseNum(row.calories ?? "");
    let protein  = parseNum(row.protein ?? "");
    let fiber    = parseNum(row.fiber ?? "");
    let satFat   = parseNum(row.saturatedFat ?? "");
    let sugar    = parseNum(row.addedSugar ?? "");
    let sodium   = parseNum(row.sodium ?? "");
    let source: "estimate" | "usda" = "estimate";

    if (usdaKey) {
      try {
        const usda = await lookupOriginalNutrition(row.setName, usdaKey, 400);
        if (usda) {
          calories = mergeNutrient(usda.data.calories,     calories);
          protein  = mergeNutrient(usda.data.protein,      protein);
          fiber    = mergeNutrient(usda.data.fiber,        fiber);
          satFat   = mergeNutrient(usda.data.saturatedFat, satFat);
          sugar    = mergeNutrient(usda.data.addedSugars,  sugar);
          sodium   = mergeNutrient(usda.data.sodium,       sodium);
          source   = "usda";
        }
      } catch { /* fall back to Claude estimates */ }
    }

    return {
      setName: row.setName,
      servings: row.servings ?? 3,
      source,
      rows: [
        { label: "Calories",      value: `${calories} kcal`, dv: dvPct(calories, "calories") },
        { label: "Protein",       value: `${protein}g`,      dv: dvPct(protein, "protein") },
        { label: "Fiber",         value: `${fiber}g`,        dv: dvPct(fiber, "fiber") },
        { label: "Saturated fat", value: `${satFat}g`,       dv: dvPct(satFat, "saturatedFat") },
        { label: "Added sugar",   value: `${sugar}g`,        dv: dvPct(sugar, "addedSugar") },
        { label: "Sodium",        value: `${sodium}mg`,      dv: dvPct(sodium, "sodium") },
      ],
    };
  }));
}

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const DAILY_LIMIT = 10;

const MEAL_PREP_PROMPT = `You are a culinary nutrition expert for the miso healthy platform. Create a component-based weekly meal prep plan tailored to the user's health goals.

The philosophy: prep smart building blocks once on the weekend — a starch, vegetables, leafy greens, a pickled or fermented element, a protein, and a sauce — then assemble two different bowl builds, each giving 3 meals across the week.

Every bowl build must include all six components:
1. STARCH — wild rice, Japanese sweet potato (Murasaki: tan skin, white-yellow flesh, sweet and nutty — Trader Joe's / Whole Foods / Asian markets), Garnet sweet potato (red-orange skin, orange flesh, widely available — most US grocery stores sell these as "yams"), quinoa, forbidden black rice, chickpea pasta. Never white rice, russet potatoes, ube, or vague "purple potatoes." Always name the specific variety.
2. VEGETABLE — roasted, grilled, or raw vegetables prepped in bulk.
3. LEAFY GREEN — something fresh added per meal: butter lettuce, arugula, watercress, kale, spinach, shredded cabbage.
4. PICKLED OR FERMENTED — quick-pickled cucumber, pickled red onion, kimchi, sauerkraut, miso-marinated something. Include a simple brine/method.
5. PROTEIN — grilled or roasted in bulk. Use boneless skinless chicken thighs (not breast) for roasting/grilling. Keep fish and seafood as a "cook fresh per meal" note. No meat substitutions unless vegetarian is requested.
6. SAUCE / DRESSING — one miso-healthy dressing or sauce made for the week. Use or adapt from: Garlic Tahini Dressing, Japanese Wasabi Dressing, Chimichurri Sauce, Mexican Crema, Lime Vinaigrette, Miso Peanut Sauce, Green Curry Paste, or create a simple miso-healthy version. Include the FULL recipe.

Style examples (use as inspiration, not templates):
- Grilled Chop Salad: starch = none (lettuce-forward), veg = grilled asparagus + zucchini + corn + green onion (chopped), leafy = butter lettuce, pickled = quick-pickled red onion, protein = grilled boneless chicken thighs, sauce = lime vinaigrette.
- Japanese Sweet Potato Bowl: starch = 3 roasted Japanese sweet potatoes, veg = seaweed, leafy = watercress, pickled = pickled cucumber, protein = salmon (cook fresh), sauce = Japanese wasabi dressing.

Miso healthy swap rules:
- White rice → wild rice or forbidden black rice (never brown rice — higher arsenic)
- Russet potatoes → sweet potatoes or Japanese sweet potatoes
- Regular pasta → chickpea pasta
- White/brown sugar → date sugar (baking), maple syrup (liquid), raw honey (unheated)
- Sneak invisible fiber where natural: 1 tbsp ground flax, 1 tbsp chia, pureed white beans

Anti-inflammatory additions to weave in: ginger, turmeric, garlic, avocado, leafy greens, walnuts, fermented foods.

Return ONLY a single JSON object:

{
  "theme": "string — short evocative name for this prep week (e.g. 'mediterranean grill week')",
  "sets": [
    {
      "name": "string — bowl build name, lowercase (e.g. 'grilled chop salad')",
      "meals": 3,
      "batchPrep": [
        {
          "component": "starch",
          "name": "string — e.g. 'wild rice'",
          "method": "string — clear, practical batch prep instructions",
          "superfood": true
        },
        {
          "component": "vegetable",
          "name": "string",
          "method": "string"
        },
        {
          "component": "pickled",
          "name": "string — e.g. 'quick-pickled red onion'",
          "method": "string — include brine ingredients and timing"
        },
        {
          "component": "protein",
          "name": "string",
          "method": "string — if best cooked fresh, say so",
          "superfood": false
        }
      ],
      "sauce": {
        "name": "string",
        "recipe": "string — full recipe: ingredients then method, as one paragraph"
      },
      "freshPerMeal": [
        { "component": "leafy", "item": "string" },
        { "component": "other", "item": "string" }
      ],
      "assembly": "string — how to build the bowl per meal from all six components",
      "healthNote": "string — one sentence on the key nutritional win for the user's goals"
    }
  ],
  "prepTips": ["string — 3–5 practical tips for efficient prep day (e.g. 'start the pickled onion first — it needs 30 min to soften')"],
  "shoppingList": [
    {
      "category": "string — one of: produce, protein, grains & pantry, condiments & spices, dairy & refrigerated",
      "items": [
        {
          "name": "string — ingredient name only, no descriptions (e.g. 'Murasaki sweet potato', not 'Murasaki sweet potato (tan skin, white flesh)')",
          "quantity": "string — short quantity only (e.g. '2 lbs', '1 bunch', '3 cups', '3 medium') — never add parenthetical descriptions",
          "usedIn": "string — which bowl build(s) this is for, e.g. 'both' or 'grilled chop salad'"
        }
      ]
    }
  ],
  "prepSchedule": [
    {
      "order": 1,
      "task": "string — what to do, e.g. 'Quick-pickle the red onion'",
      "activeTime": "string — hands-on time, e.g. '5 min'",
      "totalTime": "string — including resting/cooking time, e.g. '35 min'",
      "forSet": "string — which bowl build this task is for, e.g. 'grilled chop salad' or 'both'",
      "note": "string — optional tip, e.g. 'Start this first so it has time to soften'"
    }
  ],
  "nutrition": [
    {
      "setName": "string — matches the set name",
      "servings": 3,
      "calories": "string — e.g. '520 kcal'",
      "protein": "string — e.g. '38g'",
      "fiber": "string — e.g. '9g'",
      "saturatedFat": "string — e.g. '4g'",
      "addedSugar": "string — e.g. '2g'",
      "sodium": "string — e.g. '640mg'"
    }
  ]
}

Rules:
- Exactly 2 sets, each yielding 3 meals.
- Every set must include all six components: starch, vegetable, leafy green, pickled/fermented, protein, sauce.
- batchPrep covers starch, vegetable, pickled/fermented, and protein. Leafy greens are always added fresh per meal.
- shoppingList must be consolidated across both sets — if both use garlic, list it once with combined quantity.
- prepSchedule must be ordered so the longest/most hands-off tasks come first (pickled items, then grains, then proteins, then veg, then sauce).
- nutrition is estimated per assembled serving (one bowl), including fresh per-meal items.
- Shopping list categories always in this order: produce, protein, grains & pantry, condiments & spices, dairy & refrigerated.
- Tailor both builds to the user's health goals.
- No emoji. No markdown. Plain text only inside JSON strings.
- No brand names.
- NUTRITION TARGETS per assembled serving — design bowls to meet these: protein ≥ 20% DV (≥10g), fiber ≥ 15% DV (≥4g), sodium < 10% DV (<230mg), saturated fat < 10% DV (<2g), added sugar < 10% DV (<5g). Both bowls must meet all targets. If a sauce or dressing would push sodium or saturated fat over the limit, reduce the serving size of the sauce or reformulate it.
- BE CONCISE. Keep every string field under 60 words. Sauce recipes: ingredients list then one short method sentence. Methods: one clear sentence, no filler. This is critical — verbose output wastes tokens.`;

type RequestBody = {
  healthGoals?: unknown;
  vegetarian?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const healthGoals = Array.isArray(body.healthGoals)
    ? body.healthGoals.filter(isHealthGoal)
    : [];
  const vegetarian = body.vegetarian === true;

  if (healthGoals.length === 0) {
    return Response.json({ error: "Please pick at least one health goal." }, { status: 400 });
  }

  let userId: string | null = null;
  let currentCount = 0;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  if (isSupabaseConfigured()) {
    supabase = await createClient();
    const bearer = request.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = bearer
      ? await supabase.auth.getUser(bearer)
      : await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Sign in to generate recipes." }, { status: 401 });
    }
    userId = user.id;

    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("api_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
    currentCount = (usage?.count as number) ?? 0;
    if (currentCount >= DAILY_LIMIT) {
      return Response.json(
        { error: "You've reached your daily limit of 10 recipes. Come back tomorrow!" },
        { status: 429 },
      );
    }
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(`meal-prep:ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
  if (limit && !limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000));
    return new Response(
      JSON.stringify({ error: "You've hit the hourly limit. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
    );
  }

  const goalsLabel = healthGoals.join(", ");
  const vegetarianLine = vegetarian ? " Make both bowl builds fully vegetarian — no meat, poultry, or seafood." : "";
  const userMessage = `Health goals: "${goalsLabel}".${vegetarianLine} Generate a component-based weekly meal prep plan as JSON only, in the exact shape defined in the system prompt.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const completion = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4500,
      system: [{ type: "text", text: MEAL_PREP_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    });

    if (completion.stop_reason === "max_tokens") {
      console.error("/api/meal-prep: response truncated — raise max_tokens");
      return Response.json({ error: "The meal prep plan was too long to generate. Please try again." }, { status: 502 });
    }

    const text = completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Claude returned non-JSON (stop_reason:", completion.stop_reason, "):", text.slice(0, 800));
      return Response.json({ error: "Could not parse the meal prep plan. Please try again." }, { status: 502 });
    }

    if (supabase && userId) {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("api_usage")
        .upsert({ user_id: userId, date: today, count: currentCount + 1 });
    }

    // Enrich nutrition: USDA lookup + compute %DV
    const usdaKey = process.env.USDA_API_KEY;
    const rawNutrition = (parsed as Record<string, unknown>).nutrition as ClaudeNutritionRow[] | undefined;
    const enrichedNutrition = rawNutrition?.length
      ? await buildNutrition(rawNutrition, usdaKey)
      : [];

    return Response.json({ ...(parsed as object), nutrition: enrichedNutrition });
  } catch (err) {
    console.error("/api/meal-prep error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Meal prep generation failed: ${message}` }, { status: 500 });
  }
}

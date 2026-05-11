# Miso Healthy redesign — 2026-05

Source: boss feedback (2026-05-10). Captures decisions, scope, and open questions.

## Headline change

The current flow is **dish → vegetarian? → result**. The new flow is **dish → health goal → result**, with vegetarian and ingredient-level swaps moving onto the result view as post-result modifiers. Result page also gains superfood add-ons, sub-recipes, servings, USDA-powered nutrition (queued), and a brand-aligned visual refresh.

## Voice / copy constraints

- Do **not** describe the product as an "AI recipe generator." Frame as: science-backed recipes from medical experts, nutritionists, and food industry pros.
- "RFH Building Blocks" → **Miso Homemade** everywhere (system prompt, UI, sub-recipes).
- Landing-page value prop (verbatim copy from boss):

  > **Make any dish healthier.**
  >
  > Enter a dish you're craving and Miso Healthy will generate a science-backed option with side by side nutrition. Make custom swaps and superfood upgrades.

- Feature pills under the value prop:
  - Science-backed Recipes
  - Make your own swaps
  - Superfood add-ons
  - Side-by-Side nutrition comparison

## Three Steps section — moves above the wizard

Boss wants the "three steps" explainer rendered **above** the "what are you craving?" input on the landing page (currently it sits below as `MeetSection`). Updated copy:

- **01. Tell us what you're craving.** Type any dish — beef stroganoff, matzo ball soup, hamburger.
- **02. What are your health goals?** Dropdown: weight, heart health, blood sugar, energy, gut health, immunity, bone and muscle, cognitive, inflammation. Based on the goal, we surface ingredient swaps that fit (labeled on the result).
- **03. We make it healthier.** Smart, science-backed recipes from medical experts, nutritionists, and food industry pros. Drawing from cuisines around the world.

Nutrition tagline (below the comparison): *"The proof is in the numbers — powered by USDA. Compare calories, fiber, fat, and eventually, your well-being."*

## Wizard flow (new)

1. **Step 1 — Dish.** Existing UI. No change.
2. **Step 2 — Health goal.** Dropdown with the nine options above. Required.
3. **Cooking screen.** Same as today.
4. **Result page.** New affordances (see below).

The vegetarian step is **removed from the wizard**.

## Result page — new affordances

### Health-goal-aligned swaps (labeled)
Swaps that map to the user's health goal are tagged on the recipe (e.g. a small "blood sugar" pill next to "chickpea pasta"). The LLM is told the goal in the prompt and chooses applicable swaps; the response includes a `goalTags: string[]` on each swap and on superfood add-ons.

### Vegetarian toggle (post-result)
Toggle above the recipe. Flipping it triggers a fresh `/api/convert` call with the same dish + goal + `vegetarian: true`. The result replaces the current healthy view; original stays as-is for comparison. Counts against the rate-limit budget.

### Make Your Miso (ingredient swap)
Each ingredient on the **healthy** recipe shows a small swap affordance. Clicking opens a chooser:

- **Homemade.** Opens the sub-recipe inline (a Miso Homemade sub-recipe — e.g. RFH Cream Sauce becomes a small recipe-within-recipe, with its own ingredients and method).
- **Store-bought.** A **generic descriptor**, not a named brand — e.g. *"Look for a chickpea pasta with no added oils and chickpea flour as the first ingredient."* No brand names; avoids fabrication risk and removes the maintenance burden of keeping a brand catalog current.

Convenience copy: *"Knowing what's in your food matters. So does your time. Pick a homemade build or a store-bought option that still meets our standards."*

Both choices are **baked into the original LLM response** — no extra LLM call per swap. The response carries, per ingredient, a `swap: { homemade?: SubRecipe, storeBought?: { descriptor: string, criteria: string[] } }`. Most ingredients won't have swaps; those without are static.

### Superfood add-on
Button on the result: *"Add a superfood."* Opens a small modal with a dropdown filtered by the current health goal (e.g. weight → flax, chia; immunity → ginger, turmeric; etc.). Picking one updates the recipe with the superfood incorporated.

**Curated catalog approach** — no LLM call. We maintain a static mapping:
```ts
type SuperfoodEntry = {
  id: string;            // "ground-flax"
  name: string;          // "Ground flax"
  goals: HealthGoal[];   // ["weight", "heart health", "blood sugar"]
  addition: string;      // "1 tbsp ground flax"
  howTo: string;         // "Stir into the sauce in step 3 — it dissolves invisibly."
};
```

Adding a superfood appends the `addition` line to the healthy recipe's `ingredients` and the `howTo` snippet to the appropriate step (or as a new final step if no natural fit). Deterministic, instant, free. Catalog lives in `lib/superfoods.ts`.

### Servings
Recipe must declare `servings: number` (e.g. "Serves 4"). Add to the response schema and the prompt. Renders on the result.

### Superfoods labeled on the recipe
If an ingredient in the healthy recipe is itself a superfood (flax, chia, miso, etc.), tag it visually. Add a `superfoods: string[]` field on each recipe in the response, listing which ingredient indices/names are superfoods.

## Sub-recipes (Miso Homemade)

Currently the system prompt has rules like "Heavy cream → RFH Cream Sauce: 12 oz silken tofu + ..." which produces inline text. New shape: the LLM returns these as **separate sub-recipe objects** referenced from the ingredient line.

**Nesting depth: one level only.** A sub-recipe's own ingredients (e.g. miso paste inside the cream sauce) are treated as leaves — no sub-sub-recipes. Keeps the prompt simple, the schema flat, and the UI predictable.

Response shape sketch:
```ts
type SubRecipe = {
  name: string;            // "Miso Homemade Cream Sauce"
  ingredients: string[];   // plain strings — no further nesting
  method: string[];
};

type IngredientLine = {
  text: string;            // "1 cup Miso Homemade Cream Sauce"
  superfood?: boolean;
  goalTags?: string[];     // LLM-emitted, e.g. ["heart health", "weight"]
  swap?: {
    homemade?: SubRecipe;
    storeBought?: { descriptor: string; criteria: string[] };
  };
};
```

The healthy recipe's `ingredients` becomes `IngredientLine[]` instead of `string[]`. The UI renders the ingredient text and, if `swap` is present, shows the Make Your Miso affordance. Click → expand inline.

System prompt update: tell the model to emit Miso Homemade sub-recipes for any heavy cream / cheese sauce / bone broth substitutions, in the structured shape above.

## Saved recipes — schema change

Boss: "only save the healthy version."

**Decision: drop the original from storage entirely.**

Current: `saved_recipes.payload jsonb` stores the full `ConvertResponse` (original + healthy + nutrition + swaps).

New: `saved_recipes.payload` stores only `{ healthy, nutrition, swaps, subRecipes, servings, healthGoal, vegetarian, superfoods }`. No `original`.

Migration:
- New shape applies to new rows only.
- Existing rows have the old shape — read-side renderer treats `original` as optional and ignores it.
- No backfill needed.

## Nutrition — USDA queued

- Today: AI-estimated, labeled as such ("Recipes are AI-estimated and informational — not medical or dietary advice"). Boss wants "powered by USDA FoodData Central."
- USDA_API_KEY on Vercel currently returns 403 `API_KEY_INVALID`. **Action item: sign up at https://api.data.gov/signup/ and replace.**
- USDA work involves: ingredient string → FDC food lookup (fuzzy match) → quantity parsing ("1 lb", "½ cup", "2 tbsp") → unit-to-gram conversion → per-serving aggregation → caching (FDC rate limit is 1000/hr/key). Not trivial.
- **Decision: queue to next milestone, design response shape now.** Add `nutrition.source: 'estimate' | 'usda'` to the response; only render "Powered by USDA FoodData Central" when `source === 'usda'`. Until then, keep the "AI-estimated" disclaimer.
- Scoped fallback if boss insists USDA ships this milestone: limit to **top 3–5 high-impact ingredients** ("per serving estimates from key ingredients" — boss's exact phrasing).

## Font / visual

Boss: "Can the font be a bit more fun?" Direction: **rounded sans-serif** — friendly, warm, modern, not childish. Candidates: Nunito, Quicksand, DM Sans. I'll trial Nunito and DM Sans side-by-side during Phase 3 and pick based on how it reads in the result-page nutrition grid (the smallest type on the page is the constraint).

## Implementation plan

### Phase 1 — Backend + response shape (no UI changes shipped)
1. Extend `/api/convert` request: accept `healthGoal: string`, `vegetarian: boolean`. Validate goal against the nine options.
2. Update `SYSTEM_PROMPT` to:
   - Read `healthGoal` and prefer swaps that map to it; tag each swap with `goalTags`.
   - Emit Miso Homemade sub-recipes (heavy cream, cheese sauce, bone broth, etc.) as structured sub-recipes, not inline ingredient text.
   - Return `servings: number`.
   - Tag superfood ingredients in `superfoods: string[]`.
   - Per-ingredient `swap.homemade` (sub-recipe) and `swap.storeBought` (named brand).
3. Add `nutrition.source: 'estimate' | 'usda'` field, default `'estimate'`.
4. Bump JSON schema version in the response; client tolerates either shape during rollout.

### Phase 2 — Saved-recipe schema
1. Update `POST /api/recipes` to accept only the healthy payload (`healthy + nutrition + swaps + subRecipes + servings + healthGoal + vegetarian + superfoods`). Drop `original` server-side even if client sends it.
2. Update `app/saved/SavedList.tsx` to render new shape; treat `original` as optional/ignored when reading old rows.
3. No DB migration needed (column is `jsonb`).

### Phase 3 — UI redesign
1. Landing page: three-steps section moves above wizard, new value-prop copy, feature pills, no "AI" language.
2. Wizard step 2: replace vegetarian with health-goal dropdown.
3. Result page: rebuild with vegetarian toggle, Make Your Miso ingredient affordances, superfood add-on button, Miso Homemade sub-recipe inline expansion, superfood tags, goal tags, servings display.
4. Font swap (pending direction).
5. New disclaimer copy: drop AI framing.

### Phase 4 — Superfood add-on
1. Build `lib/superfoods.ts` catalog: superfood → goals → addition + how-to.
2. UI: "Add a superfood" button on result page → modal with goal-filtered dropdown → on pick, append to ingredients and weave into method (or append as new final step).
3. Add `superfoodsAdded: SuperfoodEntry[]` to the saved-recipe payload so they persist.

### Phase 5 — USDA (next milestone)
1. Replace USDA_API_KEY with a valid one.
2. Build ingredient → FDC lookup with caching.
3. Quantity + unit parser.
4. Aggregator.
5. Flip `nutrition.source` to `'usda'`; UI starts rendering "Powered by USDA."

## Decisions (locked, 2026-05-11)

| Question | Decision |
|---|---|
| Vegetarian flow | Post-result toggle; regenerates the healthy version on toggle (counts against 10/hr rate limit). |
| Make Your Miso UX | Homemade vs store-bought picker. Both baked into the original response — no LLM call per swap. |
| Saved recipes | Drop the original from storage. Payload is healthy-only. |
| USDA nutrition | Next milestone. Design `nutrition.source: 'estimate' \| 'usda'` now. (USDA key currently invalid — sign up at api.data.gov.) |
| Vegetarian toggle cost | Regenerate on toggle. Not pre-baked. |
| Superfood mechanic | Curated catalog in `lib/superfoods.ts`. No LLM call. |
| Store-bought brands | Generic descriptors only — no brand names. Avoids fabrication + maintenance. |
| Goal-tagging | LLM tags swaps with `goalTags` in the response. No deterministic mapping in code. |
| Sub-recipe nesting | Single level only. Sub-recipes' ingredients are leaves. |
| Font direction | Rounded sans-serif. Trial Nunito + DM Sans in Phase 3. |

## Out of scope (for this redesign)

- Authentication changes (Google-only is fine).
- Mobile-specific UI work.
- Image generation for recipes.
- Print / PDF export.
- Sharing / public recipe links.
- Recipe ratings / feedback.

## Status

- F-1, F-2, F-3, F-5 from the 2026-05-10 security audit: closed in production.
- Pending uncommitted work: `app/components/Flow.tsx`, `app/components/HeartButton.tsx`, `lib/pendingSave.ts` (pre-existing in-progress feature, not part of this redesign).

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import NavAuth from "./NavAuth";
import HeartButton from "./HeartButton";
import { SuperfoodsSection } from "./FoodIllustrations";
import { clearPendingSave, readPendingSave } from "@/lib/pendingSave";
import {
  HEALTH_GOALS,
  type ConvertResponse,
  type HealthGoal,
  type HealthyRecipe,
  type IngredientLine,
  type SubRecipe,
} from "@/lib/types";
import {
  SUPERFOODS,
  applySuperfood,
  findSuperfood,
} from "@/lib/superfoods";

// useLayoutEffect runs after DOM commit but before browser paint — perfect for
// reading localStorage and restoring state without a visible flash. Fall back
// to useEffect on the server to avoid React's SSR warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Section = "make" | "bake";

type FormData = {
  dish: string;
  healthGoals: HealthGoal[];
};

type Phase =
  | { kind: "step"; index: 0 | 1 }
  | { kind: "cooking" }
  | {
      kind: "summary";
      data: ConvertResponse;
      vegetarian: boolean;
      addedSuperfoodIds: string[];
    }
  | { kind: "error"; message: string };

const TOTAL_STEPS = 2;

const COOKING_LINES = [
  "finding the classic version…",
  "thinking about the swaps…",
  "balancing the nutrition…",
  "writing it down for you…",
];

type FlowUser = { id: string; email: string | null } | null;

export default function Flow({
  user,
  authEnabled,
}: {
  user: FlowUser;
  authEnabled: boolean;
}) {
  const [section, setSection] = useState<Section>("make");
  const [phase, setPhase] = useState<Phase>({ kind: "step", index: 0 });
  const [data, setData] = useState<FormData>({ dish: "", healthGoals: [] });
  const [autoSavePending, setAutoSavePending] = useState(false);

  useIsoLayoutEffect(() => {
    const pending = readPendingSave();
    if (!pending) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setData({ dish: pending.dish, healthGoals: pending.healthGoals });
    setPhase({
      kind: "summary",
      data: pending.payload as ConvertResponse,
      vegetarian: pending.vegetarian,
      addedSuperfoodIds: [],
    });
    if (user) {
      setAutoSavePending(true);
      clearPendingSave();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // Keep storage if not signed in so the next sign-in still picks it up.
  }, [user]);

  function goNext() {
    if (phase.kind !== "step") return;
    if (phase.index < TOTAL_STEPS - 1) {
      setPhase({ kind: "step", index: (phase.index + 1) as 0 | 1 });
    }
    // step 1 (dish) submits on its own via onSubmit.
  }

  function goBack() {
    if (phase.kind === "summary" || phase.kind === "error") {
      setPhase({ kind: "step", index: 1 });
      return;
    }
    if (phase.kind !== "step" || phase.index === 0) return;
    setPhase({ kind: "step", index: (phase.index - 1) as 0 | 1 });
  }

  function restart() {
    setData({ dish: "", healthGoals: [] });
    setPhase({ kind: "step", index: 0 });
    setAutoSavePending(false);
    clearPendingSave();
  }

  async function generate(goals: HealthGoal[], vegetarian: boolean) {
    setPhase({ kind: "cooking" });
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish: data.dish.trim(),
          healthGoals: goals,
          vegetarian,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      setPhase({
        kind: "summary",
        data: json,
        vegetarian,
        addedSuperfoodIds: [],
      });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  function chooseGoals(goals: HealthGoal[]) {
    setData((d) => ({ ...d, healthGoals: goals }));
    goNext();
  }

  function submit() {
    void generate(data.healthGoals, false);
  }

  function regenerateWithVegetarian(nextVeg: boolean) {
    if (data.healthGoals.length === 0) return;
    void generate(data.healthGoals, nextVeg);
  }

  function addSuperfood(id: string) {
    setPhase((p) => {
      if (p.kind !== "summary") return p;
      const entry = findSuperfood(id);
      if (!entry) return p;
      if (p.addedSuperfoodIds.includes(id)) return p;
      return {
        ...p,
        data: { ...p.data, healthy: applySuperfood(p.data.healthy, entry) },
        addedSuperfoodIds: [...p.addedSuperfoodIds, id],
      };
    });
  }

  const canAdvance = (() => {
    if (phase.kind !== "step") return false;
    if (phase.index === 0) return data.healthGoals.length > 0;
    return false; // step 1 (dish) submits itself
  })();

  return (
    <div className={`scene${section === "bake" ? " scene--bake" : ""}`}>
      <nav className="nav">
        <button
          type="button"
          className="nav-logo"
          onClick={restart}
          aria-label="back to start"
        >
          <span className="nav-logo-text">
            <span className="nav-logo-miso">miso</span>{" "}
            <span className="nav-logo-healthy">healthy</span>
          </span>
          <svg
            className="nav-logo-steam"
            viewBox="0 0 14 18"
            fill="none"
            aria-hidden
          >
            <path
              d="M 7 16 Q 4 12 8 8 Q 12 4 8 0"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {authEnabled && <NavAuth user={user} />}
      </nav>

      <SectionTabs active={section} onChange={setSection} />

      {section === "bake" ? (
        <BakeItMiso />
      ) : (
      <>

      {phase.kind === "step" && (
        <>
          {phase.index === 0 && <Hero />}
          {phase.index === 0 && <ThreeStepsSection />}
          {phase.index === 0 && <SuperfoodsSection />}
          <main className="stage">
            {phase.index === 0 && (
              <HealthGoalStep
                value={data.healthGoals}
                onSubmit={chooseGoals}
              />
            )}
            {phase.index === 1 && (
              <DishStep
                value={data.dish}
                onChange={(dish) => setData((d) => ({ ...d, dish }))}
                onSubmit={submit}
                onBack={goBack}
                canAdvance={data.dish.trim().length > 0}
              />
            )}
          </main>
        </>
      )}

      {phase.kind === "cooking" && (
        <main className="stage">
          <Cooking dish={data.dish} />
        </main>
      )}

      {phase.kind === "error" && (
        <main className="stage">
          <div className="error-card">
            <div className="error-card-title">that didn&apos;t work.</div>
            <div className="error-card-desc">{phase.message}</div>
            <div className="step-actions" style={{ marginTop: 8 }}>
              <button className="btn-ghost" onClick={restart}>
                start over
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  data.healthGoals.length > 0 &&
                  void generate(data.healthGoals, false)
                }
              >
                try again
              </button>
            </div>
          </div>
        </main>
      )}

      {phase.kind === "summary" && data.healthGoals.length > 0 && (
        <Summary
          result={phase.data}
          vegetarian={phase.vegetarian}
          healthGoals={data.healthGoals}
          dish={data.dish}
          addedSuperfoodIds={phase.addedSuperfoodIds}
          user={user}
          authEnabled={authEnabled}
          autoSaveOnMount={autoSavePending}
          onToggleVegetarian={regenerateWithVegetarian}
          onAddSuperfood={addSuperfood}
          onRestart={restart}
        />
      )}

      </>
      )}
    </div>
  );
}

/* ─────────── section tabs ─────────── */

function SectionTabs({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="section-tabs">
      <button
        type="button"
        className={`section-tab${active === "make" ? " is-active" : ""}`}
        onClick={() => onChange("make")}
      >
        make it miso
      </button>
      <button
        type="button"
        className={`section-tab section-tab--bake${active === "bake" ? " is-active" : ""}`}
        onClick={() => onChange("bake")}
      >
        bake it miso
      </button>
    </div>
  );
}

function BakeItMiso() {
  const healthyIngredients: IngredientLine[] = [
    {
      text: "1 large very ripe banana, ~150g peeled — cooked down to 85g concentrate",
      superfood: true,
      goalTags: ["brain health"],
    },
    { text: "115g butter, browned" },
    {
      text: "32g white miso",
      superfood: true,
      goalTags: ["gut health"],
      swap: {
        storeBought: {
          descriptor: "White or yellow miso paste",
          criteria: [
            "refrigerated — unpasteurized where possible",
            "no added sugar, MSG, or preservatives",
            "white (shiro) miso for mildest flavor in baking",
          ],
        },
      },
    },
    {
      text: "100g coconut sugar",
      goalTags: ["gut health"],
    },
    {
      text: "60g maple sugar",
      swap: {
        storeBought: {
          descriptor: "Granulated maple sugar",
          criteria: [
            "100% pure maple sugar — no fillers or anti-caking agents",
            "granulated (not syrup) so it behaves like white sugar in dough",
          ],
        },
      },
    },
    { text: "1 large egg yolk", goalTags: ["brain health"] },
    { text: "½ tsp vanilla extract" },
    { text: "85g cooked banana concentrate, cooled" },
    { text: "135g all-purpose flour" },
    {
      text: "45g oat flour",
      superfood: true,
      goalTags: ["heart health", "gut health"],
      swap: {
        storeBought: {
          descriptor: "Whole grain oat flour",
          criteria: [
            "100% whole grain rolled oats ground to flour",
            "no added starch, fillers, or bleaching agents",
            "certified gluten-free if needed",
          ],
        },
      },
    },
    { text: "½ tsp baking soda" },
    { text: "4 tbsp turbinado sugar, for rolling — all turbinado, no granulated" },
  ];

  const healthyMethod = [
    "Mash banana in a small pan. Skip the optional sugar — a very ripe banana caramelizes on its own. Cook over medium heat, stirring often, until thick and jammy, about 85g. Cool completely.",
    "Brown the butter until it foams, smells nutty, and milk solids turn golden. Scrape into a bowl with the browned bits. Cool 10 minutes.",
    "Whisk miso into warm butter until smooth. Add coconut sugar, maple sugar, and 1 tsp water. Whisk 30–60 seconds. Add egg yolk, vanilla, and banana concentrate. Whisk until smooth and glossy.",
    "Add the AP flour, oat flour, and baking soda. Fold gently until no dry flour remains. The oat flour makes the dough slightly denser — this is normal. Do not overmix.",
    "Cover and chill at least 1 hour. For best flavor and texture, chill 4–24 hours. If overnight, rest at room temperature 10–15 min before scooping.",
    "Heat oven to 350°F / 175°C. Scoop into 40–45g balls. Roll generously in turbinado sugar. Place a few inches apart on a parchment-lined metal baking sheet.",
    "Bake 7–8 min until puffed and edges begin to set. Remove and give the pan one firm slam on the counter to collapse the centers. Return 2–4 min until edges are golden and centers still look slightly soft. One more gentle tap if domed. Cool on pan 10 minutes.",
  ];

  const bakeSwaps = [
    {
      from: "60g granulated sugar (in dough)",
      to: "60g maple sugar",
      why: "Same granular texture, dissolves identically in dough — virtually no texture change. Slightly lower glycemic index, trace minerals. The swap that costs nothing.",
    },
    {
      from: "45g all-purpose flour",
      to: "45g oat flour (keep 135g AP flour)",
      why: "Beta-glucan in oat flour holds moisture during baking, enhancing the chewy center while edges still crisp from butter and sugar. Adds soluble fiber without changing flavor.",
    },
    {
      from: "2 tbsp granulated sugar (rolling)",
      to: "all turbinado for rolling (4 tbsp total)",
      why: "Coarser turbinado crystals create a crunchier, more pronounced outer crust. This swap actually improves the crispy edge — it's an upgrade.",
    },
    {
      from: "1 tsp granulated sugar in banana concentrate (optional)",
      to: "skip it",
      why: "A very ripe banana has enough natural sugars to caramelize in the pan. The teaspoon doesn't earn its place.",
    },
  ];

  const bakeNutrition = [
    { label: "Calories", original: "~180 kcal", healthy: "~102 kcal" },
    { label: "Protein", original: "~2g", healthy: "~1g" },
    { label: "Fiber", original: "~0.5g", healthy: "~0.5g" },
    { label: "Saturated fat", original: "~6g", healthy: "~2.5g" },
    { label: "Added sugar", original: "~14g", healthy: "~8g" },
    { label: "Sodium", original: "~85mg", healthy: "~8mg" },
  ];

  return (
    <main className="stage stage-summary">
      <div className="summary">
        {/* coming soon header */}
        <div className="bake-hero">
          <p className="coming-soon-eyebrow">coming soon</p>
          <h1 className="coming-soon-title">
            bake it
            <br />
            <span className="coming-soon-miso">miso.</span>
          </h1>
          <p className="coming-soon-sub">
            Healthy baking is on its way. Real flour swaps, smarter sweeteners,
            and techniques that make your baked goods and desserts tasting
            delicious and working a little better for you.
          </p>
        </div>

        {/* recipe preview */}
        <div className="bake-recipe-intro">
          <p className="bake-recipe-intro-text">
            Thank you for waiting. Here&rsquo;s a recipe for my Banana Miso Cookies.
          </p>
        </div>

        <div className="summary-head">
          <div>
            <h1 className="summary-title">banana miso cookies</h1>
            <div className="summary-tags">
              <span className="summary-tag summary-tag-goal">gut health</span>
              <span className="summary-tag summary-tag-goal">brain health</span>
              <span className="summary-tag summary-tag-goal">heart health</span>
              <span className="summary-tag">makes ~24 cookies</span>
              <span className="summary-tag">crispy edges · chewy middle</span>
            </div>
          </div>
          <div className="bake-recipe-illo">
            <BananaMisoCookieSvg />
          </div>
        </div>

        <div className="summary-grid">
          <BakeOriginalCard />
          <div className="recipe-card is-healthy">
            <p className="recipe-card-label">bake it miso</p>
            <h2 className="recipe-card-title">Banana Miso Cookies</h2>
            <p className="recipe-card-servings">makes ~24 cookies</p>

            <h4>banana concentrate</h4>
            <ul className="ingredient-list">
              <IngredientRow ing={healthyIngredients[0]} />
            </ul>

            <h4>cookie dough</h4>
            <ul className="ingredient-list">
              {healthyIngredients.slice(1, 11).map((ing, i) => (
                <IngredientRow key={i} ing={ing} />
              ))}
            </ul>

            <h4>for rolling</h4>
            <ul className="ingredient-list">
              <IngredientRow ing={healthyIngredients[11]} />
            </ul>

            <h4>method</h4>
            <ol>
              {healthyMethod.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="swaps-card">
          <h4>Make it Miso</h4>
          <div className="swap-list">
            {bakeSwaps.map((s, i) => (
              <div key={i} className="swap-item">
                <div className="swap-from">{s.from}</div>
                <div className="swap-to">→ {s.to}</div>
                <div className="swap-why">{s.why}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="nutrition-card">
          <div className="nutrition-heading">
            <h4>nutrition per cookie (1 of 24) · classic snickerdoodle vs. bake it miso</h4>
            <span className="usda-badge">Powered by USDA</span>
          </div>
          <div className="nutrition-grid">
            {bakeNutrition.map((row) => (
              <div key={row.label} className="nutrition-cell">
                <div className="nutrition-cell-label">{row.label}</div>
                <div className="nutrition-cell-values">
                  <span className="v is-original">{row.original}</span>
                  <span className="nutrition-arrow">→</span>
                  <span className="v">{row.healthy}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="nutrition-source">
            Classic snickerdoodle values: USDA FoodData Central · Bake it Miso values: estimated based on ingredients · per 40g cookie, 24 per batch
          </p>
        </div>

        <p className="disclaimer">
          Recipes are informational — not medical or dietary advice.
        </p>
        <div className="summary-foot">
          <span className="bake-more-note">more bake it miso recipes coming soon.</span>
        </div>
      </div>
    </main>
  );
}

function BakeOriginalCard() {
  return (
    <div className="recipe-card is-original">
      <p className="recipe-card-label">classic snickerdoodle</p>
      <h2 className="recipe-card-title">Classic Snickerdoodle Cookies</h2>
      <p className="recipe-card-servings">makes ~24 cookies</p>

      <h4>cookie dough</h4>
      <ul>
        <li>2¾ cups (345g) all-purpose flour</li>
        <li>2 tsp cream of tartar</li>
        <li>1 tsp baking soda</li>
        <li>¼ tsp salt</li>
        <li>1 cup (225g) unsalted butter, softened</li>
        <li>1½ cups (300g) white granulated sugar</li>
        <li>2 large eggs</li>
        <li>1 tsp vanilla extract</li>
      </ul>

      <h4>for rolling</h4>
      <ul>
        <li>3 tbsp white granulated sugar</li>
        <li>1½ tsp ground cinnamon</li>
      </ul>

      <h4>method</h4>
      <ol>
        <li>Preheat oven to 375°F. Whisk together flour, cream of tartar, baking soda, and salt.</li>
        <li>Beat butter and sugar with a mixer until very light and fluffy, 3–4 minutes.</li>
        <li>Beat in eggs one at a time, then vanilla, until smooth and combined.</li>
        <li>Add flour mixture and mix on low until just combined. Do not overmix.</li>
        <li>Stir together rolling sugar and cinnamon in a small bowl.</li>
        <li>Roll dough into balls (~40g each), coat generously in cinnamon-sugar. Place 2 inches apart on an ungreased baking sheet.</li>
        <li>Bake 10–12 minutes until edges are just set and centers look barely done. Cool on pan 5 minutes.</li>
      </ol>
    </div>
  );
}

function BananaMisoCookieSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* warm cream disc background */}
      <circle cx="50" cy="50" r="46" fill="#fdf0d0" />

      {/* ── cake stand base ── */}
      <ellipse cx="50" cy="92" rx="20" ry="4" fill="#d4b060" opacity="0.30" />
      <ellipse cx="50" cy="90" rx="18" ry="4" fill="#f2e4c0" stroke="#c09050" strokeWidth="1" />
      <ellipse cx="47" cy="89" rx="9" ry="1.8" fill="white" opacity="0.45" />

      {/* stem */}
      <path d="M 47 79 L 46 90 L 54 90 L 53 79 Z" fill="#eedad8" stroke="#c09050" strokeWidth="0.8" />
      <path d="M 48.5 80 L 48 89" stroke="white" strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />

      {/* plate underside */}
      <ellipse cx="50" cy="80" rx="30" ry="7" fill="#c09050" opacity="0.40" />
      {/* plate top */}
      <ellipse cx="50" cy="79" rx="30" ry="7" fill="#f2e4c0" stroke="#c09050" strokeWidth="1" />
      <ellipse cx="47" cy="77.5" rx="17" ry="3.2" fill="white" opacity="0.38" />

      {/* ── cookie 1 — bottom of pile ── */}
      <ellipse cx="51" cy="77" rx="20" ry="6" fill="#8b4e10" opacity="0.65" />
      <ellipse cx="51" cy="74" rx="20" ry="6" fill="#c57828" stroke="#7a3e08" strokeWidth="1" />
      <ellipse cx="51" cy="74" rx="13" ry="4" fill="#d88c38" />
      <ellipse cx="51" cy="74" rx="7.5" ry="2.5" fill="#e8a84c" opacity="0.82" />
      <circle cx="46" cy="73" r="1.4" fill="#7a3a08" opacity="0.48" />
      <circle cx="56" cy="75" r="1.1" fill="#7a3a08" opacity="0.42" />

      {/* ── cookie 2 — middle ── */}
      <ellipse cx="49" cy="69" rx="21" ry="6.5" fill="#8b4e10" opacity="0.65" />
      <ellipse cx="49" cy="66" rx="21" ry="6.5" fill="#c87828" stroke="#7a3e08" strokeWidth="1" />
      <ellipse cx="49" cy="66" rx="14" ry="4.5" fill="#da8e3c" />
      <ellipse cx="49" cy="66" rx="8" ry="2.8" fill="#eba84c" opacity="0.82" />
      <circle cx="54" cy="65" r="1.3" fill="#7a3a08" opacity="0.48" />
      <circle cx="44" cy="67" r="1.0" fill="#7a3a08" opacity="0.42" />
      {/* sparkle on rim */}
      <circle cx="34" cy="66" r="1.1" fill="#f8d880" opacity="0.78" />
      <circle cx="65" cy="64" r="1.0" fill="#f8d880" opacity="0.72" />

      {/* ── cookie 3 — top of pile, most detail ── */}
      <ellipse cx="51" cy="61" rx="22" ry="7" fill="#8b4e10" opacity="0.65" />
      <ellipse cx="51" cy="58" rx="22" ry="7" fill="#c87828" stroke="#7a3e08" strokeWidth="1.2" />
      <ellipse cx="51" cy="58" rx="15" ry="5" fill="#d98b38" />
      <ellipse cx="51" cy="58" rx="9" ry="3.2" fill="#eba84c" opacity="0.85" />
      <ellipse cx="49.5" cy="57.5" rx="5" ry="1.8" fill="#f2b85a" opacity="0.65" />
      {/* turbinado sparkle on top cookie rim */}
      <circle cx="34" cy="57" r="1.2" fill="#f8d880" opacity="0.85" />
      <circle cx="39" cy="52" r="1.0" fill="#f8d880" opacity="0.78" />
      <circle cx="51" cy="51" r="1.1" fill="#f8d880" opacity="0.80" />
      <circle cx="62" cy="53" r="1.0" fill="#f8d880" opacity="0.75" />
      <circle cx="67" cy="58" r="1.2" fill="#f8d880" opacity="0.85" />
      {/* miso + banana flecks */}
      <circle cx="46" cy="56" r="1.7" fill="#7a3a08" opacity="0.52" />
      <circle cx="55" cy="59" r="1.3" fill="#8b4a10" opacity="0.46" />
      <circle cx="50" cy="61" r="1.4" fill="#7a3a08" opacity="0.44" />
      {/* crackle lines */}
      <path d="M 51 58 Q 54 54 56 50" stroke="#7a4010" strokeWidth="0.8" opacity="0.28" fill="none" strokeLinecap="round" />
      <path d="M 51 58 Q 57 59 63 61" stroke="#7a4010" strokeWidth="0.8" opacity="0.28" fill="none" strokeLinecap="round" />
      <path d="M 51 58 Q 45 60 40 63" stroke="#7a4010" strokeWidth="0.8" opacity="0.28" fill="none" strokeLinecap="round" />
      {/* gloss shine */}
      <path d="M 36 56 Q 34 59 35 63" stroke="#f5c060" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.32" />

      {/* ── small cookies leaning against the pile ── */}
      {/* leaning cookie left */}
      <ellipse cx="28" cy="72" rx="10" ry="3.5" fill="#8b4e10" opacity="0.55" transform="rotate(-30 28 72)" />
      <ellipse cx="28" cy="70" rx="10" ry="3.5" fill="#c87828" stroke="#7a3e08" strokeWidth="0.9" transform="rotate(-30 28 70)" />
      <ellipse cx="28" cy="70" rx="6.5" ry="2.3" fill="#da8e3c" transform="rotate(-30 28 70)" />
      <ellipse cx="28" cy="70" rx="3.5" ry="1.4" fill="#eba84c" opacity="0.78" transform="rotate(-30 28 70)" />
      {/* leaning cookie right */}
      <ellipse cx="73" cy="73" rx="10" ry="3.5" fill="#8b4e10" opacity="0.55" transform="rotate(28 73 73)" />
      <ellipse cx="73" cy="71" rx="10" ry="3.5" fill="#c87828" stroke="#7a3e08" strokeWidth="0.9" transform="rotate(28 73 71)" />
      <ellipse cx="73" cy="71" rx="6.5" ry="2.3" fill="#da8e3c" transform="rotate(28 73 71)" />
      <ellipse cx="73" cy="71" rx="3.5" ry="1.4" fill="#eba84c" opacity="0.78" transform="rotate(28 73 71)" />
    </svg>
  );
}

/* ─────────── hero / three steps ─────────── */

const TICKER_FOODS = [
  { label: "beef stroganoff", color: "var(--terracotta)" },
  { label: "chicken tikka masala", color: "var(--amber)" },
  { label: "avocado toast", color: "var(--sage)" },
  { label: "pad thai", color: "var(--terracotta)" },
  { label: "mac & cheese", color: "var(--amber)" },
  { label: "nachos", color: "var(--sage)" },
  { label: "ramen", color: "var(--terracotta)" },
  { label: "pasta carbonara", color: "var(--amber)" },
  { label: "fried rice", color: "var(--sage)" },
  { label: "pizza", color: "var(--terracotta)" },
  { label: "fish & chips", color: "var(--amber)" },
  { label: "burritos", color: "var(--sage)" },
  { label: "butter chicken", color: "var(--terracotta)" },
  { label: "cheeseburger", color: "var(--amber)" },
  { label: "bibimbap", color: "var(--sage)" },
];

function Hero() {
  const doubled = [...TICKER_FOODS, ...TICKER_FOODS];
  return (
    <section className="hero">
      <h1 className="hero-display">
        make it
        <br />
        <span className="hl-green">miso</span>.
      </h1>
      <p className="hero-sub">
        Eating the right foods can prevent, manage, and even reverse disease —
        and the science backs it up. Miso has been a healing superfood for
        thousands of years — proof that food is medicine. misohealthy is here
        to help you <strong>make it miso</strong>: find simple swaps that keep
        the flavors you love while making every meal work for your body.
      </p>
      <div className="ticker-wrap">
        <div className="ticker-track">
          {doubled.map((food, i) => (
            <span key={i} className="ticker-item">
              <span
                className="ticker-dot"
                style={{ background: food.color }}
              />
              {food.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreeStepsSection() {
  return (
    <div className="step-cards">
      <div className="step-card c-teal">
        <div className="step-card-num">01</div>
        <h3 className="step-card-title">Set your health goals</h3>
        <p className="step-card-desc">
          Heart health, brain health, cancer prevention, pre-diabetes — pick
          what matters to you.
        </p>
      </div>
      <div className="step-card c-green">
        <div className="step-card-num">02</div>
        <h3 className="step-card-title">Tell us what you&apos;re craving</h3>
        <p className="step-card-desc">
          Type any dish — beef stroganoff, ramen, pasta carbonara. We know them
          all.
        </p>
      </div>
      <div className="step-card c-red">
        <div className="step-card-num">03</div>
        <h3 className="step-card-title">Get your healthier recipe</h3>
        <p className="step-card-desc">
          Healthier swaps tailored to your goals. Make it vegetarian, add a
          superfood, or tap &ldquo;make it miso&rdquo; to get a homemade
          recipe for any specialty ingredient.
        </p>
      </div>
      <div className="step-card c-violet">
        <div className="step-card-num">04</div>
        <h3 className="step-card-title">See how food makes a difference</h3>
        <p className="step-card-desc">
          Side-by-side nutrition, % of daily values met, and exactly how each
          swap targets your health goals.
        </p>
      </div>
    </div>
  );
}

/* ─────────── steps ─────────── */

function DishStep({
  value,
  onChange,
  onSubmit,
  onBack,
  canAdvance,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  canAdvance: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <form
      className="step"
      onSubmit={(e) => {
        e.preventDefault();
        if (canAdvance) onSubmit();
      }}
    >
      <h2 className="step-title">what are you craving?</h2>
      <input
        ref={inputRef}
        className="step-input"
        placeholder="type a dish…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        autoComplete="off"
      />
      <div className="step-actions">
        <button type="button" className="btn-ghost" onClick={onBack}>
          back
        </button>
        <button type="submit" className="btn-primary" disabled={!canAdvance}>
          cook it <Arrow />
        </button>
      </div>
      <div className="hint">
        press <kbd>enter</kbd> to cook it
      </div>
    </form>
  );
}

function HealthGoalStep({
  value,
  onSubmit,
}: {
  value: HealthGoal[];
  onSubmit: (g: HealthGoal[]) => void;
}) {
  const [selected, setSelected] = useState<HealthGoal[]>(value);

  function toggle(g: HealthGoal) {
    setSelected((curr) =>
      curr.includes(g) ? curr.filter((x) => x !== g) : [...curr, g],
    );
  }

  return (
    <div className="step">
      <h2 className="step-title">what are your health goals?</h2>
      <p className="step-sub">
        Pick one or more. We&apos;ll tailor every swap to what matters to you.
      </p>
      <div className="chips chips-grid">
        {HEALTH_GOALS.map((g) => (
          <button
            key={g}
            type="button"
            className={`chip${selected.includes(g) ? " is-selected" : ""}`}
            onClick={() => toggle(g)}
            aria-pressed={selected.includes(g)}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="step-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={selected.length === 0}
          onClick={() => onSubmit(selected)}
        >
          continue <Arrow />
        </button>
      </div>
      <div className="hint">
        {selected.length === 0
          ? "pick one or more"
          : `${selected.length} selected — tap "continue" when ready`}
      </div>
    </div>
  );
}

/* ─────────── cooking ─────────── */

function Cooking({ dish }: { dish: string }) {
  const [lineIndex, setLineIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % COOKING_LINES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="cooking">
      <SteamingPot />
      <div className="cooking-line">{COOKING_LINES[lineIndex]}</div>
      <div className="cooking-sub">cooking up your {dish.toLowerCase()}</div>
    </div>
  );
}

function SteamingPot() {
  return (
    <svg
      className="cooking-svg"
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g
        stroke="currentColor"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      >
        <g className="wisp wisp-1">
          <path d="M 30 60 Q 26 50 32 42 Q 38 34 32 24" />
        </g>
        <g className="wisp wisp-2">
          <path d="M 50 60 Q 46 50 52 42 Q 58 34 52 24" />
        </g>
        <g className="wisp wisp-3">
          <path d="M 70 60 Q 66 50 72 42 Q 78 34 72 24" />
        </g>
      </g>
      <ellipse
        className="pot-glow"
        cx="50"
        cy="98"
        rx="34"
        ry="6"
        fill="currentColor"
      />
      <path
        d="M 16 76 Q 8 76 8 82"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 84 76 Q 92 76 92 82"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 16 70 L 20 92 Q 20 98 26 98 L 74 98 Q 80 98 80 92 L 84 70 Z"
        fill="rgba(255, 253, 245, 0.7)"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <line
        x1="22"
        y1="73"
        x2="78"
        y2="73"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.4"
      />
    </svg>
  );
}

/* ─────────── summary ─────────── */

function Summary({
  result,
  vegetarian,
  healthGoals,
  dish,
  addedSuperfoodIds,
  user,
  authEnabled,
  autoSaveOnMount,
  onToggleVegetarian,
  onAddSuperfood,
  onRestart,
}: {
  result: ConvertResponse;
  vegetarian: boolean;
  healthGoals: HealthGoal[];
  dish: string;
  addedSuperfoodIds: string[];
  user: FlowUser;
  authEnabled: boolean;
  autoSaveOnMount?: boolean;
  onToggleVegetarian: (next: boolean) => void;
  onAddSuperfood: (id: string) => void;
  onRestart: () => void;
}) {
  const [superfoodModalOpen, setSuperfoodModalOpen] = useState(false);

  // Persisted payload: healthy-only (drop the original from saved storage).
  const savedPayload = {
    healthy: result.healthy,
    nutrition: result.nutrition,
    nutritionMeta: result.nutritionMeta,
    swaps: result.swaps,
  };

  return (
    <main className="stage stage-summary">
      <div className="summary">
        <div className="summary-head">
          <div>
            <h1 className="summary-title">{result.healthy.title}</h1>
            <div className="summary-tags">
              {healthGoals.map((g) => (
                <span key={g} className="summary-tag summary-tag-goal">
                  {g}
                </span>
              ))}
              {vegetarian && (
                <span className="summary-tag">vegetarian</span>
              )}
              {result.healthy.servings != null && (
                <span className="summary-tag">
                  serves {result.healthy.servings}
                </span>
              )}
            </div>
          </div>
          {authEnabled && (
            <HeartButton
              dish={dish}
              vegetarian={vegetarian}
              healthGoals={healthGoals}
              payload={savedPayload}
              signedIn={!!user}
              autoSaveOnMount={autoSaveOnMount}
            />
          )}
        </div>

        <div className="summary-controls">
          <button
            type="button"
            className={`toggle-pill${vegetarian ? " is-on" : ""}`}
            onClick={() => onToggleVegetarian(!vegetarian)}
            title="re-cook the healthy version with no meat, poultry, or seafood"
          >
            <span className="toggle-pill-dot" />
            {vegetarian ? "vegetarian" : "make it vegetarian"}
          </button>
          <button
            type="button"
            className="add-superfood-btn"
            onClick={() => setSuperfoodModalOpen(true)}
          >
            + add a superfood
          </button>
        </div>

        <div className="summary-grid">
          <OriginalCard recipe={result.original} />
          <HealthyCard recipe={result.healthy} />
        </div>

        {result.swaps?.length > 0 && (
          <div className="swaps-card">
            <h4>Make it Miso</h4>
            <div className="swap-list">
              {result.swaps.map((s, i) => (
                <div key={i} className="swap-item">
                  <div className="swap-from">{s.from}</div>
                  <div className="swap-to">→ {s.to}</div>
                  <div className="swap-why">{s.why}</div>
                  {s.goalTags && s.goalTags.length > 0 && (
                    <div className="swap-tags">
                      {s.goalTags.map((g) => (
                        <span key={g} className="goal-pill">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {result.nutrition?.length > 0 && (
          <div className="nutrition-card">
            <div className="nutrition-heading">
              <h4>nutrition per serving</h4>
              <span className="usda-badge">
                {result.nutritionMeta?.source === "usda" || result.nutritionMeta?.source === "usda-partial"
                  ? "Powered by USDA"
                  : "USDA values used where possible"}
              </span>
            </div>
            <div className="nutrition-grid">
              {result.nutrition.map((row) => (
                <div key={row.label} className="nutrition-cell">
                  <div className="nutrition-cell-label">{row.label}</div>
                  <div className="nutrition-cell-values">
                    <span className="v is-original">{row.original}</span>
                    <span className="nutrition-arrow">→</span>
                    <span className="v">{row.healthy}</span>
                  </div>
                  {row.healthyDV && (
                    <div className="nutrition-dv-wrap">
                      <div className="nutrition-dv-bar">
                        <div
                          className="nutrition-dv-fill"
                          style={{ width: `${Math.min(parseFloat(row.healthyDV) || 0, 100)}%` }}
                        />
                      </div>
                      <div className="nutrition-dv">{row.healthyDV} DV</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="nutrition-source">
              {result.nutritionMeta?.source === "usda-partial"
                ? "Original recipe values: USDA FoodData Central · Healthy version: estimated based on ingredients · % daily values per FDA guidelines"
                : "Values estimated based on ingredients · % daily values per FDA / USDA guidelines"}
            </p>
          </div>
        )}

        <p className="disclaimer">
          Recipes are informational — not medical or dietary advice.
        </p>

        <div className="summary-foot">
          <button type="button" className="btn-ghost" onClick={onRestart}>
            try another dish
          </button>
        </div>
      </div>

      {superfoodModalOpen && (
        <SuperfoodModal
          healthGoals={healthGoals}
          addedIds={addedSuperfoodIds}
          onPick={(id) => {
            onAddSuperfood(id);
            setSuperfoodModalOpen(false);
          }}
          onClose={() => setSuperfoodModalOpen(false)}
        />
      )}
    </main>
  );
}

function OriginalCard({
  recipe,
}: {
  recipe: ConvertResponse["original"];
}) {
  return (
    <div className="recipe-card is-original">
      <p className="recipe-card-label">original</p>
      <h2 className="recipe-card-title">{recipe.title}</h2>
      {recipe.servings != null && (
        <p className="recipe-card-servings">serves {recipe.servings}</p>
      )}
      <h4>ingredients</h4>
      <ul>
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>{ing}</li>
        ))}
      </ul>
      <h4>method</h4>
      <ol>
        {recipe.method.map((step, i) => (
          <li key={i}>{step.replace(/^\s*\d+[.)]\s*/, "")}</li>
        ))}
      </ol>
    </div>
  );
}

function HealthyCard({ recipe }: { recipe: HealthyRecipe }) {
  return (
    <div className="recipe-card is-healthy">
      <p className="recipe-card-label">miso healthy version</p>
      <h2 className="recipe-card-title">{recipe.title}</h2>
      {recipe.servings != null && (
        <p className="recipe-card-servings">serves {recipe.servings}</p>
      )}
      <h4>ingredients</h4>
      <ul className="ingredient-list">
        {recipe.ingredients.map((ing, i) => (
          <IngredientRow key={i} ing={ing} />
        ))}
      </ul>
      <h4>method</h4>
      <ol>
        {recipe.method.map((step, i) => (
          <li key={i}>{step.replace(/^\s*\d+[.)]\s*/, "")}</li>
        ))}
      </ol>
    </div>
  );
}

function IngredientRow({ ing }: { ing: IngredientLine }) {
  const [expanded, setExpanded] = useState(false);
  const hasSwap = !!(ing.swap?.homemade || ing.swap?.storeBought);
  return (
    <li className={`ing-row${ing.superfood ? " is-superfood" : ""}`}>
      <div className="ing-row-head">
        <span className="ing-row-text">{ing.text}</span>
        <div className="ing-row-pills">
          {ing.superfood && (
            <span className="ing-pill ing-pill-superfood">superfood</span>
          )}
          {ing.goalTags?.map((g) => (
            <span key={g} className="ing-pill ing-pill-goal">
              {g}
            </span>
          ))}
          {hasSwap && (
            <button
              type="button"
              className="make-your-miso-btn"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
            >
              {expanded ? "close" : "make it miso"}
            </button>
          )}
        </div>
      </div>
      {ing.nutrients && ing.nutrients.length > 0 && (
        <div className="ing-nutrients">
          {ing.nutrients.map((n) => (
            <span key={n.label} className="ing-nutrient">
              <span className="ing-nutrient-label">{n.label}</span>
              <span className="ing-nutrient-bar">
                <span className="ing-nutrient-fill" style={{ width: n.pct }} />
              </span>
              <span className="ing-nutrient-pct">{n.pct} DV</span>
            </span>
          ))}
        </div>
      )}
      {expanded && hasSwap && (
        <div className="swap-options">
          {ing.swap?.homemade && <SubRecipeBlock sub={ing.swap.homemade} />}
          {ing.swap?.storeBought && (
            <div className="store-bought">
              <div className="store-bought-head">
                <span className="store-bought-tag">store-bought</span>
                <span className="store-bought-name">
                  {ing.swap.storeBought.descriptor}
                </span>
              </div>
              {ing.swap.storeBought.criteria.length > 0 && (
                <ul className="store-bought-crit">
                  {ing.swap.storeBought.criteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function SubRecipeBlock({ sub }: { sub: SubRecipe }) {
  return (
    <div className="sub-recipe">
      <div className="sub-recipe-head">
        <span className="sub-recipe-tag">miso homemade</span>
        <span className="sub-recipe-name">{sub.name}</span>
      </div>
      <div className="sub-recipe-body">
        <h5>ingredients</h5>
        <ul className="sub-recipe-ings">
          {sub.ingredients.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
        <h5>method</h5>
        <ol className="sub-recipe-method">
          {sub.method.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ─────────── superfood modal ─────────── */

function SuperfoodModal({
  healthGoals,
  addedIds,
  onPick,
  onClose,
}: {
  healthGoals: HealthGoal[];
  addedIds: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goalSet = new Set(healthGoals);
  const matched = SUPERFOODS.filter(
    (s) =>
      s.goals.some((g) => goalSet.has(g)) && !addedIds.includes(s.id),
  );
  const others = SUPERFOODS.filter(
    (s) =>
      !s.goals.some((g) => goalSet.has(g)) && !addedIds.includes(s.id),
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <h3 className="modal-title">add a superfood</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="close"
          >
            ×
          </button>
        </div>
        <p className="modal-sub">
          Picked for your {healthGoals.length === 1 ? "goal" : "goals"}:{" "}
          <strong>{healthGoals.join(", ")}</strong>
        </p>
        <div className="superfood-grid">
          {matched.length === 0 ? (
            <div className="superfood-empty">
              All set — pick one from below.
            </div>
          ) : (
            matched.map((s) => (
              <button
                key={s.id}
                type="button"
                className="superfood-card"
                onClick={() => onPick(s.id)}
              >
                <div className="superfood-name">{s.name}</div>
                <div className="superfood-add">{s.addition}</div>
                <div className="superfood-how">{s.howTo}</div>
              </button>
            ))
          )}
        </div>
        {others.length > 0 && (
          <details className="superfood-more">
            <summary>also available</summary>
            <div className="superfood-grid">
              {others.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="superfood-card"
                  onClick={() => onPick(s.id)}
                >
                  <div className="superfood-name">{s.name}</div>
                  <div className="superfood-add">{s.addition}</div>
                  <div className="superfood-how">{s.howTo}</div>
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2 7h10m0 0L7 2m5 5l-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

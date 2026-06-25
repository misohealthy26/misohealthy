"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
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
  type MealPrepResponse,
  type MealPrepSet,
  type ShoppingCategory,
  type PrepScheduleItem,
  type MealPrepNutritionRow,
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
  | { kind: "mealPrepCooking" }
  | {
      kind: "summary";
      data: ConvertResponse;
      vegetarian: boolean;
      addedSuperfoodIds: string[];
    }
  | { kind: "mealPrep"; data: MealPrepResponse }
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
    if (phase.kind === "summary" || phase.kind === "error" || phase.kind === "mealPrep") {
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
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          dish: data.dish.trim(),
          healthGoals: goals,
          vegetarian,
        }),
      });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
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

  async function generateMealPrep() {
    setPhase({ kind: "mealPrepCooking" });
    try {
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (authEnabled) {
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/meal-prep", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ healthGoals: data.healthGoals }),
      });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      setPhase({ kind: "mealPrep", data: json });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  function submit() {
    if (data.dish.trim().toLowerCase() === "meal prep") {
      void generateMealPrep();
      return;
    }
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

      <SectionTabs active={section} onChange={(s) => { if (s === "make") restart(); setSection(s); }} />

      {phase.kind === "step" && phase.index === 0 && section === "make" && (
        <div className="intro-block">
          <h2 className="intro-heading">Make the food you love work better for you.</h2>
          <p className="intro-body">Food is one way we care for how we feel, function, and live. misohealthy helps you remake the meals you love with swaps that support your body, your goals, and your everyday life — from heart and gut health to balanced blood sugar, steady energy, and feeling good in your body.</p>
        </div>
      )}

      {phase.kind === "step" && phase.index === 0 && section === "make" && <FoodTicker />}

      {section === "bake" ? (
        <BakeItMiso user={user} authEnabled={authEnabled} />
      ) : (
      <>

      {phase.kind === "step" && (
        <>
          {phase.index === 0 && <Hero />}
          {phase.index === 0 && <ThreeStepsSection />}
          {phase.index === 1 && <FoodTicker />}
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
                onMealPrep={() => void generateMealPrep()}
                canAdvance={data.dish.trim().length > 0}
              />
            )}
          </main>
          {phase.index === 0 && <SuperfoodsSection />}
        </>
      )}

      {phase.kind === "cooking" && (
        <main className="stage">
          <Cooking dish={data.dish} />
        </main>
      )}

      {phase.kind === "mealPrepCooking" && (
        <main className="stage">
          <MealPrepCooking />
        </main>
      )}

      {phase.kind === "mealPrep" && (
        <MealPrepResult
          result={phase.data}
          healthGoals={data.healthGoals}
          onRestart={restart}
        />
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

const BAKE_TICKER_ITEMS = [
  // no-bake
  { label: "ube cheesecake",               color: "var(--terracotta)" },
  { label: "matcha strawberry tiramisu",   color: "var(--sage)" },
  { label: "mango sago",                   color: "var(--amber)" },
  { label: "dark chocolate avocado mousse",color: "var(--terracotta)" },
  { label: "miso date truffles",           color: "var(--sage)" },
  { label: "coconut sorbet",              color: "var(--amber)" },
  // cookies
  { label: "banana miso cookies",          color: "var(--terracotta)" },
  { label: "black sesame shortbread",      color: "var(--sage)" },
  { label: "matcha cookies",               color: "var(--amber)" },
  // cakes
  { label: "blood orange olive oil ricotta cake", color: "var(--terracotta)" },
  { label: "pandan chiffon cake",          color: "var(--sage)" },
  { label: "miso banana walnut cake",      color: "var(--amber)" },
  { label: "dark chocolate avocado cake",  color: "var(--terracotta)" },
  { label: "ginger pandan carrot cake",    color: "var(--sage)" },
  { label: "yuzu olive oil cake",          color: "var(--amber)" },
  { label: "matcha zucchini walnut cake",  color: "var(--terracotta)" },
  { label: "butterfly pea flower velvet cake", color: "var(--sage)" },
  { label: "yuzu hibiscus angel food cake",color: "var(--amber)" },
  // pastries
  { label: "rose water blood orange tart", color: "var(--terracotta)" },
  { label: "rose pistachio baklava",        color: "var(--sage)" },
  { label: "lemon pistachio bars",          color: "var(--amber)" },
  { label: "lavender honey shortbread",     color: "var(--terracotta)" },
  { label: "cardamom orange scones",        color: "var(--sage)" },
  // bread
  { label: "miso sesame sourdough",        color: "var(--terracotta)" },
  { label: "miso herb focaccia",           color: "var(--sage)" },
];

function BakeTicker() {
  const doubled = [...BAKE_TICKER_ITEMS, ...BAKE_TICKER_ITEMS];
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="ticker-item">
            <span className="ticker-dot" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const BAKE_COOKING_LINES = [
  "finding the classic recipe…",
  "finding the flavor twist…",
  "working out the swaps…",
  "writing it down for you…",
];

function BakeItMiso({ user, authEnabled }: { user: FlowUser; authEnabled: boolean }) {
  const [bakePhase, setBakePhase] = useState<"input" | "cooking" | "result" | "error">("input");
  const [bakeDish, setBakeDish] = useState("");
  const [bakeResult, setBakeResult] = useState<ConvertResponse | null>(null);
  const [bakeError, setBakeError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bakePhase === "input") inputRef.current?.focus({ preventScroll: true });
  }, [bakePhase]);

  async function submit(dishOverride?: string) {
    const dish = (dishOverride ?? bakeDish).trim();
    if (!dish) return;
    setBakeDish(dish);
    setBakePhase("cooking");
    try {
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (authEnabled) {
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/bake", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ dish }),
      });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      setBakeResult(json);
      setBakePhase("result");
    } catch (err) {
      setBakeError(err instanceof Error ? err.message : "Something went wrong.");
      setBakePhase("error");
    }
  }

  function restart() {
    setBakeDish("");
    setBakeResult(null);
    setBakeError("");
    setBakePhase("input");
  }

  const BAKE_GROUPS: { category: string; dishes: string[] }[] = [
    {
      category: "Cakes",
      dishes: ["chocolate cake", "carrot cake", "banana cake", "chiffon cake", "pound cake", "angel food cake", "red velvet cake", "blood orange ricotta cake", "torta caprese", "avocado chocolate cake", "zucchini cake"],
    },
    {
      category: "Cookies & Bars",
      dishes: ["banana miso cookies", "shortbread", "brownies", "oatmeal cookies"],
    },
    {
      category: "Pastries",
      dishes: ["lemon tart", "baklava", "scones", "muffins"],
    },
    {
      category: "Bread",
      dishes: ["sourdough", "focaccia", "herby flatbread", "banana bread"],
    },
    {
      category: "No-bake",
      dishes: ["ube cheesecake", "matcha strawberry tiramisu", "mango sago", "coconut sorbet", "avocado chocolate mousse", "miso date truffles", "key lime pie", "dubai chocolate"],
    },
  ];

  if (bakePhase === "input") {
    return (
      <>
        <div className="bake-hero">
          <h1 className="coming-soon-title">
            bake it
            <br />
            <span className="coming-soon-miso">miso.</span>
          </h1>
          <p className="coming-soon-sub">
            Familiar favorites with a twist of smarter baking. Simplified recipes that taste delicious and work better for your body.
          </p>
        </div>
        <BakeTicker />
        <main className="stage" style={{ minHeight: "auto", justifyContent: "flex-start", paddingTop: "8px", position: "relative", zIndex: 1 }}>
        <form
          className="step"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          <h2 className="step-title">What are you craving?</h2>
          <div className="bake-groups">
            {BAKE_GROUPS.map((group) => (
              <div key={group.category} className="bake-group">
                <div className="bake-group-label">{group.category}</div>
                <div className="chips chips-sub">
                  {group.dishes.map((dish) => (
                    <button
                      key={dish}
                      type="button"
                      className="chip chip-sub"
                      onClick={() => { void submit(dish); }}
                    >
                      {dish}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="bake-or-type">or type anything</p>
          <input
            ref={inputRef}
            className="step-input"
            placeholder="pavlova, sticky toffee pudding, crepes…"
            value={bakeDish}
            onChange={(e) => setBakeDish(e.target.value)}
            maxLength={200}
            autoComplete="off"
          />
          <div className="step-actions">
            <button type="submit" className="btn-primary" disabled={!bakeDish.trim()}>
              bake it miso <Arrow />
            </button>
          </div>
        </form>
        </main>
      </>
    );
  }

  if (bakePhase === "cooking") {
    return (
      <main className="stage" style={{ position: "relative", zIndex: 1 }}>
        <BakeCooking dish={bakeDish} />
      </main>
    );
  }

  if (bakePhase === "error") {
    return (
      <main className="stage" style={{ position: "relative", zIndex: 1 }}>
        <div className="error-card">
          <div className="error-card-title">that didn&apos;t work.</div>
          <div className="error-card-desc">{bakeError}</div>
          <div className="step-actions" style={{ marginTop: 8 }}>
            <button className="btn-ghost" onClick={restart}>start over</button>
            <button className="btn-primary" onClick={() => void submit()}>try again</button>
          </div>
        </div>
      </main>
    );
  }

  if (bakePhase === "result" && bakeResult) {
    return <BakeResult result={bakeResult} dish={bakeDish} user={user} authEnabled={authEnabled} onRestart={restart} />;
  }

  return null;
}

function BakeCooking({ dish }: { dish: string }) {
  const [lineIndex, setLineIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % BAKE_COOKING_LINES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="cooking">
      <RisingBread />
      <div className="cooking-line">{BAKE_COOKING_LINES[lineIndex]}</div>
      <div className="cooking-sub">baking up your {dish.toLowerCase()}</div>
    </div>
  );
}

function RisingBread() {
  return (
    <svg
      className="cooking-svg"
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* steam wisps */}
      <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <g className="wisp wisp-1">
          <path d="M 36 52 Q 32 42 38 34 Q 44 26 38 16" />
        </g>
        <g className="wisp wisp-2">
          <path d="M 50 52 Q 46 42 52 34 Q 58 26 52 16" />
        </g>
        <g className="wisp wisp-3">
          <path d="M 64 52 Q 60 42 66 34 Q 72 26 66 16" />
        </g>
      </g>

      {/* shadow glow under pan */}
      <ellipse
        className="pot-glow"
        cx="50"
        cy="104"
        rx="30"
        ry="4.5"
        fill="currentColor"
      />

      {/* pan handles */}
      <path
        d="M 14 74 Q 8 74 8 80"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 86 74 Q 92 74 92 80"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />

      {/* pan body */}
      <path
        d="M 14 72 L 18 96 Q 18 100 24 100 L 76 100 Q 82 100 82 96 L 86 72 Z"
        fill="rgba(255,253,245,0.7)"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* pan rim line */}
      <line
        x1="12"
        y1="72"
        x2="88"
        y2="72"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.4"
      />

      {/* rising bread dome — animated */}
      <g className="bread-dome">
        <path
          d="M 16 72 Q 20 50 50 46 Q 80 50 84 72 Z"
          fill="rgba(255,253,245,0.85)"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* score line across the dome */}
        <path
          d="M 30 64 Q 50 57 70 64"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.45"
        />
      </g>
    </svg>
  );
}

function BakeResult({
  result,
  dish,
  user,
  authEnabled,
  onRestart,
}: {
  result: ConvertResponse;
  dish: string;
  user: FlowUser;
  authEnabled: boolean;
  onRestart: () => void;
}) {
  const savedPayload = {
    healthy: result.healthy,
    nutrition: result.nutrition,
    nutritionMeta: result.nutritionMeta,
    swaps: result.swaps,
  };

  return (
    <main className="stage stage-summary bake-result-enter">
      <div className="summary">
        <div className="summary-head">
          <div>
            <h1 className="summary-title">{result.healthy.title}</h1>
            {result.healthy.servings != null && (
              <div className="summary-tags">
                <span className="summary-tag">serves {result.healthy.servings}</span>
              </div>
            )}
          </div>
          {authEnabled && (
            <HeartButton
              dish={dish}
              vegetarian={false}
              healthGoals={[]}
              payload={savedPayload}
              signedIn={!!user}
            />
          )}
        </div>

        <div className="summary-grid">
          <OriginalCard recipe={result.original} />
          <HealthyCard recipe={result.healthy} label="bake it miso" />
        </div>

        {result.swaps?.length > 0 && (
          <div className="swaps-card">
            <h4>Bake it Miso</h4>
            <div className="swap-list">
              {result.swaps.map((s, i) => (
                <SwapItem key={i} swap={s} />
              ))}
            </div>
          </div>
        )}

        {result.nutrition?.length > 0 && (
          <div className="nutrition-card">
            <div className="nutrition-heading">
              <h4>nutrition per serving</h4>
              <span className="usda-badge">USDA values used where possible</span>
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
                </div>
              ))}
            </div>
            <p className="nutrition-source">
              Values estimated based on ingredients · % daily values per FDA / USDA guidelines
            </p>
          </div>
        )}

        <p className="disclaimer">
          Recipes are informational — not medical or dietary advice.
        </p>
        <div className="summary-foot">
          <button type="button" className="btn-ghost" onClick={onRestart}>
            try another dessert
          </button>
          <button type="button" className="btn-ghost btn-print" onClick={() => window.print()}>
            <PrinterIcon /> print / save as PDF
          </button>
        </div>
      </div>
    </main>
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
  return (
    <section className="hero">
      <h1 className="hero-display">
        make it
        <br />
        <span className="hl-green">miso</span>.
      </h1>
      <p className="hero-sub">Remake the meals you love with swaps that support how you feel, function, and live.</p>
      <p className="hero-sub" style={{ marginTop: "12px" }}>misohealthy helps turn any dish into a version that works better for your body, your goals, and your everyday life — from heart and gut health to balanced blood sugar, steady energy, and feeling good in your body.</p>
      <p className="hero-sub" style={{ marginTop: "12px" }}>To make it miso is simple: keep the food you love, and make the changes that work for you.</p>
    </section>
  );
}

function FoodTicker() {
  const doubled = [...TICKER_FOODS, ...TICKER_FOODS];
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {doubled.map((food, i) => (
          <span key={i} className="ticker-item">
            <span className="ticker-dot" style={{ background: food.color }} />
            {food.label}
          </span>
        ))}
      </div>
    </div>
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
          Type any dish — beef stroganoff, ramen, pasta carbonara — or we&apos;ll
          plan a week of meals for you. Your choice.
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
  onMealPrep,
  canAdvance,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onMealPrep: () => void;
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
      <h2 className="step-title">Enter any meal</h2>
      <p className="step-sub" style={{ whiteSpace: "nowrap", fontSize: "13px", maxWidth: "none" }}>(e.g., mac and cheese, beef stroganoff, matzo ball soup, butter chicken)</p>
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
          make it miso <Arrow />
        </button>
      </div>
      <div className="hint">
        press <kbd>enter</kbd> to cook it
      </div>
      <div style={{
        marginTop: "24px",
        fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
        fontSize: "clamp(38px, 5.8vw, 60px)",
        fontWeight: 400,
        letterSpacing: "-0.025em",
        lineHeight: 1.05,
        color: "var(--ink-mute)",
      }}>
        OR Make your Week Easy with{" "}
        <button
          type="button"
          onClick={onMealPrep}
          style={{
            display: "inline-block",
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: "clamp(14px, 1.5vw, 17px)",
            fontWeight: 700,
            color: "white",
            background: "var(--amber)",
            border: "none",
            borderRadius: "999px",
            padding: "12px 26px",
            cursor: "pointer",
            verticalAlign: "middle",
            marginLeft: "12px",
            position: "relative",
            top: "-4px",
            boxShadow: "0 4px 16px -4px rgba(13,148,136,0.45)",
            whiteSpace: "nowrap",
          }}
        >
          Miso Meal Prep
        </button>
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
                <SwapItem key={i} swap={s} />
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
          <button type="button" className="btn-ghost btn-print" onClick={() => window.print()}>
            <PrinterIcon /> print / save as PDF
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

function HealthyCard({ recipe, label = "miso healthy version" }: { recipe: HealthyRecipe; label?: string }) {
  return (
    <div className="recipe-card is-healthy">
      <p className="recipe-card-label">{label}</p>
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

type Swap = { from: string; to: string; why: string; goalTags?: string[] };

function SwapItem({ swap: s }: { swap: Swap }) {
  const kept = s.to === "kept as original";
  return (
    <div className={`swap-item${kept ? " swap-item--kept" : ""}`}>
      <div className="swap-from">{s.from}</div>
      {kept ? (
        <div className="swap-to swap-to--kept">kept as original</div>
      ) : (
        <div className="swap-to">→ {s.to}</div>
      )}
      <div className="swap-why">{s.why}</div>
      {s.goalTags && s.goalTags.length > 0 && (
        <div className="swap-tags">
          {s.goalTags.map((g) => (
            <span key={g} className="goal-pill">{g}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── meal prep ─────────── */

const MEAL_PREP_COOKING_LINES = [
  "planning your week…",
  "picking the best components…",
  "building your bowl builds…",
  "writing it all down for you…",
];

function MealPrepCooking() {
  const [lineIndex, setLineIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % MEAL_PREP_COOKING_LINES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="cooking">
      <SteamingPot />
      <div className="cooking-line">{MEAL_PREP_COOKING_LINES[lineIndex]}</div>
      <div className="cooking-sub">prepping your week</div>
    </div>
  );
}

function MealPrepResult({
  result,
  healthGoals,
  onRestart,
}: {
  result: MealPrepResponse;
  healthGoals: HealthGoal[];
  onRestart: () => void;
}) {
  return (
    <main className="stage stage-summary">
      <div className="summary">
        <div className="summary-head">
          <div>
            <h1 className="summary-title">{result.theme}</h1>
            <div className="summary-tags">
              {healthGoals.map((g) => (
                <span key={g} className="summary-tag summary-tag-goal">{g}</span>
              ))}
              <span className="summary-tag">2 bowl builds · 3 meals each</span>
            </div>
          </div>
        </div>

        <div className="summary-grid">
          {result.sets.map((set, i) => (
            <MealPrepSetCard key={i} set={set} />
          ))}
        </div>

        {result.prepSchedule?.length > 0 && (
          <div className="swaps-card meal-prep-section">
            <h4>prep schedule</h4>
            <div className="meal-prep-schedule-list">
              {result.prepSchedule.map((item) => (
                <div key={item.order} className="meal-prep-schedule-item">
                  <div className="meal-prep-schedule-num">{item.order}</div>
                  <div className="meal-prep-schedule-body">
                    <div className="meal-prep-schedule-task">
                      {item.task}
                      {item.forSet && item.forSet !== "both" && (
                        <span className="meal-prep-schedule-for">{item.forSet}</span>
                      )}
                    </div>
                    <div className="meal-prep-schedule-times">
                      <span>active: {item.activeTime}</span>
                      <span className="meal-prep-schedule-dot">·</span>
                      <span>total: {item.totalTime}</span>
                    </div>
                    {item.note && <div className="meal-prep-schedule-note">{item.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.shoppingList?.length > 0 && (
          <div className="swaps-card meal-prep-section">
            <h4>shopping list</h4>
            <div className="meal-prep-shopping-grid">
              {result.shoppingList.map((cat) => (
                <div key={cat.category} className="meal-prep-shopping-cat">
                  <div className="meal-prep-shopping-cat-label">{cat.category}</div>
                  <ul className="meal-prep-shopping-items">
                    {cat.items.map((item, i) => (
                      <li key={i}>
                        <span className="meal-prep-shopping-qty">{item.quantity}</span>
                        <span className="meal-prep-shopping-name">{item.name}</span>
                        {item.usedIn && item.usedIn !== "both" && (
                          <span className="meal-prep-shopping-used">{item.usedIn}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.nutrition?.length > 0 && (
          <div className="nutrition-card meal-prep-section">
            <div className="nutrition-heading">
              <h4>nutrition per serving</h4>
              {result.nutrition.some((r) => r.source === "usda") ? (
                <span className="usda-badge">Powered by USDA</span>
              ) : (
                <span className="usda-badge">Miso Healthy estimate</span>
              )}
            </div>
            <div className="meal-prep-nutrition-grid">
              {result.nutrition.map((row) => (
                <div key={row.setName} className="meal-prep-nutrition-set">
                  <div className="meal-prep-nutrition-set-name">
                    {row.setName}
                    {row.source === "usda" && (
                      <span className="mp-usda-pill">USDA</span>
                    )}
                  </div>
                  {row.rows.map((nutrient) => {
                    const pctNum = parseInt(nutrient.dv, 10) || 0;
                    const barWidth = Math.min(pctNum, 100);
                    return (
                      <div key={nutrient.label} className="meal-prep-nutrition-row">
                        <span className="mp-nutrient-label">{nutrient.label}</span>
                        <div className="mp-nutrient-bar-wrap">
                          <div className="mp-nutrient-bar" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="mp-nutrient-value">{nutrient.value}</span>
                        <span className="mp-nutrient-dv">{nutrient.dv}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="nutrition-source">
              % daily values based on a 2,000 kcal diet (FDA) ·{" "}
              {result.nutrition.some((r) => r.source === "usda")
                ? "Values sourced from USDA FoodData Central where available"
                : "Estimated by Miso Healthy based on ingredients · not a substitute for professional nutrition advice"}
            </p>
          </div>
        )}

        {result.prepTips?.length > 0 && (
          <div className="swaps-card meal-prep-section">
            <h4>prep day tips</h4>
            <ol className="meal-prep-tips-list">
              {result.prepTips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ol>
          </div>
        )}

        <p className="disclaimer">Recipes are informational — not medical or dietary advice.</p>

        <div className="summary-foot">
          <button type="button" className="btn-ghost" onClick={onRestart}>
            plan another week
          </button>
          <button type="button" className="btn-ghost btn-print" onClick={() => window.print()}>
            <PrinterIcon /> print / save as PDF
          </button>
        </div>
      </div>
    </main>
  );
}

const PREP_CATEGORY_ORDER = ["starch", "protein", "vegetable", "pickled", "fermented", "other"];

function MealPrepSetCard({ set }: { set: MealPrepSet }) {
  const [sauceOpen, setSauceOpen] = useState(false);

  // Group items by component category, preserving the fixed display order
  const grouped = PREP_CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      items: set.batchPrep.filter(
        (item) => (item.component ?? "other").toLowerCase() === cat
      ),
    }))
    .filter((g) => g.items.length > 0);

  // Add any items whose component doesn't match a known category
  const knownItems = new Set(PREP_CATEGORY_ORDER);
  const extraItems = set.batchPrep.filter(
    (item) => !knownItems.has((item.component ?? "other").toLowerCase())
  );
  if (extraItems.length > 0) {
    grouped.push({ category: "other", items: extraItems });
  }

  // Running step number across all categories
  let stepNum = 0;

  return (
    <div className="recipe-card is-healthy">
      <p className="recipe-card-label">bowl build</p>
      <h2 className="recipe-card-title">{set.name}</h2>
      <p className="recipe-card-servings">makes {set.meals} meals</p>

      <h4>batch prep</h4>
      <div className="meal-prep-batch-list">
        {grouped.map((group) => (
          <div key={group.category} className="meal-prep-category-group">
            <div className="meal-prep-category-label">{group.category}</div>
            {group.items.map((item) => {
              stepNum += 1;
              const num = stepNum;
              return (
                <div key={item.name} className="meal-prep-batch-item">
                  <div className="meal-prep-batch-head">
                    <span className="meal-prep-step-num">{num}</span>
                    <span className="meal-prep-batch-name">{item.name}</span>
                    {item.superfood && <span className="ing-pill ing-pill-superfood">superfood</span>}
                  </div>
                  <p className="meal-prep-batch-method">{item.method}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <h4>sauce</h4>
      <div className="meal-prep-sauce-wrap">
        <button
          type="button"
          className="make-your-miso-btn"
          onClick={() => setSauceOpen((o) => !o)}
          aria-expanded={sauceOpen}
        >
          {sauceOpen ? "close" : `${set.sauce.name} — see recipe`}
        </button>
        {sauceOpen && (
          <div className="sub-recipe" style={{ marginTop: "10px" }}>
            <div className="sub-recipe-head">
              <span className="sub-recipe-tag">miso homemade</span>
              <span className="sub-recipe-name">{set.sauce.name}</span>
            </div>
            <div className="sub-recipe-body">
              <p style={{ fontSize: "13px", lineHeight: "1.7" }}>{set.sauce.recipe}</p>
            </div>
          </div>
        )}
      </div>

      <h4>fresh per meal</h4>
      <ul className="meal-prep-fresh-list">
        {set.freshPerMeal.map((item, i) => {
          const label = typeof item === "string" ? item : (item as { item: string }).item;
          return <li key={i}>{label}</li>;
        })}
      </ul>

      <h4>assembly</h4>
      <p style={{ fontSize: "14px", lineHeight: "1.65", marginBottom: "14px" }}>{set.assembly}</p>

      {set.healthNote && (
        <div className="meal-prep-health-note">{set.healthNote}</div>
      )}
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

function PrinterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M4 5V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="1.5" y="5" width="11" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 8.5h6M4 10.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

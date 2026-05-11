"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import NavAuth from "./NavAuth";
import HeartButton from "./HeartButton";
import { clearPendingSave, readPendingSave } from "@/lib/pendingSave";

// useLayoutEffect runs after DOM commit but before browser paint — perfect for
// reading localStorage and restoring state without a visible flash. Fall back
// to useEffect on the server to avoid React's SSR warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Recipe = {
  title: string;
  ingredients: string[];
  method: string[];
};
type NutritionRow = { label: string; original: string; healthy: string };
type Swap = { from: string; to: string; why: string };
type ConvertResponse = {
  original: Recipe;
  healthy: Recipe;
  nutrition: NutritionRow[];
  swaps: Swap[];
};

type FormData = {
  dish: string;
  vegetarian: boolean;
};

type Phase =
  | { kind: "step"; index: 0 | 1 }
  | { kind: "cooking" }
  | { kind: "summary"; data: ConvertResponse }
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
  const [phase, setPhase] = useState<Phase>({ kind: "step", index: 0 });
  const [data, setData] = useState<FormData>({ dish: "", vegetarian: false });
  const [autoSavePending, setAutoSavePending] = useState(false);

  useIsoLayoutEffect(() => {
    const pending = readPendingSave();
    if (!pending) return;
    // Restoring from localStorage on mount — happens before paint so no flash.
    /* eslint-disable react-hooks/set-state-in-effect */
    setData({ dish: pending.dish, vegetarian: pending.vegetarian });
    setPhase({ kind: "summary", data: pending.payload as ConvertResponse });
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
    } else {
      submit();
    }
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
    setData({ dish: "", vegetarian: false });
    setPhase({ kind: "step", index: 0 });
    setAutoSavePending(false);
    clearPendingSave();
  }

  async function submit(overrideVeg?: boolean) {
    const vegetarian = overrideVeg ?? data.vegetarian;
    if (overrideVeg !== undefined) {
      setData((d) => ({ ...d, vegetarian }));
    }
    setPhase({ kind: "cooking" });
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish: data.dish.trim(), vegetarian }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      setPhase({ kind: "summary", data: json });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  const canAdvance = (() => {
    if (phase.kind !== "step") return false;
    if (phase.index === 0) return data.dish.trim().length > 0;
    return true;
  })();

  return (
    <div className="scene">
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

      {phase.kind === "step" && (
        <>
        <main className="stage">
          {phase.index === 0 && (
            <DishStep
              value={data.dish}
              onChange={(dish) => setData((d) => ({ ...d, dish }))}
              onSubmit={goNext}
              canAdvance={canAdvance}
            />
          )}
          {phase.index === 1 && (
            <VegetarianStep
              value={data.vegetarian}
              onChoose={(v) => submit(v)}
              onBack={goBack}
            />
          )}
        </main>
        <MeetSection />
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
            <div className="error-card-title">that didn't work.</div>
            <div className="error-card-desc">{phase.message}</div>
            <div className="step-actions" style={{ marginTop: 8 }}>
              <button className="btn-ghost" onClick={restart}>
                start over
              </button>
              <button className="btn-primary" onClick={() => submit()}>
                try again
              </button>
            </div>
          </div>
        </main>
      )}

      {phase.kind === "summary" && (
        <Summary
          result={phase.data}
          vegetarian={data.vegetarian}
          dish={data.dish}
          user={user}
          authEnabled={authEnabled}
          autoSaveOnMount={autoSavePending}
        />
      )}
    </div>
  );
}

/* ─────────── steps ─────────── */

function DishStep({
  value,
  onChange,
  onSubmit,
  canAdvance,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  canAdvance: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      className="step"
      onSubmit={(e) => {
        e.preventDefault();
        if (canAdvance) onSubmit();
      }}
    >
      <h1 className="step-title">what are you craving?</h1>
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
        <button type="submit" className="btn-primary" disabled={!canAdvance}>
          continue <Arrow />
        </button>
      </div>
      <div className="hint">
        press <kbd>enter</kbd> to continue
      </div>
    </form>
  );
}

function VegetarianStep({
  value,
  onChoose,
  onBack,
}: {
  value: boolean;
  onChoose: (v: boolean) => void;
  onBack: () => void;
}) {
  return (
    <div className="step">
      <h1 className="step-title">make it vegetarian?</h1>
      <p className="step-sub">
        We'll swap the meat for something just as satisfying.
      </p>
      <div className="chips">
        <button
          type="button"
          className={`chip${value ? " is-selected" : ""}`}
          onClick={() => onChoose(true)}
        >
          yes — make it vegetarian
        </button>
        <button
          type="button"
          className={`chip${!value ? " is-selected" : ""}`}
          onClick={() => onChoose(false)}
        >
          no — keep it as-is
        </button>
      </div>
      <div className="step-actions">
        <button className="btn-ghost" onClick={onBack}>
          back
        </button>
      </div>
      <div className="hint">tap one to cook</div>
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

function MeetSection() {
  return (
    <section className="meet">
      <div className="meet-mockup">
        <div className="meet-mockup-frame">
          <div className="meet-mockup-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="meet-mockup-stage">
            {/* phase 1 — typing */}
            <div className="meet-screen meet-screen-input">
              <div className="meet-screen-title">what are you craving?</div>
              <div className="meet-screen-input-bar">
                <span className="meet-screen-typed">
                  <span className="meet-screen-typed-text">mac and cheese</span>
                  <span className="meet-screen-caret" />
                </span>
              </div>
            </div>

            {/* phase 2 — thinking */}
            <div className="meet-screen meet-screen-cooking">
              <SteamingPot />
              <div className="meet-screen-cook-line">thinking it through…</div>
            </div>

            {/* phase 3 — result */}
            <div className="meet-screen meet-screen-result">
              <div className="meet-screen-res-title">
                mac &amp; cheese, <em>healthier</em>
              </div>
              <div className="meet-screen-res-grid">
                <div className="meet-screen-res-cell">
                  <div className="meet-screen-res-tag is-orig">original</div>
                  <div className="meet-screen-res-stat">920 cal</div>
                  <div className="meet-screen-res-meta">pasta · heavy cream</div>
                </div>
                <div className="meet-screen-res-cell is-healthy">
                  <div className="meet-screen-res-tag is-healthy">healthy</div>
                  <div className="meet-screen-res-stat">480 cal</div>
                  <div className="meet-screen-res-meta">chickpea · RFH sauce</div>
                </div>
              </div>
              <div className="meet-screen-res-bar">
                <span>+ protein</span>
                <span>+ fiber</span>
                <span>− sat fat</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="meet-content">
        <h2 className="meet-title">
          three steps to a <em>healthier</em> dish.
        </h2>
        <div className="meet-steps">
          <div className="meet-step">
            <div className="meet-step-num">01</div>
            <div className="meet-step-body">
              <h3 className="meet-step-title">tell us what you're craving</h3>
              <p className="meet-step-desc">
                Type any dish — pad thai, lasagna, mac and cheese. We find the most common version first.
              </p>
            </div>
          </div>
          <div className="meet-step">
            <div className="meet-step-num">02</div>
            <div className="meet-step-body">
              <h3 className="meet-step-title">we make it healthier</h3>
              <p className="meet-step-desc">
                Smart, science-backed swaps from Dr. Felicia Stoler's Recipe-For-Health ruleset. Real ingredients, no extreme moves.
              </p>
            </div>
          </div>
          <div className="meet-step">
            <div className="meet-step-num">03</div>
            <div className="meet-step-body">
              <h3 className="meet-step-title">see the proof</h3>
              <p className="meet-step-desc">
                Side-by-side nutrition — calories, protein, fiber, all of it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
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
      {/* steam wisps */}
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

      {/* soft pot glow */}
      <ellipse
        className="pot-glow"
        cx="50"
        cy="98"
        rx="34"
        ry="6"
        fill="currentColor"
      />

      {/* pot handles */}
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

      {/* pot body */}
      <path
        d="M 16 70 L 20 92 Q 20 98 26 98 L 74 98 Q 80 98 80 92 L 84 70 Z"
        fill="rgba(255, 253, 245, 0.7)"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* pot rim shine */}
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
  dish,
  user,
  authEnabled,
  autoSaveOnMount,
}: {
  result: ConvertResponse;
  vegetarian: boolean;
  dish: string;
  user: FlowUser;
  authEnabled: boolean;
  autoSaveOnMount?: boolean;
}) {
  return (
    <div className="summary">
      <div className="summary-head">
        <div>
          <h1 className="summary-title">{result.healthy.title}</h1>
          {vegetarian && (
            <div className="summary-tags">
              <span className="summary-tag">vegetarian</span>
            </div>
          )}
        </div>
        {authEnabled && (
          <HeartButton
            dish={dish}
            vegetarian={vegetarian}
            payload={result}
            signedIn={!!user}
            autoSaveOnMount={autoSaveOnMount}
          />
        )}
      </div>

      <div className="summary-grid">
        <RecipeCard kind="original" recipe={result.original} />
        <RecipeCard kind="healthy" recipe={result.healthy} />
      </div>

      {result.nutrition?.length > 0 && (
        <div className="nutrition-card">
          <h4>nutrition per serving</h4>
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
        </div>
      )}

      {result.swaps?.length > 0 && (
        <div className="swaps-card">
          <h4>smart swaps applied</h4>
          <div className="swap-list">
            {result.swaps.map((s, i) => (
              <div key={i} className="swap-item">
                <div className="swap-from">{s.from}</div>
                <div className="swap-to">→ {s.to}</div>
                <div className="swap-why">{s.why}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="disclaimer">
        Recipes are AI-estimated and informational — not medical or dietary advice.
      </p>
    </div>
  );
}

function RecipeCard({ kind, recipe }: { kind: "original" | "healthy"; recipe: Recipe }) {
  return (
    <div className={`recipe-card is-${kind}`}>
      <p className="recipe-card-label">
        {kind === "original" ? "original" : "miso healthy version"}
      </p>
      <h2 className="recipe-card-title">{recipe.title}</h2>
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

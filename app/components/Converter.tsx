"use client";

import { useState } from "react";

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

export default function Converter() {
  const [dish, setDish] = useState("");
  const [vegetarian, setVegetarian] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResponse | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!dish.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish: dish.trim(), vegetarian }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }
      setResult(data);
      setTimeout(() => {
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow">AI-POWERED RECIPE TRANSFORMATION</p>
        <h1 className="hero-h1">
          make any dish<br />
          <span>miso healthy.</span>
        </h1>
        <p className="hero-sub">
          Enter any craving. We find the most common recipe, transform it into a healthier version, and show you the nutrition side by side — instantly.
        </p>

        <form className="converter-box" onSubmit={handleSubmit}>
          <p className="converter-label">WHAT ARE YOU HUNGRY FOR?</p>
          <div className="converter-input-row">
            <input
              className="converter-input"
              placeholder='Try "chicken tikka masala" or "mac and cheese"…'
              value={dish}
              onChange={(e) => setDish(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="converter-btn" disabled={loading || !dish.trim()}>
              {loading ? (
                <>cooking…</>
              ) : (
                <>
                  <i className="ti ti-arrow-right" aria-hidden /> make it healthy
                </>
              )}
            </button>
          </div>
          <div className="converter-options">
            <button
              type="button"
              className={`converter-btn-veg${vegetarian ? " active" : ""}`}
              onClick={() => setVegetarian((v) => !v)}
              disabled={loading}
            >
              <i className="ti ti-leaf" aria-hidden />{" "}
              {vegetarian ? "vegetarian on" : "make it vegetarian"}
            </button>
          </div>
        </form>
      </section>

      {(loading || error || result) && (
        <section id="result" className="result-section">
          <div className="result-wrap">
            {loading && (
              <div className="result-loading">
                Looking up the original recipe and applying RFH swaps…
              </div>
            )}
            {error && <div className="result-error">{error}</div>}
            {result && <ResultPanel result={result} />}
          </div>
        </section>
      )}
    </>
  );
}

function ResultPanel({ result }: { result: ConvertResponse }) {
  return (
    <>
      <div className="result-grid">
        <RecipeCol kind="original" recipe={result.original} />
        <RecipeCol kind="healthy" recipe={result.healthy} />
      </div>

      {result.nutrition?.length > 0 && (
        <div className="result-col" style={{ marginBottom: 24 }}>
          <h4 style={{ marginTop: 0 }}>Nutrition comparison (per serving)</h4>
          <table className="nutrition-table">
            <thead>
              <tr>
                <th>Nutrient</th>
                <th>Original</th>
                <th>Miso healthy</th>
              </tr>
            </thead>
            <tbody>
              {result.nutrition.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.original}</td>
                  <td>{row.healthy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.swaps?.length > 0 && (
        <div className="swap-list-section">
          <p className="swap-list-title">SMART SWAPS WE APPLIED</p>
          <div className="swap-list-grid">
            {result.swaps.map((swap, i) => (
              <div key={i} className="swap-card">
                <div className="swap-card-from">{swap.from}</div>
                <div className="swap-card-to">→ {swap.to}</div>
                <div className="swap-card-why">{swap.why}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="disclaimer">
        Recipes are for informational purposes only and are not a substitute for medical or dietary advice.
      </p>
    </>
  );
}

function RecipeCol({ kind, recipe }: { kind: "original" | "healthy"; recipe: Recipe }) {
  return (
    <div className={`result-col ${kind}`}>
      <p className="result-col-label">
        {kind === "original" ? "ORIGINAL RECIPE" : "MISO HEALTHY VERSION"}
      </p>
      <h2 className="result-col-title">{recipe.title}</h2>
      <h4>Ingredients</h4>
      <ul>
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>{ing}</li>
        ))}
      </ul>
      <h4>Method</h4>
      <ol>
        {recipe.method.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

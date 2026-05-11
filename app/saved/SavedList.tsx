"use client";

import { useState } from "react";

type Recipe = {
  title: string;
  ingredients: string[];
  method: string[];
};
type NutritionRow = { label: string; original: string; healthy: string };
type Swap = { from: string; to: string; why: string };
type Payload = {
  original: Recipe;
  healthy: Recipe;
  nutrition: NutritionRow[];
  swaps: Swap[];
};
type Saved = {
  id: string;
  dish: string;
  vegetarian: boolean;
  payload: Payload;
  created_at: string;
};

export default function SavedList({ recipes }: { recipes: Saved[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [items, setItems] = useState(recipes);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deleting) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setItems((curr) => curr.filter((r) => r.id !== id));
      if (open === id) setOpen(null);
    } catch {
      // best-effort; row stays visible
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="saved-grid">
      {items.map((r) => {
        const date = new Date(r.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return (
          <article key={r.id} className="saved-card">
            <button
              type="button"
              className="saved-card-head"
              onClick={() => setOpen(open === r.id ? null : r.id)}
              aria-expanded={open === r.id}
            >
              <div>
                <h2 className="saved-card-title">{r.payload.healthy.title}</h2>
                <div className="saved-card-meta">
                  <span>{r.dish}</span>
                  {r.vegetarian && <span className="saved-card-tag">vegetarian</span>}
                  <span className="saved-card-date">{date}</span>
                </div>
              </div>
              <span className="saved-card-chev" aria-hidden>
                {open === r.id ? "−" : "+"}
              </span>
            </button>

            {open === r.id && (
              <div className="saved-card-body">
                <div className="saved-card-cols">
                  <RecipeBlock label="original" recipe={r.payload.original} />
                  <RecipeBlock label="healthy" recipe={r.payload.healthy} />
                </div>
                {r.payload.nutrition?.length > 0 && (
                  <div className="saved-card-nut">
                    {r.payload.nutrition.map((n) => (
                      <div key={n.label} className="saved-card-nut-cell">
                        <div className="saved-card-nut-label">{n.label}</div>
                        <div className="saved-card-nut-row">
                          <span className="v-orig">{n.original}</span>
                          <span className="arr">→</span>
                          <span className="v-healthy">{n.healthy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="saved-card-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                  >
                    {deleting === r.id ? "removing…" : "remove"}
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function RecipeBlock({ label, recipe }: { label: string; recipe: Recipe }) {
  return (
    <div className={`saved-block is-${label}`}>
      <p className="saved-block-label">{label}</p>
      <h3 className="saved-block-title">{recipe.title}</h3>
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

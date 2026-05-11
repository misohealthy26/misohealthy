"use client";

import { useState } from "react";
import type {
  HealthGoal,
  HealthyRecipe,
  IngredientLine,
  NutritionRow,
  SubRecipe,
} from "@/lib/types";

// Tolerant payload: new rows have healthy-only; legacy rows may include
// an `original` field with the old string[] ingredients shape.
type Payload = {
  healthy?: HealthyRecipe | LegacyRecipe;
  nutrition?: NutritionRow[];
  healthGoal?: HealthGoal; // legacy rows (pre-multi-select)
  healthGoals?: HealthGoal[];
};

type LegacyRecipe = {
  title: string;
  ingredients: string[];
  method: string[];
};

type Saved = {
  id: string;
  dish: string;
  vegetarian: boolean;
  payload: Payload;
  created_at: string;
};

function isIngredientLine(item: unknown): item is IngredientLine {
  return typeof item === "object" && item !== null && "text" in item;
}

function normalizeIngredients(
  recipe: HealthyRecipe | LegacyRecipe | undefined,
): IngredientLine[] {
  if (!recipe) return [];
  return recipe.ingredients.map((ing) =>
    isIngredientLine(ing) ? ing : { text: ing as string },
  );
}

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
        const healthy = r.payload.healthy;
        const ingredients = normalizeIngredients(healthy);
        return (
          <article key={r.id} className="saved-card">
            <button
              type="button"
              className="saved-card-head"
              onClick={() => setOpen(open === r.id ? null : r.id)}
              aria-expanded={open === r.id}
            >
              <div>
                <h2 className="saved-card-title">
                  {healthy?.title ?? r.dish}
                </h2>
                <div className="saved-card-meta">
                  <span>{r.dish}</span>
                  {r.vegetarian && <span className="saved-card-tag">vegetarian</span>}
                  {(r.payload.healthGoals ?? (r.payload.healthGoal ? [r.payload.healthGoal] : [])).map((g) => (
                    <span key={g} className="saved-card-tag">{g}</span>
                  ))}
                  <span className="saved-card-date">{date}</span>
                </div>
              </div>
              <span className="saved-card-chev" aria-hidden>
                {open === r.id ? "−" : "+"}
              </span>
            </button>

            {open === r.id && healthy && (
              <div className="saved-card-body">
                <SavedRecipeBlock
                  recipe={healthy}
                  ingredients={ingredients}
                />
                {r.payload.nutrition && r.payload.nutrition.length > 0 && (
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

function SavedRecipeBlock({
  recipe,
  ingredients,
}: {
  recipe: HealthyRecipe | LegacyRecipe;
  ingredients: IngredientLine[];
}) {
  const servings =
    "servings" in recipe && typeof recipe.servings === "number"
      ? recipe.servings
      : null;
  return (
    <div className="saved-block is-healthy">
      <p className="saved-block-label">miso healthy</p>
      <h3 className="saved-block-title">{recipe.title}</h3>
      {servings !== null && (
        <p className="saved-block-servings">serves {servings}</p>
      )}
      <h4>ingredients</h4>
      <ul>
        {ingredients.map((ing, i) => (
          <li key={i} className={ing.superfood ? "is-superfood" : undefined}>
            <span>{ing.text}</span>
            {ing.superfood && (
              <span className="ing-pill ing-pill-superfood">superfood</span>
            )}
            {ing.goalTags?.map((g) => (
              <span key={g} className="ing-pill ing-pill-goal">
                {g}
              </span>
            ))}
            {ing.swap?.homemade && (
              <SubRecipeBlock sub={ing.swap.homemade} />
            )}
          </li>
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

function SubRecipeBlock({ sub }: { sub: SubRecipe }) {
  return (
    <div className="sub-recipe">
      <div className="sub-recipe-name">{sub.name}</div>
      <ul className="sub-recipe-ings">
        {sub.ingredients.map((ing, i) => (
          <li key={i}>{ing}</li>
        ))}
      </ul>
      <ol className="sub-recipe-method">
        {sub.method.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

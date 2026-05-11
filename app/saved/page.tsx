import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import NavAuth from "../components/NavAuth";
import SavedList from "./SavedList";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  if (!isSupabaseConfigured()) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/saved");
  }

  const { data: recipes, error } = await supabase
    .from("saved_recipes")
    .select("id, dish, vegetarian, payload, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="scene">
      <nav className="nav">
        <Link href="/" className="nav-logo" aria-label="back to start">
          <span className="nav-logo-text">
            <span className="nav-logo-miso">miso</span>{" "}
            <span className="nav-logo-healthy">healthy</span>
          </span>
        </Link>
        <NavAuth user={{ id: user.id, email: user.email ?? null }} />
      </nav>

      <div className="saved">
        <header className="saved-head">
          <h1 className="saved-title">your saved recipes</h1>
          {recipes && recipes.length > 0 && (
            <p className="saved-sub">
              {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
            </p>
          )}
          {error && <p className="saved-sub">could not load right now.</p>}
        </header>

        {recipes && recipes.length > 0 && <SavedList recipes={recipes} />}
      </div>
    </div>
  );
}

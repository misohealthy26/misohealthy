import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SaveBody = {
  dish?: unknown;
  vegetarian?: unknown;
  payload?: unknown;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_recipes")
    .select("id, dish, vegetarian, payload, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipes: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const dish = typeof body.dish === "string" ? body.dish.trim() : "";
  const vegetarian = body.vegetarian === true;
  const payload = body.payload;

  if (!dish || dish.length > 200) {
    return NextResponse.json({ error: "Invalid dish." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Missing payload." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_recipes")
    .insert({
      user_id: user.id,
      dish,
      vegetarian,
      payload,
    })
    .select("id, dish, vegetarian, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipe: data });
}

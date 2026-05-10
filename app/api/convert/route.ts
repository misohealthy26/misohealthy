import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = { dish?: unknown; vegetarian?: unknown };

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dish = typeof body.dish === "string" ? body.dish.trim() : "";
  const vegetarian = body.vegetarian === true;

  if (!dish || dish.length > 200) {
    return Response.json(
      { error: "Please enter a dish name (under 200 characters)." },
      { status: 400 },
    );
  }

  const userMessage = vegetarian
    ? `Dish the user is craving: "${dish}". Make the healthy version VEGETARIAN — no meat, poultry, or seafood. Generate the original baseline + miso healthy version + nutrition + applied swaps as JSON only.`
    : `Dish the user is craving: "${dish}". Generate the original baseline + miso healthy version + nutrition + applied swaps as JSON only.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = completion.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Claude returned non-JSON:", text.slice(0, 500));
      return Response.json(
        { error: "Could not parse the recipe. Please try again." },
        { status: 502 },
      );
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("/api/convert error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Recipe generation failed: ${message}` },
      { status: 500 },
    );
  }
}

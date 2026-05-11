import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { isHealthGoal } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Per-IP cap on LLM calls. Each call costs real money — keep this tight.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 1 hour

type RequestBody = {
  dish?: unknown;
  vegetarian?: unknown;
  healthGoals?: unknown;
};

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
  const healthGoals = Array.isArray(body.healthGoals)
    ? body.healthGoals.filter(isHealthGoal)
    : [];

  if (!dish || dish.length > 200) {
    return Response.json(
      { error: "Please enter a dish name (under 200 characters)." },
      { status: 400 },
    );
  }

  if (healthGoals.length === 0) {
    return Response.json(
      { error: "Please pick at least one health goal." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(
    `convert:ip:${ip}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (limit && !limit.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000),
    );
    return new Response(
      JSON.stringify({
        error: "You've hit the hourly limit. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil(limit.resetAt.getTime() / 1000),
          ),
        },
      },
    );
  }

  const vegetarianDirective = vegetarian
    ? ' Make the healthy version VEGETARIAN — no meat, poultry, or seafood.'
    : '';
  const goalsLabel =
    healthGoals.length === 1 ? healthGoals[0] : healthGoals.join(", ");
  const userMessage = `Dish the user is craving: "${dish}". Health ${healthGoals.length === 1 ? "goal" : "goals"}: "${goalsLabel}".${vegetarianDirective} Generate the original baseline + miso healthy version + nutrition + applied swaps as JSON only, in the exact shape defined in the system prompt.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
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

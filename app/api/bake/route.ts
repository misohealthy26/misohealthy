import Anthropic from "@anthropic-ai/sdk";
import { BAKE_SYSTEM_PROMPT } from "@/lib/bake-system-prompt";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

type RequestBody = {
  dish?: unknown;
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

  if (!dish || dish.length > 200) {
    return Response.json(
      { error: "Please enter a dessert or sweet (under 200 characters)." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(
    `bake:ip:${ip}`,
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

  const userMessage = `Dessert or sweet the user is craving: "${dish}". Generate the original baseline + bake it miso version + nutrition + applied swaps as JSON only, in the exact shape defined in the system prompt.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const completion = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      system: [
        {
          type: "text",
          text: BAKE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
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
    console.error("/api/bake error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Recipe generation failed: ${message}` },
      { status: 500 },
    );
  }
}

import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

// Returns null if rate limiting isn't configured (dev without service_role)
// or if the RPC fails — caller should fail-open on null.
export async function consumeRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error || !data || !data[0]) {
    console.error("consume_rate_limit rpc failed", error);
    return null;
  }
  const row = data[0] as {
    allowed: boolean;
    remaining: number;
    reset_at: string;
  };
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at),
  };
}

// Vercel sets x-forwarded-for; the leftmost value is the original client IP.
export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  return real ?? "unknown";
}

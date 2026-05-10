// Minimal waitlist route — accepts an email and logs it.
// Today: just logs. Easy to swap for Resend audience or a DB later.

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return Response.json(
      { error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  console.log(`[waitlist] ${new Date().toISOString()} ${email}`);

  return Response.json({ ok: true });
}

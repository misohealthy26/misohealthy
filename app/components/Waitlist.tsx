"use client";

import { useState } from "react";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not sign up.");
      setStatus("ok");
      setMessage("You're on the list — talk soon.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not sign up.");
    }
  }

  return (
    <>
      <form className="cta-email-row" onSubmit={submit}>
        <input
          type="email"
          className="cta-email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "loading"}
        />
        <button
          type="submit"
          className="cta-btn"
          disabled={status === "loading" || !email}
        >
          {status === "loading" ? "joining…" : "I'm in"}
        </button>
      </form>
      {message && <p className="cta-status">{message}</p>}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  dish: string;
  vegetarian: boolean;
  payload: unknown;
  signedIn: boolean;
};

export default function HeartButton({ dish, vegetarian, payload, signedIn }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (saved || saving) return;

    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent("/")}`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish, vegetarian, payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "could not save.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      className={`heart-btn${saved ? " is-saved" : ""}`}
      onClick={handleClick}
      disabled={saving}
      aria-label={saved ? "saved" : signedIn ? "save recipe" : "sign in to save"}
      title={error ?? (saved ? "saved" : signedIn ? "save recipe" : "sign in to save")}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} aria-hidden>
        <path
          d="M12 21s-7-4.534-9-9.5C1.5 7 5 4 8 4c1.5 0 3 .5 4 2 1-1.5 2.5-2 4-2 3 0 6.5 3 5 7.5-2 4.966-9 9.5-9 9.5z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span className="heart-btn-label">{saved ? "saved" : "save"}</span>
    </button>
  );
}

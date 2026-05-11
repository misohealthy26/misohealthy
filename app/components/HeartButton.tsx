"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PENDING_SAVE_KEY } from "@/lib/pendingSave";
import type { HealthGoal } from "@/lib/types";

type Props = {
  dish: string;
  vegetarian: boolean;
  healthGoals: HealthGoal[];
  payload: unknown;
  signedIn: boolean;
  autoSaveOnMount?: boolean;
};

export default function HeartButton({
  dish,
  vegetarian,
  healthGoals,
  payload,
  signedIn,
  autoSaveOnMount,
}: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish, vegetarian, healthGoals, payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "could not save.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not save.");
    } finally {
      setSaving(false);
    }
  }, [dish, vegetarian, healthGoals, payload]);

  function handleClick() {
    if (saved || saving) return;

    if (!signedIn) {
      try {
        localStorage.setItem(
          PENDING_SAVE_KEY,
          JSON.stringify({
            dish,
            vegetarian,
            healthGoals,
            payload,
            at: Date.now(),
          }),
        );
      } catch {
        // ignore storage failures (private mode, quota) — login still works
      }
      router.push(`/login?next=${encodeURIComponent("/")}`);
      return;
    }

    void save();
  }

  const autoSaveFired = useRef(false);
  useEffect(() => {
    if (!autoSaveOnMount || !signedIn) return;
    if (autoSaveFired.current) return;
    autoSaveFired.current = true;
    void save();
  }, [autoSaveOnMount, signedIn, save]);

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

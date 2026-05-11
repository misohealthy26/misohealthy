export const PENDING_SAVE_KEY = "miso:pendingSave";
export const PENDING_SAVE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export type PendingSave = {
  dish: string;
  vegetarian: boolean;
  payload: unknown;
  at: number;
};

export function readPendingSave(): PendingSave | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(PENDING_SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingSave>;
    if (
      !parsed ||
      typeof parsed.dish !== "string" ||
      typeof parsed.vegetarian !== "boolean" ||
      typeof parsed.at !== "number" ||
      !parsed.payload ||
      typeof parsed.payload !== "object"
    ) {
      return null;
    }
    if (Date.now() - parsed.at > PENDING_SAVE_MAX_AGE_MS) return null;
    return parsed as PendingSave;
  } catch {
    return null;
  }
}

export function clearPendingSave() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_SAVE_KEY);
  } catch {
    // ignore
  }
}

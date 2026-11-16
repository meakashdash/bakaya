/**
 * The early-access Google Form, from VITE_WAITLIST_URL. Only https links are accepted;
 * anything else (or empty) means the card isn't shown.
 */
export function waitlistUrl(): string | null {
  const raw = import.meta.env.VITE_WAITLIST_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

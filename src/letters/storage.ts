// "Remember my business details on this device" (PRD §3).
// Only the supplier's own details, only in this browser's localStorage, never sent anywhere.
// Every access is wrapped in try/catch: storage can be disabled, full, or blocked (private mode,
// some in-app browsers), and the letter must still work.
import { z } from 'zod';
import { BUSINESS_FIELDS, type BusinessDetails } from './detailsSchema';

export const STORAGE_KEY = 'bakaya:business-details:v1';

const storedSchema = z.object(
  Object.fromEntries(BUSINESS_FIELDS.map((f) => [f, z.string().max(500).catch('')])) as Record<
    (typeof BUSINESS_FIELDS)[number],
    z.ZodCatch<z.ZodString>
  >,
);

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadBusinessDetails(): BusinessDetails | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Returns false if the browser wouldn't let us save. */
export function saveBusinessDetails(details: BusinessDetails): boolean {
  try {
    const subset = Object.fromEntries(BUSINESS_FIELDS.map((f) => [f, details[f]]));
    const s = storage();
    if (!s) return false;
    s.setItem(STORAGE_KEY, JSON.stringify(subset));
    return true;
  } catch {
    return false;
  }
}

export function clearBusinessDetails(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else we can do; the details simply stay until the user clears site data.
  }
}

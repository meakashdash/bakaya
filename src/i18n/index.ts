// Minimal string lookup. All user-facing copy lives in en.json (hi.json later).
// Placeholders use {{name}}.
import en from './en.json';

type Vars = Record<string, string | number>;

export function t(key: string, vars: Vars = {}): string {
  let node: unknown = en;
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof node !== 'string') throw new Error(`Missing i18n key: ${key}`);
  return node.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Plural key: `${key}_one` when count is 1, otherwise the base key. */
export const pluralKey = (key: string, count: number): string => (count === 1 ? `${key}_one` : key);

const percentFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });

/** 17.25 -> "17.25%", 16.5 -> "16.5%" */
export const formatPercent = (pct: number): string => `${percentFormat.format(pct)}%`;

/** A list of { heading, body } sections from en.json (used by the Privacy and Terms pages). */
export function tSections(key: string): { heading: string; body: string }[] {
  let node: unknown = en;
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  const ok =
    Array.isArray(node) &&
    node.every(
      (s: unknown) =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as Record<string, unknown>).heading === 'string' &&
        typeof (s as Record<string, unknown>).body === 'string',
    );
  if (!ok) throw new Error(`Missing i18n section list: ${key}`);
  return node as { heading: string; body: string }[];
}

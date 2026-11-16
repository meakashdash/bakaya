// Minimal string lookup. All user-facing copy lives in en.json and hi.json (same keys).
// Placeholders use {{name}}.
//
// The current locale comes from the URL (/hi/... is Hindi) and is set once per render by App.
// `t` reads it. Code that must use a fixed language, whatever the page language (a letter in
// English from the Hindi page, or the static HTML built for each language), uses `tIn`.
import en from './en.json';
import hi from './hi.json';

export const LOCALES = ['en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];
export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

const DICTS: Record<Locale, unknown> = { en, hi };

let current: Locale = 'en';
export const setLocale = (locale: Locale): void => {
  current = locale;
};
export const getLocale = (): Locale => current;

type Vars = Record<string, string | number>;

function lookup(locale: Locale, key: string): unknown {
  let node: unknown = DICTS[locale];
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  return node;
}

export function tIn(locale: Locale, key: string, vars: Vars = {}): string {
  const node = lookup(locale, key);
  if (typeof node !== 'string') throw new Error(`Missing i18n key (${locale}): ${key}`);
  return node.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export const t = (key: string, vars: Vars = {}): string => tIn(current, key, vars);

/** Plural key: `${key}_one` when count is 1, otherwise the base key. */
export const pluralKey = (key: string, count: number): string => (count === 1 ? `${key}_one` : key);

const percentFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });

/** 17.25 -> "17.25%", 16.5 -> "16.5%". Western digits in both languages. */
export const formatPercent = (pct: number): string => `${percentFormat.format(pct)}%`;

/**
 * '2027-02-24' -> '24 Feb 2027' (English) or '24 फ़रवरी 2027' (Hindi).
 * Pure string work on the YYYY-MM-DD form: no Date objects, so no time-zone surprises.
 */
export function formatDate(iso: string, locale: Locale = current): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${iso}`);
  const [, year, month, day] = m;
  return tIn(locale, 'date.format', {
    day: Number(day),
    month: tIn(locale, `date.months.m${Number(month)}`),
    year: year ?? '',
  });
}

/** A list of { heading, body } sections (used by the Privacy and Terms pages). */
export function tSections(
  key: string,
  locale: Locale = current,
): { heading: string; body: string }[] {
  const node = lookup(locale, key);
  const ok =
    Array.isArray(node) &&
    node.every(
      (s: unknown) =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as Record<string, unknown>).heading === 'string' &&
        typeof (s as Record<string, unknown>).body === 'string',
    );
  if (!ok) throw new Error(`Missing i18n section list (${locale}): ${key}`);
  return node as { heading: string; body: string }[];
}

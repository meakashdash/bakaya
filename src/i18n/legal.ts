// Legal labels and the disclaimer in the requested language. The text lives in
// data/legal-config.json (English and Hindi side by side); this only picks the right one.
import { legalConfig } from '../data';
import type { Citation } from '../domain/types';
import { getLocale, type Locale } from './index';

type MsmedKey = keyof typeof legalConfig.msmedSections;

/** e.g. 'MSMED Act, 2006, Section 16' / 'MSMED अधिनियम, 2006, धारा 16' */
export function msmedSection(key: MsmedKey, locale: Locale = getLocale()) {
  const s = legalConfig.msmedSections[key];
  return locale === 'hi' ? s.hi : { label: s.label, short: s.short };
}

/** The act and section for a tax-section rule (as returned by calculate()), in a language. */
export function taxLaw(
  law: { act: string; section: string },
  locale: Locale = getLocale(),
): { act: string; section: string } {
  if (locale === 'en') return { act: law.act, section: law.section };
  const entry = legalConfig.taxSections.find((s) => s.act === law.act && s.section === law.section);
  if (!entry) throw new Error(`Unknown tax section: ${law.act}, ${law.section}`);
  return entry.hi;
}

export const portalName = (locale: Locale = getLocale()): string =>
  locale === 'hi' ? legalConfig.complaintPortal.hi.name : legalConfig.complaintPortal.name;

export const disclaimerText = (locale: Locale = getLocale()): string =>
  locale === 'hi' ? legalConfig.disclaimerTranslations.hi : legalConfig.disclaimer;

/** A result citation's label in a language. */
export function citationLabel(
  c: Citation,
  tax: { act: string; section: string } | null,
  locale: Locale = getLocale(),
): string {
  if (c.id === 'tax') {
    if (locale === 'en' || !tax) return c.label;
    const law = taxLaw(tax, locale);
    return `${law.act}, ${law.section}`;
  }
  return msmedSection(c.id, locale).label;
}

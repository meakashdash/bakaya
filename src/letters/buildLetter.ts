// Builds the reminder letter from templates/*.md, the calculation and the letter details.
// Legal values come from the result and /data; nothing is hardcoded here.
import finalTemplate from '../../templates/letter-final.md?raw';
import firmTemplate from '../../templates/letter-firm.md?raw';
import friendlyTemplate from '../../templates/letter-friendly.md?raw';
import finalTemplateHi from '../../templates/hi/letter-final.md?raw';
import firmTemplateHi from '../../templates/hi/letter-firm.md?raw';
import friendlyTemplateHi from '../../templates/hi/letter-friendly.md?raw';
import { legalConfig } from '../data';
import { formatPaise, formatRupees } from '../domain/money';
import type { CalculationInput, CalculationResult, WarningCode } from '../domain/types';
import { formatDate, pluralKey, tIn, type Locale } from '../i18n';
import { disclaimerText, msmedSection, portalName, taxLaw } from '../i18n/legal';
import type { LetterDetails, Tone } from './detailsSchema';
import { letterMode } from './mode';
import { blocksToPlainText, parseBlocks, renderTemplate, type Block } from './template';

/** templates/*.md (English) and templates/hi/*.md (Hindi). Both use the same variables. */
export const TEMPLATES: Record<Locale, Record<Tone, string>> = {
  en: { friendly: friendlyTemplate, firm: firmTemplate, final: finalTemplate },
  hi: { friendly: friendlyTemplateHi, firm: firmTemplateHi, final: finalTemplateHi },
};

/** Warnings worth repeating next to the letter, before the user sends it. */
export const LETTER_WARNINGS: readonly WarningCode[] = ['trader', 'registration'];

export type Letter = {
  /** The letter's language. The supplier picks it; it can differ from the page language. */
  locale: Locale;
  /** The first block: supplier name (letterhead), address, registration line. */
  letterhead: string[];
  body: Block[];
  /** For "Copy text": the whole letter plus the disclaimer. */
  plainText: string;
  disclaimer: string;
};

export function buildLetter(args: {
  tone: Tone;
  details: LetterDetails;
  input: CalculationInput;
  result: CalculationResult;
  asOfDate: string;
  locale: Locale;
}): Letter {
  const { details, input, result, asOfDate, locale } = args;
  const t = (key: string, vars?: Record<string, string | number>) => tIn(locale, key, vars);
  const date = (iso: string) => formatDate(iso, locale);
  const mode = letterMode(input, result);
  if (mode === 'not_yet_due') throw new Error('No letter before the payment is due');
  const legal = mode === 'legal' && result.covered;
  const tone: Tone = legal ? args.tone : 'friendly';

  const tax = result.covered ? result.tax : null;
  const law = tax ? taxLaw(tax, locale) : null;
  const registrationLine = [
    details.udyamNumber && `${t('letter.udyamLabel')} ${details.udyamNumber}`,
    details.gstin && `${t('letter.gstinLabel')} ${details.gstin}`,
  ]
    .filter(Boolean)
    .join(' | ');

  const values = {
    legal,
    taxApplies: legal && tax !== null && tax.status !== 'not_at_risk_this_year',
    objectionResolved: input.objection.raised,
    supplierName: details.supplierName,
    supplierAddress: details.supplierAddress,
    udyamNumber: details.udyamNumber,
    gstin: details.gstin,
    registrationLine,
    supplierSignatory: details.supplierSignatory,
    supplierPhone: details.supplierPhone,
    supplierEmail: details.supplierEmail,
    buyerName: details.buyerName,
    buyerContactPerson: details.buyerContactPerson,
    buyerAddress: details.buyerAddress,
    invoiceNumber: details.invoiceNumber,
    invoiceDate: date(details.invoiceDate),
    today: date(asOfDate),
    asOfDate: date(asOfDate),
    amount: formatPaise(input.amountPaise),
    deliveryDate: date(input.deliveryDate),
    category:
      input.category === 'micro' || input.category === 'small'
        ? t(`letter.category.${input.category}`)
        : '',
    complaintPortal: portalName(locale),
    deadlineSection: msmedSection('deadline', locale).label,
    interestSection: msmedSection('interest', locale).label,
    // Values below exist only for a covered result; sections hide them otherwise.
    acceptanceDate: result.covered ? date(result.acceptanceDate) : '',
    dueDate: result.covered ? date(result.dueDate) : '',
    daysOverdue: result.covered ? String(result.daysOverdue) : '',
    daysOverdueText: result.covered
      ? t(pluralKey('letter.days', result.daysOverdue), { days: result.daysOverdue })
      : '',
    interestMultiplier: String(legalConfig.paymentRules.interestMultiplier),
    interest: result.covered ? formatRupees(result.interest.rupees) : '',
    taxSection: law?.section ?? '',
    taxAct: law?.act ?? '',
    yearEnd: tax ? date(tax.yearEnd) : '',
  };

  const [head, ...body] = parseBlocks(renderTemplate(TEMPLATES[locale][tone], values));
  const disclaimer = disclaimerText(locale);
  const letterhead = head?.type === 'paragraph' ? head.lines : [];
  const text = blocksToPlainText(head ? [head, ...body] : body);
  return {
    locale,
    letterhead,
    body,
    plainText: `${text}\n\n—\n${disclaimer}`,
    disclaimer,
  };
}

/** A safe file name: reminder-letter-INV-104.pdf */
export function letterFileName(invoiceNumber: string, locale: Locale): string {
  const slug = invoiceNumber
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${tIn(locale, 'letter.fileName')}${slug ? `-${slug}` : ''}.pdf`;
}

// Builds the reminder letter from templates/*.md, the calculation and the letter details.
// Legal values come from the result and /data; nothing is hardcoded here.
import finalTemplate from '../../templates/letter-final.md?raw';
import firmTemplate from '../../templates/letter-firm.md?raw';
import friendlyTemplate from '../../templates/letter-friendly.md?raw';
import { legalConfig } from '../data';
import { formatDisplayDate } from '../domain/dates';
import { formatPaise, formatRupees } from '../domain/money';
import type { CalculationInput, CalculationResult, WarningCode } from '../domain/types';
import { pluralKey, t } from '../i18n';
import type { LetterDetails, Tone } from './detailsSchema';
import { letterMode } from './mode';
import { blocksToPlainText, parseBlocks, renderTemplate, type Block } from './template';

export const TEMPLATES: Record<Tone, string> = {
  friendly: friendlyTemplate,
  firm: firmTemplate,
  final: finalTemplate,
};

/** Warnings worth repeating next to the letter, before the user sends it. */
export const LETTER_WARNINGS: readonly WarningCode[] = ['trader', 'registration'];

export type Letter = {
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
}): Letter {
  const { details, input, result, asOfDate } = args;
  const mode = letterMode(input, result);
  if (mode === 'not_yet_due') throw new Error('No letter before the payment is due');
  const legal = mode === 'legal' && result.covered;
  const tone: Tone = legal ? args.tone : 'friendly';

  const tax = result.covered ? result.tax : null;
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
    invoiceDate: formatDisplayDate(details.invoiceDate),
    today: formatDisplayDate(asOfDate),
    asOfDate: formatDisplayDate(asOfDate),
    amount: formatPaise(input.amountPaise),
    deliveryDate: formatDisplayDate(input.deliveryDate),
    category:
      input.category === 'micro' || input.category === 'small'
        ? t(`letter.category.${input.category}`)
        : '',
    complaintPortal: legalConfig.complaintPortal.name,
    deadlineSection: legalConfig.msmedSections.deadline.label,
    interestSection: legalConfig.msmedSections.interest.label,
    // Values below exist only for a covered result; sections hide them otherwise.
    acceptanceDate: result.covered ? formatDisplayDate(result.acceptanceDate) : '',
    dueDate: result.covered ? formatDisplayDate(result.dueDate) : '',
    daysOverdue: result.covered ? String(result.daysOverdue) : '',
    daysOverdueText: result.covered
      ? t(pluralKey('letter.days', result.daysOverdue), { days: result.daysOverdue })
      : '',
    interestMultiplier: String(legalConfig.paymentRules.interestMultiplier),
    interest: result.covered ? formatRupees(result.interest.rupees) : '',
    taxSection: tax?.section ?? '',
    taxAct: tax?.act ?? '',
    yearEnd: tax ? formatDisplayDate(tax.yearEnd) : '',
  };

  const [head, ...body] = parseBlocks(renderTemplate(TEMPLATES[tone], values));
  const letterhead = head?.type === 'paragraph' ? head.lines : [];
  const text = blocksToPlainText(head ? [head, ...body] : body);
  return {
    letterhead,
    body,
    plainText: `${text}\n\n—\n${result.disclaimer}`,
    disclaimer: result.disclaimer,
  };
}

/** A safe file name: reminder-letter-INV-104.pdf */
export function letterFileName(invoiceNumber: string): string {
  const slug = invoiceNumber
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${t('letter.fileName')}${slug ? `-${slug}` : ''}.pdf`;
}

// Calendar-date logic. Dates are 'YYYY-MM-DD' strings; date-fns works on local dates so
// there is no time-zone arithmetic. Never reads the current date.
import {
  addDays,
  differenceInCalendarDays,
  format,
  isLastDayOfMonth,
  isValid,
  parseISO,
} from 'date-fns';
import type { CalculationInput, IsoDate } from './types';

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(s: string): boolean {
  if (!ISO_PATTERN.test(s)) return false;
  const d = parseISO(s);
  return isValid(d) && format(d, 'yyyy-MM-dd') === s;
}

function toDate(s: IsoDate): Date {
  if (!isValidIsoDate(s)) throw new RangeError(`Invalid date: ${s}`);
  return parseISO(s);
}

const toIso = (d: Date): IsoDate => format(d, 'yyyy-MM-dd');

export const addDaysIso = (s: IsoDate, days: number): IsoDate => toIso(addDays(toDate(s), days));

/** Calendar days from `earlier` to `later` (negative if `later` is before). */
export const daysBetween = (earlier: IsoDate, later: IsoDate): number =>
  differenceInCalendarDays(toDate(later), toDate(earlier));

export const isLastDayOfMonthIso = (s: IsoDate): boolean => isLastDayOfMonth(toDate(s));

/** Month number 1–12. */
export const monthOf = (s: IsoDate): number => toDate(s).getMonth() + 1;

/** '2027-02-24' -> '24 Feb 2027' */
export const formatDisplayDate = (s: IsoDate): string => format(toDate(s), 'd MMM yyyy');

/**
 * Day of acceptance (LEGAL_RULES.md §2): the delivery date, or, if the buyer objected in
 * writing within the objection window, the day the objection was resolved.
 */
export function acceptanceDate(
  input: Pick<CalculationInput, 'deliveryDate' | 'objection'>,
): IsoDate {
  return input.objection.raised ? input.objection.resolvedDate : input.deliveryDate;
}

/**
 * Payment deadline (LEGAL_RULES.md §3, MSMED Act s.15).
 * No written agreement: acceptance + noAgreementDays. Agreement for N days: acceptance + min(N, maxAgreedDays).
 */
export function dueDate(
  acceptance: IsoDate,
  agreement: CalculationInput['agreement'],
  rules: { noAgreementDays: number; maxAgreedDays: number },
): { dueDate: IsoDate; daysUsed: number; capped: boolean } {
  const requested = agreement.hasAgreement ? agreement.days : rules.noAgreementDays;
  const daysUsed = Math.min(requested, rules.maxAgreedDays);
  // VERIFY: off-by-one convention with a CA. Due date = acceptance + N calendar days
  // (acceptance 10 Jan + 45 -> due 24 Feb); interest from the next day.
  return { dueDate: addDaysIso(acceptance, daysUsed), daysUsed, capped: requested > daysUsed };
}

/** The "appointed day": interest starts the day after the due date. VERIFY with a CA (see dueDate). */
export const interestStartDate = (due: IsoDate): IsoDate => addDaysIso(due, 1);

/** Days from the due date to the as-of date; 0 if not yet overdue. Equals the number of interest days. */
export const daysOverdue = (due: IsoDate, asOf: IsoDate): number =>
  Math.max(0, daysBetween(due, asOf));

/** Days from the as-of date until the due date; 0 once overdue. */
export const daysUntilDue = (due: IsoDate, asOf: IsoDate): number =>
  Math.max(0, daysBetween(asOf, due));

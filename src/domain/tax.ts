// Tax exposure for the buyer (LEGAL_RULES.md §5): Section 43B(h) of the Income-tax Act 1961,
// replaced by Section 37(2)(g) of the Income-tax Act 2025. The buyer can't claim the unpaid
// invoice as an expense in that tax year; the deduction is DEFERRED to the year of payment, not lost.
//
// VERIFY: all buyer tax rates (data/tax-rates.json) with a CA, including whether they are
// unchanged under the Income-tax Act 2025.
import { daysBetween, monthOf } from './dates';
import { amountFromPaise } from './money';
import { fromDecimal, fromInt, mul, rat } from './rational';
import type { CalculationInput, IsoDate, TaxExposure, YearEndStatus } from './types';

export type TaxYear = { startYear: number; label: string; yearEnd: IsoDate };

/** The Indian tax year (April–March) containing `date`. */
export function taxYearOf(date: IsoDate): TaxYear {
  const year = Number(date.slice(0, 4));
  const startYear = monthOf(date) >= 4 ? year : year - 1;
  const endYY = String((startYear + 1) % 100).padStart(2, '0');
  return { startYear, label: `${startYear}-${endYY}`, yearEnd: `${startYear + 1}-03-31` };
}

const startYearOfLabel = (label: string): number => Number(label.slice(0, 4));

export type TaxSectionRule = {
  fromTaxYear: string;
  toTaxYear: string | null;
  act: string;
  section: string;
  source?: string | undefined;
};

/** Which law and section applies to a tax year; null if the rule didn't exist yet. */
export function taxSectionFor(
  taxYear: TaxYear,
  sections: readonly TaxSectionRule[],
): TaxSectionRule | null {
  return (
    sections.find(
      (s) =>
        taxYear.startYear >= startYearOfLabel(s.fromTaxYear) &&
        (s.toTaxYear === null || taxYear.startYear <= startYearOfLabel(s.toTaxYear)),
    ) ?? null
  );
}

/** Year-end status table in LEGAL_RULES.md §5. v1 has no payments, so the invoice is always unpaid. */
export function yearEndStatus(due: IsoDate, asOf: IsoDate, yearEnd: IsoDate): YearEndStatus {
  if (due > yearEnd) return 'not_at_risk_this_year';
  return asOf <= yearEnd ? 'at_risk' : 'deferred';
}

export const daysToYearEnd = (asOf: IsoDate, yearEnd: IsoDate): number =>
  Math.max(0, daysBetween(asOf, yearEnd));

export type TaxRateConfig = {
  buyerTypes: readonly { id: string; effectiveRatePct: number }[];
  unknownRange: { lowPct: number; highPct: number };
};

/** Maps the form's buyer choice to an id in data/tax-rates.json. */
const BUYER_RATE_IDS = {
  company: 'company_concessional',
  firm_llp: 'firm_llp_high_income',
} as const;

/** Exposure = invoice amount × buyer's effective tax rate; a range when the buyer type is unknown. */
export function taxExposure(
  amountPaise: number,
  buyerType: CalculationInput['buyerType'],
  rates: TaxRateConfig,
): TaxExposure {
  const at = (pct: number) =>
    amountFromPaise(mul(fromInt(amountPaise), mul(fromDecimal(pct), rat(1n, 100n))));

  if (buyerType === 'not_sure') {
    const { lowPct, highPct } = rates.unknownRange;
    return { kind: 'range', lowPct, highPct, low: at(lowPct), high: at(highPct) };
  }
  const id = BUYER_RATE_IDS[buyerType];
  const entry = rates.buyerTypes.find((b) => b.id === id);
  if (!entry) throw new Error(`data/tax-rates.json has no buyer type "${id}"`);
  return { kind: 'single', ratePct: entry.effectiveRatePct, amount: at(entry.effectiveRatePct) };
}

/**
 * Seasonality rule: the tax argument is strongest in the configured months (Jan–Mar).
 * If the status is at_risk and the as-of month is outside them, lead with interest.
 * Otherwise the result page keeps its default order (tax card first), as in PRD §2.
 */
export function leadWith(
  status: YearEndStatus | null,
  asOf: IsoDate,
  taxArgumentStrongMonths: readonly number[],
): 'tax' | 'interest' {
  if (status === null) return 'interest'; // no tax rule applies, so there is no tax card to lead with
  if (status === 'at_risk' && !taxArgumentStrongMonths.includes(monthOf(asOf))) return 'interest';
  return 'tax';
}

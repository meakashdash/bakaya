// Shared domain types.
import type { z } from 'zod';
import type { Amount } from './money';
import type { makeInputSchema } from './validation';

/** A calendar date as a 'YYYY-MM-DD' string. No times, no time zones. */
export type IsoDate = string;

export type CalculationInput = z.infer<ReturnType<typeof makeInputSchema>>;

/** Warning codes. The text for each lives in src/i18n/en.json under "warnings". */
export type WarningCode =
  | 'medium_enterprise'
  | 'trader'
  | 'registration'
  | 'agreement_capped'
  | 'due_after_year_end'
  | 'tax_rule_not_applicable';

export type Citation = {
  id: 'deadline' | 'interest' | 'tax';
  label: string;
  url?: string;
};

export type YearEndStatus = 'not_at_risk_this_year' | 'at_risk' | 'deferred';

export type TaxExposure =
  | { kind: 'single'; ratePct: number; amount: Amount }
  | { kind: 'range'; lowPct: number; highPct: number; low: Amount; high: Amount };

export type TaxResult = {
  /** Indian tax year containing the acceptance date, e.g. '2026-27'. */
  taxYear: string;
  /** 31 March that ends that tax year. */
  yearEnd: IsoDate;
  act: string;
  section: string;
  status: YearEndStatus;
  /** Days from the as-of date to 31 March (0 once it's reached or passed). */
  daysToYearEnd: number;
  exposure: TaxExposure;
};

/** One stretch of days with the same RBI bank rate. */
export type RatePeriod = {
  from: IsoDate;
  to: IsoDate;
  bankRatePct: number;
  /** interestMultiplier × bank rate, e.g. 17.25 */
  annualInterestPct: number;
};

export type NotCoveredResult = {
  covered: false;
  reason: 'medium_enterprise';
  warnings: WarningCode[];
  citations: [];
  disclaimer: string;
};

export type CoveredResult = {
  covered: true;
  acceptanceDate: IsoDate;
  /** Agreed days after the legal cap, or the no-agreement default. */
  agreedDaysUsed: number;
  dueDate: IsoDate;
  interestStartDate: IsoDate;
  isOverdue: boolean;
  daysOverdue: number;
  /** Days left until the due date (0 once overdue). */
  daysUntilDue: number;
  interest: Amount;
  /** Bank rates applied over the interest period (empty if not overdue). */
  interestPeriods: RatePeriod[];
  /** The rate in force on the as-of date, for "17.25% a year, 3 × 5.75%". */
  currentRate: { bankRatePct: number; annualInterestPct: number; multiplier: number };
  /** null when the tax rule did not exist yet for the acceptance date's tax year. */
  tax: TaxResult | null;
  /** Which card the result page shows first (seasonality rule). */
  leadWith: 'tax' | 'interest';
  warnings: WarningCode[];
  citations: Citation[];
  disclaimer: string;
};

export type CalculationResult = CoveredResult | NotCoveredResult;

export class DomainError extends Error {
  readonly code: 'invalid_as_of_date' | 'no_bank_rate';
  constructor(code: DomainError['code'], message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export class InvalidInputError extends Error {
  /** Each issue's message is an i18n key such as 'errors.amountTooLow'. */
  readonly issues: { path: PropertyKey[]; message: string }[];
  constructor(issues: { path: PropertyKey[]; message: string }[]) {
    super(`Invalid input: ${issues.map((i) => i.message).join(', ')}`);
    this.name = 'InvalidInputError';
    this.issues = issues;
  }
}

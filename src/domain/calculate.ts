// The single entry point: calculate(input, asOfDate) -> Result.
// Pure: never reads the current date; all legal values come from /data via src/data.
import { bankRates, legalConfig, taxRates } from '../data';
import {
  acceptanceDate as getAcceptanceDate,
  daysOverdue as getDaysOverdue,
  daysUntilDue as getDaysUntilDue,
  dueDate as getDueDate,
  interestStartDate as getInterestStartDate,
  isValidIsoDate,
} from './dates';
import { checkEligibility } from './eligibility';
import { annualInterestPct, bankRateOn, section16Interest } from './interest';
import { amountFromPaise } from './money';
import {
  daysToYearEnd,
  leadWith,
  taxExposure,
  taxSectionFor,
  taxYearOf,
  yearEndStatus,
} from './tax';
import {
  DomainError,
  InvalidInputError,
  type CalculationInput,
  type CalculationResult,
  type Citation,
  type IsoDate,
  type TaxResult,
  type WarningCode,
} from './types';
import { makeInputSchema } from './validation';

export function calculate(rawInput: CalculationInput, asOfDate: IsoDate): CalculationResult {
  if (!isValidIsoDate(asOfDate)) {
    throw new DomainError('invalid_as_of_date', `Invalid as-of date: ${asOfDate}`);
  }
  const parsed = makeInputSchema(asOfDate).safeParse(rawInput);
  if (!parsed.success) {
    throw new InvalidInputError(
      parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
    );
  }
  const input = parsed.data;
  const rules = legalConfig.paymentRules;
  const disclaimer = legalConfig.disclaimer;

  // 1. Who is covered
  const eligibility = checkEligibility(input);
  if (!eligibility.covered) {
    return {
      covered: false,
      reason: 'medium_enterprise',
      warnings: eligibility.warnings,
      citations: [],
      disclaimer,
    };
  }
  const warnings: WarningCode[] = [...eligibility.warnings];

  // 2–3. Acceptance and payment deadline
  const acceptanceDate = getAcceptanceDate(input);
  const due = getDueDate(acceptanceDate, input.agreement, rules);
  if (due.capped) warnings.push('agreement_capped');
  const interestStartDate = getInterestStartDate(due.dueDate);
  const daysOverdue = getDaysOverdue(due.dueDate, asOfDate);

  // 4. Section 16 interest
  const interest = section16Interest({
    principalPaise: input.amountPaise,
    startDate: interestStartDate,
    endDate: asOfDate,
    rates: bankRates.rates,
    multiplier: rules.interestMultiplier,
    dayCountBasis: rules.dayCountBasis,
  });
  const rateNow = bankRateOn(asOfDate, bankRates.rates);

  // 5. Tax exposure
  const taxYear = taxYearOf(acceptanceDate);
  const section = taxSectionFor(taxYear, legalConfig.taxSections);
  let tax: TaxResult | null = null;
  if (section) {
    const status = yearEndStatus(due.dueDate, asOfDate, taxYear.yearEnd);
    if (status === 'not_at_risk_this_year') warnings.push('due_after_year_end');
    tax = {
      taxYear: taxYear.label,
      yearEnd: taxYear.yearEnd,
      act: section.act,
      section: section.section,
      status,
      daysToYearEnd: daysToYearEnd(asOfDate, taxYear.yearEnd),
      exposure: taxExposure(input.amountPaise, input.buyerType, taxRates),
    };
  } else {
    warnings.push('tax_rule_not_applicable');
  }

  return {
    covered: true,
    acceptanceDate,
    agreedDaysUsed: due.daysUsed,
    dueDate: due.dueDate,
    interestStartDate,
    isOverdue: daysOverdue > 0,
    daysOverdue,
    daysUntilDue: getDaysUntilDue(due.dueDate, asOfDate),
    interest: amountFromPaise(interest.interestPaise),
    interestPeriods: interest.periods,
    currentRate: {
      bankRatePct: rateNow.bankRatePct,
      annualInterestPct: annualInterestPct(rateNow.bankRatePct, rules.interestMultiplier),
      multiplier: rules.interestMultiplier,
    },
    tax,
    leadWith: leadWith(
      tax?.status ?? null,
      asOfDate,
      legalConfig.seasonality.taxArgumentStrongMonths,
    ),
    warnings,
    citations: buildCitations(section),
    disclaimer,
  };
}

function buildCitations(section: ReturnType<typeof taxSectionFor>): Citation[] {
  const citations: Citation[] = [
    { id: 'deadline', label: legalConfig.msmedSections.deadline.label },
    { id: 'interest', label: legalConfig.msmedSections.interest.label },
  ];
  if (section) {
    citations.push({
      id: 'tax',
      label: `${section.act}, ${section.section}`,
      ...(section.source ? { url: section.source } : {}),
    });
  }
  return citations;
}

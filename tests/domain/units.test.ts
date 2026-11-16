// Unit tests for each domain module and edge cases not in docs/TEST_CASES.md.
import { bankRates, legalConfig, taxRates } from '../../src/data';
import { calculate } from '../../src/domain/calculate';
import {
  acceptanceDate,
  addDaysIso,
  daysBetween,
  daysOverdue,
  daysUntilDue,
  dueDate,
  interestStartDate,
  isValidIsoDate,
} from '../../src/domain/dates';
import { checkEligibility } from '../../src/domain/eligibility';
import { bankRateOn, section16Interest } from '../../src/domain/interest';
import {
  add,
  div,
  fromDecimal,
  fromInt,
  rat,
  roundHalfUp,
  sub,
  toNumber,
} from '../../src/domain/rational';
import {
  leadWith,
  taxExposure,
  taxSectionFor,
  taxYearOf,
  yearEndStatus,
} from '../../src/domain/tax';
import { DomainError, InvalidInputError, type CalculationInput } from '../../src/domain/types';
import { EARLIEST_SUPPORTED_DATE, MAX_INVOICE_PAISE } from '../../src/domain/validation';
import { t } from '../../src/i18n';

const base: CalculationInput = {
  category: 'micro',
  isTrader: false,
  registeredBeforeSupply: 'yes',
  amountPaise: 10_000_000,
  deliveryDate: '2027-01-10',
  objection: { raised: false },
  agreement: { hasAgreement: false },
  buyerType: 'not_sure',
};

describe('rational', () => {
  it('reduces, normalises sign and rejects zero denominators', () => {
    expect(rat(6n, -4n)).toEqual({ n: -3n, d: 2n });
    expect(rat(0n, 7n)).toEqual({ n: 0n, d: 1n });
    expect(() => rat(1n, 0n)).toThrow(RangeError);
  });
  it('does exact arithmetic', () => {
    expect(add(rat(1n, 3n), rat(1n, 6n))).toEqual(rat(1n, 2n));
    expect(sub(rat(1n, 2n), rat(1n, 3n))).toEqual(rat(1n, 6n));
    expect(div(rat(1n, 2n), rat(1n, 4n))).toEqual(rat(2n));
    expect(toNumber(rat(1725n, 100n))).toBe(17.25);
  });
  it('parses decimals exactly', () => {
    expect(fromDecimal(25.168)).toEqual(rat(25168n, 1000n));
    expect(fromDecimal(-0.5)).toEqual(rat(-1n, 2n));
    expect(fromDecimal(3)).toEqual(rat(3n));
    expect(() => fromDecimal(1e-7)).toThrow(RangeError);
    expect(() => fromInt(1.5)).toThrow(RangeError);
  });
  it('rounds half up (away from zero)', () => {
    expect(roundHalfUp(rat(5n, 2n))).toBe(3n);
    expect(roundHalfUp(rat(249n, 100n))).toBe(2n);
    expect(roundHalfUp(rat(-5n, 2n))).toBe(-3n);
  });
});

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2027-02-29')).toBe(false);
    expect(isValidIsoDate('2027-13-01')).toBe(false);
    expect(isValidIsoDate('27-01-01')).toBe(false);
    expect(isValidIsoDate('2027-1-1')).toBe(false);
  });
  it('adds days across month and year ends', () => {
    expect(addDaysIso('2026-12-25', 10)).toBe('2027-01-04');
    expect(addDaysIso('2027-01-10', 45)).toBe('2027-02-24');
    expect(() => addDaysIso('nope', 1)).toThrow(RangeError);
  });
  it('counts calendar days', () => {
    expect(daysBetween('2027-02-24', '2027-03-31')).toBe(35);
    expect(daysBetween('2027-03-31', '2027-02-24')).toBe(-35);
  });
  it('acceptance date follows the objection', () => {
    expect(acceptanceDate({ deliveryDate: '2027-01-05', objection: { raised: false } })).toBe(
      '2027-01-05',
    );
    expect(
      acceptanceDate({
        deliveryDate: '2027-01-05',
        objection: { raised: true, resolvedDate: '2027-01-20' },
      }),
    ).toBe('2027-01-20');
  });
  it('due date uses rule days from config and caps agreements', () => {
    const rules = legalConfig.paymentRules;
    expect(dueDate('2027-01-10', { hasAgreement: false }, rules)).toEqual({
      dueDate: '2027-01-25',
      daysUsed: rules.noAgreementDays,
      capped: false,
    });
    expect(dueDate('2027-01-10', { hasAgreement: true, days: 45 }, rules).capped).toBe(false);
    expect(dueDate('2027-01-10', { hasAgreement: true, days: 46 }, rules)).toMatchObject({
      daysUsed: rules.maxAgreedDays,
      capped: true,
    });
    // A short agreement (shorter than the no-agreement default) is honoured as written.
    expect(dueDate('2027-01-10', { hasAgreement: true, days: 7 }, rules).dueDate).toBe(
      '2027-01-17',
    );
  });
  it('interest start, overdue and days left', () => {
    expect(interestStartDate('2027-02-28')).toBe('2027-03-01');
    expect(daysOverdue('2027-02-24', '2027-02-24')).toBe(0);
    expect(daysOverdue('2027-02-24', '2027-02-25')).toBe(1);
    expect(daysUntilDue('2027-02-24', '2027-02-20')).toBe(4);
    expect(daysUntilDue('2027-02-24', '2027-03-01')).toBe(0);
  });
});

describe('interest', () => {
  const rates = [
    { effectiveFrom: '2026-01-01', bankRatePct: 5 },
    { effectiveFrom: '2026-06-01', bankRatePct: 6 },
  ];
  const params = { rates, multiplier: 3, dayCountBasis: 365 };

  it('finds the rate in force, or fails clearly before the first rate', () => {
    expect(bankRateOn('2026-05-31', rates).bankRatePct).toBe(5);
    expect(bankRateOn('2026-06-01', rates).bankRatePct).toBe(6);
    expect(() => bankRateOn('2025-12-31', rates)).toThrow(DomainError);
  });

  it('is simple daily interest within a single month (independent check)', () => {
    // ₹1,00,000 for 10 days at 15%: 1,00,000 × 0.15 × 10 / 365 = 410.958904... rupees
    const r = section16Interest({
      ...params,
      principalPaise: 10_000_000,
      startDate: '2026-03-01',
      endDate: '2026-03-10',
    });
    expect(r.interestPaise).toEqual(rat(10_000_000n * 15n * 10n, 100n * 365n));
  });

  it('compounds at month end (independent check)', () => {
    // 31 days of March then 1 day of April on the compounded balance.
    const p = 10_000_000n;
    const march = rat(p * 15n * 31n, 36500n);
    const balance = add(rat(p), march);
    const april = div(add(balance, rat(0n)), rat(36500n, 15n));
    const r = section16Interest({
      ...params,
      principalPaise: 10_000_000,
      startDate: '2026-03-01',
      endDate: '2026-04-01',
    });
    expect(r.interestPaise).toEqual(add(march, april));
  });

  it('is zero when the start is after the end', () => {
    const r = section16Interest({
      ...params,
      principalPaise: 100,
      startDate: '2026-03-02',
      endDate: '2026-03-01',
    });
    expect(r).toEqual({ interestPaise: rat(0n), periods: [] });
  });

  it('fails clearly if a day has no bank rate on file', () => {
    expect(() =>
      section16Interest({
        ...params,
        principalPaise: 100,
        startDate: '2025-12-31',
        endDate: '2026-01-02',
      }),
    ).toThrow(DomainError);
  });
});

describe('tax', () => {
  it('finds the Indian tax year', () => {
    expect(taxYearOf('2027-03-31')).toEqual({
      startYear: 2026,
      label: '2026-27',
      yearEnd: '2027-03-31',
    });
    expect(taxYearOf('2027-04-01')).toEqual({
      startYear: 2027,
      label: '2027-28',
      yearEnd: '2028-03-31',
    });
    expect(taxYearOf('2099-06-01').label).toBe('2099-00');
  });
  it('picks the section by tax year, or none before the rule existed', () => {
    const s = legalConfig.taxSections;
    expect(taxSectionFor(taxYearOf('2023-04-01'), s)?.section).toBe('Section 43B(h)');
    expect(taxSectionFor(taxYearOf('2026-03-31'), s)?.section).toBe('Section 43B(h)');
    expect(taxSectionFor(taxYearOf('2026-04-01'), s)?.section).toBe('Section 37(2)(g)');
    expect(taxSectionFor(taxYearOf('2023-03-31'), s)).toBeNull();
  });
  it('year-end status boundaries', () => {
    expect(yearEndStatus('2027-03-31', '2027-03-31', '2027-03-31')).toBe('at_risk');
    expect(yearEndStatus('2027-04-01', '2027-03-31', '2027-03-31')).toBe('not_at_risk_this_year');
    expect(yearEndStatus('2027-03-31', '2027-04-01', '2027-03-31')).toBe('deferred');
  });
  it('single-rate exposure for a known buyer type, from data', () => {
    const company = taxExposure(50_000_000, 'company', taxRates);
    expect(company).toEqual({
      kind: 'single',
      ratePct: 25.168,
      amount: { paise: 12_584_000, rupees: 125_840 },
    });
    expect(taxExposure(50_000_000, 'firm_llp', taxRates)).toMatchObject({
      amount: { rupees: 174_720 },
    });
    expect(() => taxExposure(1, 'company', { ...taxRates, buyerTypes: [] })).toThrow(
      /company_concessional/,
    );
  });
  it('seasonality: lead with interest from April to December when at risk', () => {
    const strong = legalConfig.seasonality.taxArgumentStrongMonths;
    expect(leadWith('at_risk', '2026-12-31', strong)).toBe('interest');
    expect(leadWith('at_risk', '2027-01-01', strong)).toBe('tax');
    expect(leadWith('deferred', '2026-10-01', strong)).toBe('tax');
    expect(leadWith(null, '2027-01-01', strong)).toBe('interest');
  });
});

describe('eligibility', () => {
  it('micro and small with no flags are covered with no warnings', () => {
    expect(checkEligibility(base)).toEqual({ covered: true, warnings: [] });
    expect(checkEligibility({ ...base, category: 'small' })).toEqual({
      covered: true,
      warnings: [],
    });
  });
  it('not registered on Udyam is covered with the registration warning', () => {
    expect(checkEligibility({ ...base, category: 'not_registered', isTrader: true })).toEqual({
      covered: true,
      warnings: ['registration'],
    });
  });
  it('"not sure" about registration timing also warns', () => {
    expect(checkEligibility({ ...base, registeredBeforeSupply: 'not_sure' }).warnings).toEqual([
      'registration',
    ]);
  });
  it('medium is not covered regardless of other answers', () => {
    expect(checkEligibility({ ...base, category: 'medium', isTrader: true })).toEqual({
      covered: false,
      warnings: ['medium_enterprise'],
    });
  });
});

describe('calculate', () => {
  it('rejects an invalid as-of date', () => {
    expect(() => calculate(base, '2027-02-30')).toThrow(DomainError);
  });

  it('reports every invalid field with an i18n key that exists in en.json', () => {
    try {
      calculate(
        {
          ...base,
          amountPaise: 1.5,
          deliveryDate: '2027-02-30',
          objection: { raised: true, resolvedDate: '2027-04-02' },
        },
        '2027-03-31',
      );
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidInputError);
      const keys = (e as InvalidInputError).issues.map((i) => i.message);
      expect(keys).toEqual(
        expect.arrayContaining([
          'errors.amountRequired',
          'errors.dateInvalid',
          'errors.resolvedInFuture',
        ]),
      );
      for (const k of keys) expect(() => t(k)).not.toThrow();
    }
  });

  it('rejects an objection resolved before delivery', () => {
    expect(() =>
      calculate(
        {
          ...base,
          deliveryDate: '2027-01-10',
          objection: { raised: true, resolvedDate: '2027-01-09' },
        },
        '2027-03-31',
      ),
    ).toThrow(/errors.resolvedBeforeDelivery/);
  });

  it('accepts exactly ₹100 crore', () => {
    expect(calculate({ ...base, amountPaise: MAX_INVOICE_PAISE }, '2027-03-31').covered).toBe(true);
  });

  it('includes citations from legal-config and the disclaimer', () => {
    const r = calculate(base, '2027-03-31');
    expect(r.disclaimer).toBe(legalConfig.disclaimer);
    expect(r.citations).toEqual([
      { id: 'deadline', label: 'MSMED Act, 2006, Section 15' },
      { id: 'interest', label: 'MSMED Act, 2006, Section 16' },
      {
        id: 'tax',
        label: 'Income-tax Act, 2025, Section 37(2)(g)',
        url: 'https://accountune.com/msme-45-day-payment-rule-section-43bh',
      },
    ]);
    const old = calculate({ ...base, deliveryDate: '2025-06-01' }, '2025-12-31');
    expect(old.citations[2]).toEqual({ id: 'tax', label: 'Income-tax Act, 1961, Section 43B(h)' });
  });

  it('reports the current rate as 3 × bank rate', () => {
    const r = calculate(base, '2027-03-31');
    if (!r.covered) throw new Error('expected covered');
    expect(r.currentRate).toEqual({ bankRatePct: 5.75, annualInterestPct: 17.25, multiplier: 3 });
  });

  it('a single known buyer type gives a single exposure', () => {
    const r = calculate({ ...base, buyerType: 'company' }, '2027-03-31');
    if (!r.covered) throw new Error('expected covered');
    expect(r.tax?.exposure.kind).toBe('single');
    expect(r.tax?.daysToYearEnd).toBe(0);
  });

  it('counts days left to 31 March while at risk', () => {
    const r = calculate(base, '2027-02-01');
    if (!r.covered) throw new Error('expected covered');
    expect(r.tax?.status).toBe('at_risk');
    expect(r.tax?.daysToYearEnd).toBe(58);
  });

  it('before the tax rule existed: no tax result, a warning, and no tax citation', () => {
    const r = calculate({ ...base, deliveryDate: '2023-03-01' }, '2023-04-30');
    if (!r.covered) throw new Error('expected covered');
    expect(r.tax).toBeNull();
    expect(r.warnings).toContain('tax_rule_not_applicable');
    expect(r.citations.map((c) => c.id)).toEqual(['deadline', 'interest']);
    expect(r.leadWith).toBe('interest');
  });

  it('rejects invoices delivered before the first bank rate on file (validation, not a crash)', () => {
    const first = bankRates.rates[0]?.effectiveFrom ?? '';
    expect(EARLIEST_SUPPORTED_DATE).toBe(first);
    const early = addDaysIso(first, -1);
    // A late as-of date: interest days would all need a rate, but the delivery date is too old.
    expect(() => calculate({ ...base, deliveryDate: early }, '2026-11-07')).toThrow(
      /errors\.deliveryTooOld/,
    );
    expect(() => calculate({ ...base, deliveryDate: early }, '2026-11-07')).toThrow(
      InvalidInputError,
    );
    expect(calculate({ ...base, deliveryDate: first }, '2026-11-07').covered).toBe(true);
    expect(t('errors.deliveryTooOld', { date: '8 Feb 2023' })).toBe(
      'We can only check invoices delivered on or after 8 Feb 2023.',
    );
  });
});

describe('i18n', () => {
  it('fills placeholders and leaves unknown ones alone', () => {
    expect(t('status.at_risk', { days: 3 })).toBe(
      "If unpaid on 31 March, your buyer can't claim this expense this year. Days left: 3.",
    );
    expect(t('status.notDueYet')).toBe('Not due yet. Your buyer has {{days}} days left.');
  });
  it('throws on a missing key', () => {
    expect(() => t('nope.missing')).toThrow(/Missing i18n key/);
    expect(() => t('warnings')).toThrow(/Missing i18n key/);
  });
  it('wording rule: never says the deduction is lost', () => {
    expect(JSON.stringify(t('status.deferred', { taxYear: '2026-27' }))).not.toMatch(/lose|lost/i);
  });
});

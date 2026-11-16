// One test per case in docs/TEST_CASES.md.
// Expected values are copied from that file and must NOT be edited to make a test pass.
// If one fails, the implementation (or the spec) is wrong; raise it, don't change the number.
import { calculate } from '../../src/domain/calculate';
import type { CalculationInput, CoveredResult } from '../../src/domain/types';
import { t } from '../../src/i18n';

const rupees = (r: number) => r * 100; // test helper: rupees -> paise

function input(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    category: 'micro',
    isTrader: false,
    registeredBeforeSupply: 'yes',
    amountPaise: rupees(100000),
    deliveryDate: '2027-01-10',
    objection: { raised: false },
    agreement: { hasAgreement: false },
    buyerType: 'not_sure',
    ...overrides,
  };
}

function covered(i: CalculationInput, asOf: string): CoveredResult {
  const result = calculate(i, asOf);
  if (!result.covered) throw new Error('expected a covered result');
  return result;
}

type NumberCase = {
  id: string;
  amount: number; // rupees
  delivery: string;
  objectionResolved?: string;
  agreementDays: number | null; // null = no written agreement
  asOf: string;
  due: string;
  interestFrom: string;
  overdue: number;
  interest: number; // rupees
  taxLow: number; // rupees
  taxHigh: number; // rupees
  section: string;
  act: string;
  status: 'at_risk' | 'not_at_risk_this_year' | 'deferred';
};

const IT_2025 = 'Income-tax Act, 2025';
const IT_1961 = 'Income-tax Act, 1961';
const S37 = 'Section 37(2)(g)';
const S43B = 'Section 43B(h)';

const numberCases: NumberCase[] = [
  {
    id: 'TC1',
    amount: 500000,
    delivery: '2027-01-10',
    agreementDays: 45,
    asOf: '2027-03-31',
    due: '2027-02-24',
    interestFrom: '2027-02-25',
    overdue: 35,
    interest: 8284,
    taxLow: 125840,
    taxHigh: 174720,
    section: S37,
    act: IT_2025,
    status: 'at_risk',
  },
  {
    id: 'TC2',
    amount: 200000,
    delivery: '2026-12-01',
    agreementDays: null,
    asOf: '2027-03-31',
    due: '2026-12-16',
    interestFrom: '2026-12-17',
    overdue: 105,
    interest: 10107,
    taxLow: 50336,
    taxHigh: 69888,
    section: S37,
    act: IT_2025,
    status: 'at_risk',
  },
  {
    id: 'TC3',
    amount: 300000,
    delivery: '2027-03-10',
    agreementDays: 45,
    asOf: '2027-03-31',
    due: '2027-04-24',
    interestFrom: '2027-04-25',
    overdue: 0,
    interest: 0,
    taxLow: 75504,
    taxHigh: 104832,
    section: S37,
    act: IT_2025,
    status: 'not_at_risk_this_year',
  },
  {
    id: 'TC4',
    amount: 100000,
    delivery: '2027-01-01',
    agreementDays: 60,
    asOf: '2027-03-31',
    due: '2027-02-15',
    interestFrom: '2027-02-16',
    overdue: 44,
    interest: 2088,
    taxLow: 25168,
    taxHigh: 34944,
    section: S37,
    act: IT_2025,
    status: 'at_risk',
  },
  {
    id: 'TC6',
    amount: 150000,
    delivery: '2027-01-05',
    objectionResolved: '2027-01-20',
    agreementDays: 30,
    asOf: '2027-03-31',
    due: '2027-02-19',
    interestFrom: '2027-02-20',
    overdue: 40,
    interest: 2845,
    taxLow: 37752,
    taxHigh: 52416,
    section: S37,
    act: IT_2025,
    status: 'at_risk',
  },
  {
    id: 'TC7',
    amount: 400000,
    delivery: '2026-02-01',
    agreementDays: 30,
    asOf: '2026-03-31',
    due: '2026-03-03',
    interestFrom: '2026-03-04',
    overdue: 28,
    interest: 5063,
    taxLow: 100672,
    taxHigh: 139776,
    section: S43B,
    act: IT_1961,
    status: 'at_risk',
  },
  {
    id: 'TC8',
    amount: 1000000,
    delivery: '2026-08-01',
    agreementDays: null,
    asOf: '2026-10-31',
    due: '2026-08-16',
    interestFrom: '2026-08-17',
    overdue: 76,
    interest: 35259,
    taxLow: 251680,
    taxHigh: 349440,
    section: S37,
    act: IT_2025,
    status: 'at_risk',
  },
  {
    id: 'TC9',
    amount: 50000,
    delivery: '2028-02-15',
    agreementDays: null,
    asOf: '2028-03-31',
    due: '2028-03-01',
    interestFrom: '2028-03-02',
    overdue: 30,
    interest: 709,
    taxLow: 12584,
    taxHigh: 17472,
    section: S37,
    act: IT_2025,
    status: 'at_risk',
  },
  {
    id: 'TC10',
    amount: 400000,
    delivery: '2026-02-01',
    agreementDays: 30,
    asOf: '2026-04-15',
    due: '2026-03-03',
    interestFrom: '2026-03-04',
    overdue: 43,
    interest: 7810,
    taxLow: 100672,
    taxHigh: 139776,
    section: S43B,
    act: IT_1961,
    status: 'deferred',
  },
];

function inputFor(c: NumberCase): CalculationInput {
  return input({
    amountPaise: rupees(c.amount),
    deliveryDate: c.delivery,
    objection: c.objectionResolved
      ? { raised: true, resolvedDate: c.objectionResolved }
      : { raised: false },
    agreement:
      c.agreementDays === null
        ? { hasAgreement: false }
        : { hasAgreement: true, days: c.agreementDays },
    buyerType: 'not_sure',
  });
}

describe('TEST_CASES.md number cases', () => {
  describe.each(numberCases)('$id', (c) => {
    const r = covered(inputFor(c), c.asOf);

    it('due date', () => expect(r.dueDate).toBe(c.due));
    it('interest start', () => expect(r.interestStartDate).toBe(c.interestFrom));
    it('days overdue', () => expect(r.daysOverdue).toBe(c.overdue));
    it('interest to the rupee', () => expect(r.interest.rupees).toBe(c.interest));
    it('tax low and high to the rupee', () => {
      expect(r.tax?.exposure).toMatchObject({
        kind: 'range',
        low: { rupees: c.taxLow },
        high: { rupees: c.taxHigh },
      });
    });
    it('tax section and act', () => {
      expect(r.tax?.section).toBe(c.section);
      expect(r.tax?.act).toBe(c.act);
    });
    it('year-end status', () => expect(r.tax?.status).toBe(c.status));
  });
});

describe('TEST_CASES.md case-specific notes', () => {
  const byId = (id: string) => {
    const c = numberCases.find((x) => x.id === id);
    if (!c) throw new Error(id);
    return covered(inputFor(c), c.asOf);
  };

  it('TC3: deadline after 31 March gives a warning, and no interest yet', () => {
    const r = byId('TC3');
    expect(r.warnings).toContain('due_after_year_end');
    expect(r.isOverdue).toBe(false);
  });

  it('TC4: 60 agreed days are capped at 45 with a warning', () => {
    const r = byId('TC4');
    expect(r.agreedDaysUsed).toBe(45);
    expect(r.warnings).toContain('agreement_capped');
    expect(t('warnings.agreement_capped', { maxDays: 45 })).toBe(
      'The law caps agreed payment periods at 45 days, so we used 45.',
    );
  });

  it('TC6: acceptance date is the day the objection was resolved', () => {
    expect(byId('TC6').acceptanceDate).toBe('2027-01-20');
  });

  it('TC8: leads with interest (seasonality) and crosses the 2026-10-07 rate change', () => {
    const r = byId('TC8');
    expect(r.leadWith).toBe('interest');
    expect(r.interestPeriods).toEqual([
      { from: '2026-08-17', to: '2026-10-06', bankRatePct: 5.5, annualInterestPct: 16.5 },
      { from: '2026-10-07', to: '2026-10-31', bankRatePct: 5.75, annualInterestPct: 17.25 },
    ]);
  });

  it('TC1: in March, at risk leads with the tax argument', () => {
    expect(byId('TC1').leadWith).toBe('tax');
  });

  it('TC9: leap year, Feb 2028 has 29 days', () => {
    expect(byId('TC9').dueDate).toBe('2028-03-01');
  });

  it('TC10: after 31 March the status is deferred', () => {
    const r = byId('TC10');
    expect(r.tax?.status).toBe('deferred');
    expect(r.tax?.taxYear).toBe('2025-26');
  });
});

describe('TEST_CASES.md eligibility cases', () => {
  it('TC5: Medium is not covered, no legal citations', () => {
    const r = calculate(input({ category: 'medium' }), '2027-03-31');
    expect(r.covered).toBe(false);
    expect(r.citations).toEqual([]);
    expect(r.warnings).toContain('medium_enterprise');
    expect(t('eligibility.mediumNotCovered', { maxDays: 45 })).toBe(
      'The 45-day rule protects only micro and small businesses.',
    );
  });

  it('TC12: Small trader is covered, with trader warning', () => {
    const r = calculate(input({ category: 'small', isTrader: true }), '2027-03-31');
    expect(r.covered).toBe(true);
    expect(r.warnings).toContain('trader');
    expect(t('warnings.trader')).toBe(
      'Traders are generally not covered by the delayed-payment rules. Check with your CA.',
    );
  });

  it('TC13: registered after supply is covered, with registration warning', () => {
    const r = calculate(input({ registeredBeforeSupply: 'no' }), '2027-03-31');
    expect(r.covered).toBe(true);
    expect(r.warnings).toContain('registration');
    expect(t('warnings.registration')).toBe(
      'Your Udyam registration should exist before the supply date for these protections. Check with your CA.',
    );
  });
});

describe('TEST_CASES.md validation cases', () => {
  // calculate() throws InvalidInputError with i18n keys; the keys resolve to the exact copy.
  function errorKeys(i: CalculationInput, asOf = '2027-03-31'): string[] {
    try {
      calculate(i, asOf);
    } catch (e) {
      return (e as { issues: { message: string }[] }).issues.map((x) => x.message);
    }
    return [];
  }

  it.each([0, -100])('TC14: amount %i paise -> "Enter an amount above ₹0"', (amountPaise) => {
    expect(errorKeys(input({ amountPaise }))).toEqual(['errors.amountTooLow']);
    expect(t('errors.amountTooLow')).toBe('Enter an amount above ₹0');
  });

  it('TC15: amount above ₹100 crore -> "That\'s above what this tool supports"', () => {
    expect(errorKeys(input({ amountPaise: rupees(1_000_000_000) + 1 }))).toEqual([
      'errors.amountTooHigh',
    ]);
    expect(errorKeys(input({ amountPaise: rupees(1_000_000_000) }))).toEqual([]);
    expect(t('errors.amountTooHigh')).toBe("That's above what this tool supports");
  });

  it('TC16: delivery date in the future -> "Delivery date can\'t be in the future"', () => {
    expect(errorKeys(input({ deliveryDate: '2027-04-01' }))).toEqual(['errors.deliveryInFuture']);
    expect(t('errors.deliveryInFuture')).toBe("Delivery date can't be in the future");
  });

  it('TC17: agreement "Yes" with 0 days -> "Enter the agreed number of days"', () => {
    expect(errorKeys(input({ agreement: { hasAgreement: true, days: 0 } }))).toEqual([
      'errors.agreementDaysRequired',
    ]);
    expect(t('errors.agreementDaysRequired')).toBe('Enter the agreed number of days');
  });

  it('TC17: agreement "Yes" with blank days -> same message', () => {
    const blank = { hasAgreement: true } as unknown as CalculationInput['agreement'];
    expect(errorKeys(input({ agreement: blank }))).toEqual(['errors.agreementDaysRequired']);
    const nan = { hasAgreement: true, days: Number.NaN };
    expect(errorKeys(input({ agreement: nan }))).toEqual(['errors.agreementDaysRequired']);
  });

  it('TC18: as-of before due date -> 0 overdue, 0 interest, "Not due yet" message', () => {
    const r = covered(
      input({ deliveryDate: '2027-01-10', agreement: { hasAgreement: true, days: 45 } }),
      '2027-02-01',
    );
    expect(r.daysOverdue).toBe(0);
    expect(r.interest).toEqual({ paise: 0, rupees: 0 });
    expect(r.isOverdue).toBe(false);
    expect(r.daysUntilDue).toBe(23);
    expect(t('status.notDueYet', { days: r.daysUntilDue })).toBe(
      'Not due yet. Your buyer has 23 days left.',
    );
  });
});

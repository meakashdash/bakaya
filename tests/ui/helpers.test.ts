import {
  caretAfterFormat,
  countSignificant,
  formatAmountInput,
  parseAmountInput,
} from '../../src/components/calculator/amount';
import { emptyFormValues, makeFormSchema } from '../../src/components/calculator/formSchema';
import { calculate } from '../../src/domain/calculate';
import type { CalculationInput } from '../../src/domain/types';
import { formatPercent, pluralKey } from '../../src/i18n';
import { buildWhatsAppText, whatsAppUrl } from '../../src/letters/whatsapp';

describe('amount input', () => {
  it.each([
    ['500000', '5,00,000'],
    ['5,00,000', '5,00,000'],
    ['₹ 12500000', '1,25,00,000'],
    ['00042', '42'],
    ['1234.5', '1,234.5'],
    ['1234.567', '1,234.56'],
    ['1.2.3', '1.23'],
    ['.5', '0.5'],
    ['abc', ''],
    ['-500', '500'],
    ['12345678901234567', '12,34,56,78,90,123'],
  ])('formats %s as %s', (raw, expected) => expect(formatAmountInput(raw)).toBe(expected));

  it.each([
    ['', undefined],
    ['5,00,000', 50_000_000],
    ['8284.49', 828_449],
    ['8284.5', 828_450],
    ['-100', -10_000],
    ['0', 0],
  ])('parses %s', (raw, expected) => expect(parseAmountInput(raw)).toBe(expected));

  it('returns NaN for text that is not an amount', () => {
    expect(parseAmountInput('1.234')).toBeNaN();
    expect(parseAmountInput('.')).toBeNaN();
  });

  it('keeps the caret after the same digit when commas move', () => {
    expect(countSignificant('5,00,0')).toBe(4);
    expect(caretAfterFormat('50,000', 4)).toBe(5);
    expect(caretAfterFormat('5,00,000', 0)).toBe(0);
    expect(caretAfterFormat('5,00,000', 99)).toBe(8);
  });
});

describe('form schema', () => {
  const schema = makeFormSchema('2027-03-31');
  const valid = {
    ...emptyFormValues,
    category: 'medium',
    isTrader: 'yes',
    registeredBeforeSupply: 'yes',
    amount: '5,00,000',
    deliveryDate: '2027-01-10',
    objectionRaised: 'no',
    objectionResolvedDate: '2027-01-01',
    hasAgreement: 'no',
    agreementDays: '99',
  };

  it('builds a CalculationInput, ignoring hidden answers', () => {
    const r = schema.safeParse(valid);
    expect(r.success && r.data).toEqual({
      category: 'medium',
      isTrader: false, // the trader question isn't asked for Medium
      registeredBeforeSupply: 'yes',
      amountPaise: 50_000_000,
      deliveryDate: '2027-01-10',
      objection: { raised: false },
      agreement: { hasAgreement: false },
      buyerType: 'not_sure',
    });
  });

  const issuesOf = (values: typeof valid) => {
    const r = schema.safeParse(values);
    return r.success ? [] : r.error.issues.map((i) => [i.path.join('.'), i.message]);
  };

  it('maps domain errors back to form fields', () => {
    expect(issuesOf({ ...valid, hasAgreement: 'yes', agreementDays: 'x' })).toEqual([
      ['agreementDays', 'errors.agreementDaysRequired'],
    ]);
    expect(
      issuesOf({ ...valid, objectionRaised: 'yes', objectionResolvedDate: '2027-01-09' }),
    ).toEqual([['objectionResolvedDate', 'errors.resolvedBeforeDelivery']]);
  });

  it('requires the objection date when the answer is Yes', () => {
    const r = schema.safeParse({ ...valid, objectionRaised: 'yes', objectionResolvedDate: '' });
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toEqual([
      'errors.resolvedRequired',
    ]);
  });

  it('rejects an unknown buyer type', () => {
    const r = schema.safeParse({ ...valid, buyerType: '' });
    expect(r.success ? [] : r.error.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['buyerType', 'errors.choiceRequired'],
    ]);
  });
});

describe('i18n helpers', () => {
  it('plural keys and percentages', () => {
    expect(pluralKey('x', 1)).toBe('x_one');
    expect(pluralKey('x', 0)).toBe('x');
    expect(pluralKey('x', 2)).toBe('x');
    expect(formatPercent(17.25)).toBe('17.25%');
    expect(formatPercent(16.5)).toBe('16.5%');
    expect(formatPercent(25.168)).toBe('25.168%');
  });
});

describe('WhatsApp text', () => {
  const base: CalculationInput = {
    category: 'micro',
    isTrader: false,
    registeredBeforeSupply: 'yes',
    amountPaise: 50_000_000,
    deliveryDate: '2027-01-10',
    objection: { raised: false },
    agreement: { hasAgreement: true, days: 45 },
    buyerType: 'not_sure',
  };

  it('not yet due: no interest or tax-year claims beyond the deadline', () => {
    const r = calculate(base, '2027-02-01');
    const text = buildWhatsAppText(base, r, 'https://x.test');
    expect(text).toContain('payment is due by 24 Feb 2027.');
    expect(text).not.toContain('Interest under');
    // Still at risk for 31 March, so the tax line is included.
    expect(text).toContain("If unpaid by 31 Mar 2027, it also can't be claimed");
  });

  it('deferred (TC10): no "this tax year" line once 31 March has passed', () => {
    const input = {
      ...base,
      amountPaise: 40_000_000,
      deliveryDate: '2026-02-01',
      agreement: { hasAgreement: true as const, days: 30 },
    };
    const text = buildWhatsAppText(input, calculate(input, '2026-04-15'), 'https://x.test');
    expect(text).toContain('Interest under Section 16 is now ₹7,810.');
    expect(text).not.toContain('this tax year');
  });

  it('encodes the text for wa.me', () => {
    expect(whatsAppUrl('a b&c\n₹')).toBe('https://wa.me/?text=a%20b%26c%0A%E2%82%B9');
  });
});

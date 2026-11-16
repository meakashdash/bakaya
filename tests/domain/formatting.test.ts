// "Formatting cases" from docs/TEST_CASES.md, plus a few edge cases.
import { formatDisplayDate } from '../../src/domain/dates';
import { formatPaise, formatRupees, paiseToRupees, rupeesToPaise } from '../../src/domain/money';

describe('TEST_CASES.md formatting cases', () => {
  it('500000 rupees -> ₹5,00,000', () => expect(formatRupees(500000)).toBe('₹5,00,000'));
  it('12500000 rupees -> ₹1,25,00,000', () => expect(formatRupees(12500000)).toBe('₹1,25,00,000'));
  it('2027-02-24 -> 24 Feb 2027', () =>
    expect(formatDisplayDate('2027-02-24')).toBe('24 Feb 2027'));
  it('8284.49 rupees -> ₹8,284', () => expect(formatPaise(rupeesToPaise(8284.49))).toBe('₹8,284'));
  it('8284.50 rupees -> ₹8,285', () => expect(formatPaise(rupeesToPaise(8284.5))).toBe('₹8,285'));
});

describe('money edge cases', () => {
  it('small and zero amounts', () => {
    expect(formatRupees(0)).toBe('₹0');
    expect(formatRupees(999)).toBe('₹999');
    expect(formatRupees(1000)).toBe('₹1,000');
    expect(formatRupees(100000)).toBe('₹1,00,000');
  });
  it('negative amounts keep the sign before ₹', () => expect(formatRupees(-1500)).toBe('-₹1,500'));
  it('₹100 crore', () => expect(formatRupees(1_000_000_000)).toBe('₹1,00,00,00,000'));
  it('rounds half up only at display', () => {
    expect(paiseToRupees(49)).toBe(0);
    expect(paiseToRupees(50)).toBe(1);
    expect(paiseToRupees(149)).toBe(1);
    expect(paiseToRupees(150)).toBe(2);
  });
  it('converts rupees to paise without float error', () => {
    expect(rupeesToPaise(0.1)).toBe(10);
    expect(rupeesToPaise(1.15)).toBe(115);
    expect(rupeesToPaise(500000)).toBe(50000000);
  });
  it('rejects fractions of a paisa and non-integer display input', () => {
    expect(() => rupeesToPaise(1.005)).toThrow();
    expect(() => formatRupees(1.5)).toThrow();
    expect(() => formatPaise(1.5)).toThrow();
  });
});

describe('date display edge cases', () => {
  it('single-digit day has no leading zero', () =>
    expect(formatDisplayDate('2027-01-05')).toBe('5 Jan 2027'));
  it('leap day', () => expect(formatDisplayDate('2028-02-29')).toBe('29 Feb 2028'));
  it('rejects an invalid date', () => expect(() => formatDisplayDate('2027-02-30')).toThrow());
});

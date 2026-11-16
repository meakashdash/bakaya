// Invoice amount input: Indian comma formatting as you type, and exact parsing to paise.

/** More than enough for ₹100 crore (10 digits); stops absurd input early. */
const MAX_INTEGER_DIGITS = 13;

const grouping = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** "500000" -> "5,00,000", "1234.5" -> "1,234.5". Keeps at most 2 decimals; drops everything else. */
export function formatAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  const intDigits = (dot === -1 ? cleaned : cleaned.slice(0, dot))
    .replace(/^0+(?=\d)/, '')
    .slice(0, MAX_INTEGER_DIGITS);
  const grouped = intDigits === '' ? '' : grouping.format(BigInt(intDigits));
  if (dot === -1) return grouped;
  const frac = cleaned
    .slice(dot + 1)
    .replace(/\./g, '')
    .slice(0, 2);
  return `${grouped === '' ? '0' : grouped}.${frac}`;
}

/**
 * Parse what the user typed into integer paise, without floating point.
 * Returns undefined for an empty field and NaN for anything that isn't an amount.
 */
export function parseAmountInput(value: string): number | undefined {
  const s = value.replace(/[,\s₹]/g, '');
  if (s === '') return undefined;
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return Number.NaN;
  const [, sign = '', whole = '0', frac = ''] = m;
  const paise = BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0'));
  const n = Number(paise);
  return sign === '-' ? -n : n;
}

/** Where the caret should go after reformatting: after the same number of digits/dots as before. */
export function caretAfterFormat(formatted: string, significantCharsBefore: number): number {
  let pos = 0;
  let seen = 0;
  while (pos < formatted.length && seen < significantCharsBefore) {
    if (/[\d.]/.test(formatted.charAt(pos))) seen++;
    pos++;
  }
  return pos;
}

export const countSignificant = (s: string): number => s.replace(/[^\d.]/g, '').length;

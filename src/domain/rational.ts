// Exact rational arithmetic on bigint. Used so money is never touched by floating point:
// interest is accrued as an exact fraction of a paisa and rounded only once, for display.

export type Rational = { readonly n: bigint; readonly d: bigint }; // invariant: d > 0, reduced

const abs = (x: bigint): bigint => (x < 0n ? -x : x);

function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function rat(n: bigint, d: bigint = 1n): Rational {
  if (d === 0n) throw new RangeError('Division by zero');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export const ZERO: Rational = rat(0n);

export const add = (a: Rational, b: Rational): Rational => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational): Rational => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational): Rational => rat(a.n * b.n, a.d * b.d);
export const div = (a: Rational, b: Rational): Rational => rat(a.n * b.d, a.d * b.n);

/** Exact value of a plain decimal number such as 5.75 or 25.168 (as written in the data files). */
export function fromDecimal(value: number): Rational {
  const s = String(value);
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) throw new RangeError(`Not a plain decimal: ${s}`);
  const [, sign = '', whole = '0', frac = ''] = m;
  return rat(BigInt(`${sign}${whole}${frac}`), 10n ** BigInt(frac.length));
}

export const fromInt = (value: number): Rational => {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Not a safe integer: ${value}`);
  return rat(BigInt(value));
};

/** Round to the nearest integer, halves away from zero (i.e. half-up for the positive amounts we use). */
export function roundHalfUp(r: Rational): bigint {
  if (r.n < 0n) return -roundHalfUp(rat(-r.n, r.d));
  return (2n * r.n + r.d) / (2n * r.d);
}

/** For display of percentages only; never use for money. */
export const toNumber = (r: Rational): number => Number(r.n) / Number(r.d);

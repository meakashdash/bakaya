// Money helpers. Money is integer paise everywhere in logic; rounding to whole rupees
// (half-up) happens only for display.
import { fromDecimal, mul, rat, roundHalfUp, type Rational } from './rational';

/** An amount for display: exact paise (rounded half-up) and whole rupees (rounded half-up from the exact value). */
export type Amount = { paise: number; rupees: number };

/** Build an Amount from an exact value in paise. Rupees are rounded from the exact value, not from rounded paise, so there is no double rounding. */
export function amountFromPaise(exactPaise: Rational): Amount {
  return {
    paise: Number(roundHalfUp(exactPaise)),
    rupees: Number(roundHalfUp(mul(exactPaise, rat(1n, 100n)))),
  };
}

/** Convert a rupee amount typed by a user (up to 2 decimals) to integer paise, exactly. */
export function rupeesToPaise(rupees: number): number {
  const p = mul(fromDecimal(rupees), rat(100n));
  if (p.d !== 1n) throw new RangeError(`Amount has fractions of a paisa: ${rupees}`);
  return Number(p.n);
}

/** Integer paise -> whole rupees, rounded half-up. */
export function paiseToRupees(paise: number): number {
  assertInteger(paise);
  return Number(roundHalfUp(rat(BigInt(paise), 100n)));
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Whole rupees in Indian grouping: 500000 -> "₹5,00,000". */
export function formatRupees(rupees: number): string {
  assertInteger(rupees);
  const sign = rupees < 0 ? '-' : '';
  return `${sign}₹${inr.format(Math.abs(rupees))}`;
}

/** Integer paise, rounded half-up to whole rupees, in Indian grouping. */
export const formatPaise = (paise: number): string => formatRupees(paiseToRupees(paise));

function assertInteger(n: number): void {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Expected a whole number, got ${n}`);
}

// Section 16 MSMED Act interest (LEGAL_RULES.md §4):
// rate = interestMultiplier × RBI bank rate in force on each day; compound interest with
// monthly rests. Interest accrues day by day at balance × multiplier × rate ÷ 100 ÷ dayCountBasis;
// at the end of each calendar month the month's accrued interest is added to the balance.
// Accrues from the interest start date through the as-of date inclusive; a partial final month
// is added at the as-of date. All arithmetic is exact (rational paise).
import { addDaysIso, isLastDayOfMonthIso } from './dates';
import {
  ZERO,
  add,
  fromDecimal,
  fromInt,
  mul,
  rat,
  sub,
  toNumber,
  type Rational,
} from './rational';
import { DomainError, type IsoDate, type RatePeriod } from './types';

export type BankRateEntry = { effectiveFrom: IsoDate; bankRatePct: number };

/** The bank rate in force on `date`. `rates` must be sorted oldest first. */
export function bankRateOn(date: IsoDate, rates: readonly BankRateEntry[]): BankRateEntry {
  let found: BankRateEntry | undefined;
  for (const r of rates) {
    if (r.effectiveFrom <= date) found = r;
    else break;
  }
  if (!found) {
    throw new DomainError('no_bank_rate', `No RBI bank rate on file for ${date}`);
  }
  return found;
}

/** multiplier × bank rate, as a percentage (e.g. 3 × 5.75 = 17.25). */
export const annualInterestPct = (bankRatePct: number, multiplier: number): number =>
  toNumber(mul(fromDecimal(multiplier), fromDecimal(bankRatePct)));

export type InterestParams = {
  principalPaise: number;
  /** First day interest accrues (the day after the due date). */
  startDate: IsoDate;
  /** Last day interest accrues, inclusive (the as-of date). */
  endDate: IsoDate;
  rates: readonly BankRateEntry[];
  multiplier: number;
  dayCountBasis: number;
};

export function section16Interest(p: InterestParams): {
  interestPaise: Rational;
  periods: RatePeriod[];
} {
  if (p.startDate > p.endDate) return { interestPaise: ZERO, periods: [] };

  const principal = fromInt(p.principalPaise);
  const multiplier = fromDecimal(p.multiplier);
  const perDayDivisor = rat(1n, 100n * BigInt(p.dayCountBasis));
  const dailyFactorCache = new Map<BankRateEntry, Rational>();
  const dailyFactor = (r: BankRateEntry): Rational => {
    let f = dailyFactorCache.get(r);
    if (!f) {
      f = mul(mul(multiplier, fromDecimal(r.bankRatePct)), perDayDivisor);
      dailyFactorCache.set(r, f);
    }
    return f;
  };

  let balance = principal;
  let accrued = ZERO;
  const runs: { entry: BankRateEntry; from: IsoDate; to: IsoDate }[] = [];

  for (let day = p.startDate; day <= p.endDate; day = addDaysIso(day, 1)) {
    const entry = bankRateOn(day, p.rates);
    accrued = add(accrued, mul(balance, dailyFactor(entry)));

    const last = runs.at(-1);
    if (last?.entry === entry) last.to = day;
    else runs.push({ entry, from: day, to: day });

    // Monthly rest: compound at each calendar month end, and at the as-of date.
    if (isLastDayOfMonthIso(day) || day === p.endDate) {
      balance = add(balance, accrued);
      accrued = ZERO;
    }
  }

  return {
    interestPaise: sub(balance, principal),
    periods: runs.map((r) => toPeriod(r, p.multiplier)),
  };
}

function toPeriod(
  c: { entry: BankRateEntry; from: IsoDate; to: IsoDate },
  multiplier: number,
): RatePeriod {
  return {
    from: c.from,
    to: c.to,
    bankRatePct: c.entry.bankRatePct,
    annualInterestPct: annualInterestPct(c.entry.bankRatePct, multiplier),
  };
}

// Typed, validated access to /data/*.json — the ONLY place legal values live.
// Each file is checked with zod when it loads, so a typo in a data file fails loudly
// (in tests and at build) instead of silently producing a wrong number.
import { z } from 'zod';
import bankRatesJson from '../../data/bank-rates.json';
import legalConfigJson from '../../data/legal-config.json';
import taxRatesJson from '../../data/tax-rates.json';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const taxYearLabel = z.string().regex(/^\d{4}-\d{2}$/);
const labelPair = z.object({ label: z.string().min(1), short: z.string().min(1) });
// Hindi versions of the legal labels live next to the English ones, so a section number can
// never differ between the two languages without a test noticing (tests/i18n-hi.test.ts).
const sectionLabel = labelPair.extend({ hi: labelPair });
const sizeLimit = z.object({ investmentCr: z.number().positive(), turnoverCr: z.number().positive() });

const bankRatesSchema = z.object({
  lastReviewed: isoDate,
  rates: z
    .array(
      z.object({
        effectiveFrom: isoDate,
        bankRatePct: z.number().positive(),
        verified: z.boolean(),
        source: z.string().optional(),
        note: z.string().optional(),
      }),
    )
    .min(1),
});

const legalConfigSchema = z.object({
  lastReviewed: isoDate,
  caReviewed: z.boolean(),
  paymentRules: z.object({
    noAgreementDays: z.number().int().positive(),
    maxAgreedDays: z.number().int().positive(),
    objectionWindowDays: z.number().int().positive(),
    interestMultiplier: z.number().positive(),
    dayCountBasis: z.number().int().positive(),
    // Only monthly rests are implemented; any other value must fail loudly.
    compounding: z.literal('monthly_rests'),
  }),
  taxSections: z
    .array(
      z.object({
        fromTaxYear: taxYearLabel,
        toTaxYear: taxYearLabel.nullable(),
        act: z.string(),
        section: z.string(),
        source: z.string().optional(),
        hi: z.object({ act: z.string().min(1), section: z.string().min(1) }),
      }),
    )
    .min(1),
  msmedSections: z.object({
    deadline: sectionLabel,
    interest: sectionLabel,
    recovery: sectionLabel,
    interestNotDeductible: sectionLabel,
  }),
  classificationFrom2025: z.object({
    effectiveFrom: isoDate,
    notification: z.string(),
    micro: sizeLimit,
    small: sizeLimit,
    medium: sizeLimit,
  }),
  complaintPortal: z.object({
    name: z.string(),
    note: z.string(),
    onlyRouteSince: isoDate,
    url: z.string(),
    urlVerified: z.boolean(),
    urlNote: z.string().optional(),
    hi: z.object({ name: z.string().min(1) }),
  }),
  sources: z.array(
    z.object({
      id: z.string(),
      topics: z.array(z.enum(['who', 'deadline', 'interest', 'tax', 'complaint'])),
      label: z.string(),
      url: z.url({ protocol: /^https$/ }),
      verified: z.boolean(),
    }),
  ),
  amendment2026Notified: z.boolean(),
  seasonality: z.object({
    taxArgumentStrongMonths: z.array(z.number().int().min(1).max(12)),
  }),
  disclaimer: z.string().min(1),
  disclaimerTranslations: z.object({ hi: z.string().min(1) }),
});

const taxRatesSchema = z.object({
  lastReviewed: isoDate,
  buyerTypes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      effectiveRatePct: z.number().positive(),
      verified: z.boolean(),
    }),
  ),
  unknownRange: z.object({ lowPct: z.number().positive(), highPct: z.number().positive() }),
});

export type BankRatesData = z.infer<typeof bankRatesSchema>;
export type LegalConfig = z.infer<typeof legalConfigSchema>;
export type TaxRatesData = z.infer<typeof taxRatesSchema>;
export type TaxSectionEntry = LegalConfig['taxSections'][number];

const parsedBankRates = bankRatesSchema.parse(bankRatesJson);

export const bankRates: BankRatesData = {
  ...parsedBankRates,
  // Sorted oldest first so "rate in force on a day" is a simple scan.
  rates: [...parsedBankRates.rates].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)),
};
export const legalConfig: LegalConfig = legalConfigSchema.parse(legalConfigJson);
export const taxRates: TaxRatesData = taxRatesSchema.parse(taxRatesJson);

const firstRate = bankRates.rates[0];
if (!firstRate) throw new Error('data/bank-rates.json must have at least one rate');
/** The first day we have an RBI bank rate for; interest can't be calculated before it. */
export const earliestBankRateDate: string = firstRate.effectiveFrom;

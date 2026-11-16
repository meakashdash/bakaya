// The one zod schema for calculation input. Error messages are i18n keys (src/i18n/en.json),
// so the form shows the exact copy from docs/TEST_CASES.md.
import { z } from 'zod';
import { earliestBankRateDate } from '../data';
import { isValidIsoDate } from './dates';
import type { IsoDate } from './types';

/** The first day we have an RBI bank rate for (data/bank-rates.json, sorted oldest first). */
export const EARLIEST_SUPPORTED_DATE: IsoDate = earliestBankRateDate;

/**
 * Upper limit of what the tool supports: ₹100 crore, in paise. This is a product limit,
 * not a legal value (TC15), so it lives here rather than in /data.
 */
export const MAX_INVOICE_PAISE = 100 * 1_00_00_000 * 100;

export function makeInputSchema(asOfDate: IsoDate) {
  const isoDate = z.string().refine(isValidIsoDate, { error: 'errors.dateInvalid', abort: true });

  const daysError = { error: 'errors.agreementDaysRequired' };

  return z
    .object({
      category: z.enum(['micro', 'small', 'medium', 'not_registered']),
      /** "Do you only trade goods (buy and resell)?" — only asked for micro/small. */
      isTrader: z.boolean(),
      registeredBeforeSupply: z.enum(['yes', 'no', 'not_sure']),
      amountPaise: z
        .number({ error: 'errors.amountRequired' })
        .int({ error: 'errors.amountRequired' })
        .positive({ error: 'errors.amountTooLow' })
        .max(MAX_INVOICE_PAISE, { error: 'errors.amountTooHigh' }),
      deliveryDate: isoDate
        .refine((d) => d <= asOfDate, { error: 'errors.deliveryInFuture' })
        // Interest needs a bank rate for every day; earlier invoices can't be calculated.
        .refine((d) => d >= EARLIEST_SUPPORTED_DATE, { error: 'errors.deliveryTooOld' }),
      objection: z.discriminatedUnion('raised', [
        z.object({ raised: z.literal(false) }),
        z.object({
          raised: z.literal(true),
          resolvedDate: isoDate.refine((d) => d <= asOfDate, { error: 'errors.resolvedInFuture' }),
        }),
      ]),
      agreement: z.discriminatedUnion('hasAgreement', [
        z.object({ hasAgreement: z.literal(false) }),
        z.object({
          hasAgreement: z.literal(true),
          days: z.number(daysError).int(daysError).min(1, daysError),
        }),
      ]),
      buyerType: z.enum(['company', 'firm_llp', 'not_sure']),
    })
    .refine((v) => !v.objection.raised || v.objection.resolvedDate >= v.deliveryDate, {
      error: 'errors.resolvedBeforeDelivery',
      path: ['objection', 'resolvedDate'],
    });
}

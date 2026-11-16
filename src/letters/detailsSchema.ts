// The letter details form (PRD §3). Values are strings; error messages are i18n keys.
import { z } from 'zod';
import { isValidIsoDate } from '../domain/dates';

export const TONES = ['friendly', 'firm', 'final'] as const;
export type Tone = (typeof TONES)[number];

/** How the Udyam number field behaves for this supplier. */
export type UdyamField = 'required' | 'optional' | 'hidden';

export const letterFormDefaults = {
  tone: 'friendly' as Tone,
  supplierName: '',
  supplierAddress: '',
  udyamNumber: '',
  gstin: '',
  supplierSignatory: '',
  supplierPhone: '',
  supplierEmail: '',
  buyerName: '',
  buyerContactPerson: '',
  buyerAddress: '',
  invoiceNumber: '',
  invoiceDate: '',
  remember: false,
};
export type LetterFormValues = typeof letterFormDefaults;

/** The supplier's own details: the only part that "Remember" stores on the device. */
export const BUSINESS_FIELDS = [
  'supplierName',
  'supplierAddress',
  'udyamNumber',
  'gstin',
  'supplierSignatory',
  'supplierPhone',
  'supplierEmail',
] as const;
export type BusinessDetails = Pick<LetterFormValues, (typeof BUSINESS_FIELDS)[number]>;

const UDYAM = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const required = (max = 120) =>
  z
    .string()
    .trim()
    .min(1, { error: 'letterErrors.required' })
    .max(max, { error: 'letterErrors.tooLong' });

/** Multi-line text: trim each line and drop blank lines, so a pasted address can't break the layout. */
const multiline = (max = 300) =>
  required(max).transform((s) =>
    s
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n'),
  );

const upper = (s: string) => s.trim().toUpperCase();

export function makeLetterSchema(asOfDate: string, udyam: UdyamField) {
  const udyamSchema =
    udyam === 'hidden'
      ? z.string().transform(() => '')
      : z
          .string()
          .transform(upper)
          .refine((s) => (s === '' ? udyam === 'optional' : UDYAM.test(s)), {
            error: (issue) =>
              issue.input === '' ? 'letterErrors.required' : 'letterErrors.udyamFormat',
          });

  return z.object({
    tone: z.enum(TONES),
    supplierName: required(),
    supplierAddress: multiline(),
    udyamNumber: udyamSchema,
    gstin: z
      .string()
      .transform(upper)
      .refine((s) => s === '' || GSTIN.test(s), { error: 'letterErrors.gstinFormat' }),
    supplierSignatory: required(),
    supplierPhone: z
      .string()
      .trim()
      .refine((s) => /^\+?[\d\s-]+$/.test(s) && s.replace(/\D/g, '').length >= 10, {
        error: 'letterErrors.phoneFormat',
      }),
    supplierEmail: z
      .string()
      .trim()
      .refine((s) => s === '' || z.email().safeParse(s).success, {
        error: 'letterErrors.emailFormat',
      }),
    buyerName: required(),
    buyerContactPerson: required(),
    buyerAddress: multiline(),
    invoiceNumber: required(),
    invoiceDate: z
      .string()
      .refine(isValidIsoDate, { error: 'letterErrors.invoiceDateRequired', abort: true })
      .refine((d) => d <= asOfDate, { error: 'letterErrors.invoiceDateFuture' }),
    remember: z.boolean(),
  });
}

export type LetterDetails = z.output<ReturnType<typeof makeLetterSchema>>;

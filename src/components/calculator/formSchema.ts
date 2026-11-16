// The calculator form's zod schema.
// Form values are raw strings (what the inputs hold). The schema checks the questions that must
// be answered, builds a CalculationInput, and validates it with the ONE domain schema
// (src/domain/validation.ts), so the rules and messages live in a single place.
// Every error message is an i18n key from en.json.
import { z } from 'zod';
import type { CalculationInput } from '../../domain/types';
import { makeInputSchema } from '../../domain/validation';
import { parseAmountInput } from './amount';

const str = z.string();

const rawSchema = z.object({
  category: str,
  isTrader: str,
  registeredBeforeSupply: str,
  amount: str,
  deliveryDate: str,
  objectionRaised: str,
  objectionResolvedDate: str,
  hasAgreement: str,
  agreementDays: str,
  buyerType: str,
});

export type FormValues = z.input<typeof rawSchema>;
type FieldName = keyof FormValues;

export const emptyFormValues: FormValues = {
  category: '',
  isTrader: '',
  registeredBeforeSupply: '',
  amount: '',
  deliveryDate: '',
  objectionRaised: '',
  objectionResolvedDate: '',
  hasAgreement: '',
  agreementDays: '',
  buyerType: 'not_sure',
};

export const CATEGORIES = ['micro', 'small', 'medium', 'not_registered'] as const;
export const YES_NO = ['yes', 'no'] as const;
export const YES_NO_NOT_SURE = ['yes', 'no', 'not_sure'] as const;
export const BUYER_TYPES = ['company', 'firm_llp', 'not_sure'] as const;

/** The trader question is shown only for micro and small. */
export const asksTraderQuestion = (category: string): boolean =>
  category === 'micro' || category === 'small';

/** Domain field path -> form field name. */
function formFieldFor(path: readonly PropertyKey[]): FieldName {
  const key = path.map(String).join('.');
  const map: Record<string, FieldName> = {
    amountPaise: 'amount',
    'objection.resolvedDate': 'objectionResolvedDate',
    agreement: 'agreementDays',
    'agreement.days': 'agreementDays',
  };
  return map[key] ?? (key as FieldName);
}

/** Messages to use when the field is simply empty. */
const requiredMessage: Partial<Record<FieldName, string>> = {
  amount: 'errors.amountRequired',
  deliveryDate: 'errors.deliveryRequired',
  objectionResolvedDate: 'errors.resolvedRequired',
  agreementDays: 'errors.agreementDaysRequired',
};

const isOneOf = <T extends string>(options: readonly T[], v: string): v is T =>
  (options as readonly string[]).includes(v);

export function makeFormSchema(asOfDate: string) {
  const domainSchema = makeInputSchema(asOfDate);

  return rawSchema.transform((v, ctx): CalculationInput => {
    const flagged = new Set<FieldName>();
    const fail = (field: FieldName, message: string) => {
      if (flagged.has(field)) return;
      flagged.add(field);
      ctx.addIssue({ code: 'custom', path: [field], message });
    };

    // Questions that must be answered.
    if (!isOneOf(CATEGORIES, v.category)) fail('category', 'errors.categoryRequired');
    if (asksTraderQuestion(v.category) && !isOneOf(YES_NO, v.isTrader)) {
      fail('isTrader', 'errors.choiceRequired');
    }
    if (!isOneOf(YES_NO_NOT_SURE, v.registeredBeforeSupply)) {
      fail('registeredBeforeSupply', 'errors.choiceRequired');
    }
    if (!isOneOf(YES_NO, v.objectionRaised)) fail('objectionRaised', 'errors.choiceRequired');
    if (!isOneOf(YES_NO, v.hasAgreement)) fail('hasAgreement', 'errors.choiceRequired');
    if (!isOneOf(BUYER_TYPES, v.buyerType)) fail('buyerType', 'errors.choiceRequired');

    const candidate = {
      category: v.category,
      isTrader: asksTraderQuestion(v.category) && v.isTrader === 'yes',
      registeredBeforeSupply: v.registeredBeforeSupply,
      amountPaise: parseAmountInput(v.amount),
      deliveryDate: v.deliveryDate,
      objection:
        v.objectionRaised === 'yes'
          ? { raised: true, resolvedDate: v.objectionResolvedDate }
          : { raised: false },
      agreement:
        v.hasAgreement === 'yes'
          ? {
              hasAgreement: true,
              days: v.agreementDays.trim() === '' ? undefined : Number(v.agreementDays),
            }
          : { hasAgreement: false },
      buyerType: v.buyerType,
    };

    const result = domainSchema.safeParse(candidate);
    if (result.success && flagged.size === 0) return result.data;

    for (const issue of result.success ? [] : result.error.issues) {
      const field = formFieldFor(issue.path);
      const empty = v[field]?.trim() === '';
      fail(field, (empty && requiredMessage[field]) || issue.message);
    }
    return z.NEVER;
  });
}

import type { ChangeEvent, ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { legalConfig } from '../../data';
import type { CalculationInput } from '../../domain/types';
import { t } from '../../i18n';
import { RadioGroup, TextField } from '../form/fields';
import { ArrowRight } from '../icons';
import { caretAfterFormat, countSignificant, formatAmountInput } from './amount';
import {
  BUYER_TYPES,
  CATEGORIES,
  YES_NO,
  YES_NO_NOT_SURE,
  asksTraderQuestion,
  type FormValues,
} from './formSchema';

/** One numbered step of the form. A heading, not a fieldset: the questions inside have their own. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={`step-${n}-title`}
      className="space-y-7 border-t border-stone-200 pt-7 first-of-type:border-t-0 first-of-type:pt-0"
    >
      <h3 id={`step-${n}-title`} className="flex items-center gap-3 text-lg font-bold">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-green-50 text-sm font-bold text-green-800 ring-1 ring-green-800/20"
        >
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

type Props = {
  form: UseFormReturn<FormValues, unknown, CalculationInput>;
  asOfDate: string;
  onValid: (input: CalculationInput) => void;
  onInvalid: (errors: Partial<Record<string, unknown>>) => void;
};

export function CalculatorForm({ form, asOfDate, onValid, onInvalid }: Props) {
  // Built per render, so the labels follow the page language.
  const yesNo = YES_NO.map((v) => ({ value: v, label: t(`common.${v}`) }));
  const yesNoNotSure = YES_NO_NOT_SURE.map((v) => ({
    value: v,
    label: t(v === 'not_sure' ? 'common.notSure' : `common.${v}`),
  }));
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;
  const category = watch('category');
  const objectionRaised = watch('objectionRaised');
  const hasAgreement = watch('hasAgreement');

  const amount = register('amount');
  const onAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const before = countSignificant(el.value.slice(0, el.selectionStart ?? el.value.length));
    el.value = formatAmountInput(el.value);
    const caret = caretAfterFormat(el.value, before);
    if (document.activeElement === el) el.setSelectionRange(caret, caret);
    void amount.onChange(e);
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(onValid, onInvalid)(e)}
      noValidate
      aria-labelledby="form-heading"
      className="space-y-8"
    >
      <h2 id="form-heading" className="sr-only">
        {t('form.heading')}
      </h2>

      <Step n={1} title={t('form.steps.business')}>
        <RadioGroup
          name="category"
          legend={t('form.category.label')}
          help={t('form.category.help')}
          options={CATEGORIES.map((v) => ({ value: v, label: t(`form.category.${v}`) }))}
          registration={register('category')}
          error={errors.category?.message}
          columns={2}
        />

        {asksTraderQuestion(category) && (
          <RadioGroup
            name="isTrader"
            legend={t('form.isTrader.label')}
            options={yesNo}
            registration={register('isTrader')}
            error={errors.isTrader?.message}
            columns={2}
          />
        )}

        <RadioGroup
          name="registeredBeforeSupply"
          legend={t('form.registeredBeforeSupply.label')}
          options={yesNoNotSure}
          registration={register('registeredBeforeSupply')}
          error={errors.registeredBeforeSupply?.message}
          columns={3}
        />
      </Step>

      <Step n={2} title={t('form.steps.invoice')}>
        <TextField
          name="amount"
          label={t('form.amount.label')}
          help={t('form.amount.help')}
          registration={{
            ...amount,
            onChange: async (e) => onAmountChange(e as ChangeEvent<HTMLInputElement>),
          }}
          error={errors.amount?.message}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          prefix="₹"
          className="text-xl font-semibold tabular-nums"
        />

        <TextField
          name="deliveryDate"
          label={t('form.deliveryDate.label')}
          registration={register('deliveryDate')}
          error={errors.deliveryDate?.message}
          type="date"
          max={asOfDate}
        />

        <div className="space-y-4">
          <RadioGroup
            name="objectionRaised"
            legend={t('form.objection.label', {
              days: legalConfig.paymentRules.objectionWindowDays,
            })}
            options={yesNo}
            registration={register('objectionRaised')}
            error={errors.objectionRaised?.message}
            columns={2}
          />
          {objectionRaised === 'yes' && (
            <TextField
              name="objectionResolvedDate"
              label={t('form.objectionResolvedDate.label')}
              registration={register('objectionResolvedDate')}
              error={errors.objectionResolvedDate?.message}
              type="date"
              max={asOfDate}
            />
          )}
        </div>
      </Step>

      <Step n={3} title={t('form.steps.terms')}>
        <div className="space-y-4">
          <RadioGroup
            name="hasAgreement"
            legend={t('form.agreement.label')}
            options={yesNo}
            registration={register('hasAgreement')}
            error={errors.hasAgreement?.message}
            columns={2}
          />
          {hasAgreement === 'yes' && (
            <TextField
              name="agreementDays"
              label={t('form.agreementDays.label')}
              registration={register('agreementDays')}
              error={errors.agreementDays?.message}
              type="text"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              className="max-w-32"
            />
          )}
        </div>

        <RadioGroup
          name="buyerType"
          legend={
            <>
              {t('form.buyerType.label')}{' '}
              <span className="font-normal text-stone-600">({t('common.optional')})</span>
            </>
          }
          help={t('form.buyerType.help')}
          options={BUYER_TYPES.map((v) => ({ value: v, label: t(`form.buyerType.${v}`) }))}
          registration={register('buyerType')}
          error={errors.buyerType?.message}
        />
      </Step>

      <button type="submit" className="btn-primary">
        {t('form.submit')}
        <ArrowRight />
      </button>
    </form>
  );
}

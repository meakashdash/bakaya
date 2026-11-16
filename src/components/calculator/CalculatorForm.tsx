import type { ChangeEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { legalConfig } from '../../data';
import type { CalculationInput } from '../../domain/types';
import { t } from '../../i18n';
import { RadioGroup, TextField } from '../form/fields';
import { caretAfterFormat, countSignificant, formatAmountInput } from './amount';
import {
  BUYER_TYPES,
  CATEGORIES,
  YES_NO,
  YES_NO_NOT_SURE,
  asksTraderQuestion,
  type FormValues,
} from './formSchema';

type Props = {
  form: UseFormReturn<FormValues, unknown, CalculationInput>;
  asOfDate: string;
  onValid: (input: CalculationInput) => void;
  onInvalid: (errors: Partial<Record<string, unknown>>) => void;
};

const yesNo = YES_NO.map((v) => ({ value: v, label: t(`common.${v}`) }));
const yesNoNotSure = YES_NO_NOT_SURE.map((v) => ({
  value: v,
  label: t(v === 'not_sure' ? 'common.notSure' : `common.${v}`),
}));

export function CalculatorForm({ form, asOfDate, onValid, onInvalid }: Props) {
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
          legend={t('form.objection.label', { days: legalConfig.paymentRules.objectionWindowDays })}
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

      <button
        type="submit"
        className="min-h-14 w-full rounded-lg bg-green-800 px-5 py-3 text-lg font-semibold text-white hover:bg-green-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-green-800"
      >
        {t('form.submit')}
      </button>
    </form>
  );
}

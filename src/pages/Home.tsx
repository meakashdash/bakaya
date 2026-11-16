// Home / Calculator (PRD §1) with the Result section below it (PRD §2).
// Everything is computed in the browser; nothing is sent anywhere and nothing goes in the URL.
import { zodResolver } from '@hookform/resolvers/zod';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalculatorForm } from '../components/calculator/CalculatorForm';
import { Gift, Lock, UserOff } from '../components/icons';
import {
  emptyFormValues,
  makeFormSchema,
  type FormValues,
} from '../components/calculator/formSchema';
import { legalConfig } from '../data';
import { calculate } from '../domain/calculate';
import type { CalculationInput, CalculationResult } from '../domain/types';
import { t } from '../i18n';
import type { LetterFormValues } from '../letters/detailsSchema';
import { Result } from './Result';
import { track } from '../analytics';

// The letter (and, through it, the PDF library) loads only when the user opens it.
const LetterFlow = lazy(() => import('../letters/LetterFlow'));

type Props = {
  /** Today's date as YYYY-MM-DD; the domain never reads the clock itself. */
  asOfDate: string;
  siteUrl: string;
};

export default function Home({ asOfDate, siteUrl }: Props) {
  const schema = useMemo(() => makeFormSchema(asOfDate), [asOfDate]);
  const form = useForm<FormValues, unknown, CalculationInput>({
    resolver: zodResolver(schema),
    defaultValues: emptyFormValues,
    // react-hook-form can't focus radio groups, so we focus the first error ourselves.
    shouldFocusError: false,
  });
  const [calculation, setCalculation] = useState<{
    input: CalculationInput;
    result: CalculationResult;
  } | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusAmountNext = useRef(false);
  const [view, setView] = useState<'calculator' | 'letter'>('calculator');
  const [letterDraft, setLetterDraft] = useState<LetterFormValues | null>(null);
  const letterButtonRef = useRef<HTMLButtonElement>(null);
  const returningFromLetter = useRef(false);
  const onDraftChange = useCallback((v: LetterFormValues) => setLetterDraft(v), []);

  // Coming back from the letter: return focus to the button that opened it.
  useEffect(() => {
    if (view === 'calculator' && returningFromLetter.current) {
      returningFromLetter.current = false;
      letterButtonRef.current?.focus();
    }
  }, [view]);

  // Move focus (and the screen) to the result after each calculation,
  // or back to the amount after "Calculate another invoice".
  useEffect(() => {
    if (calculation) {
      resultHeadingRef.current?.focus();
    } else if (focusAmountNext.current) {
      focusAmountNext.current = false;
      form.setFocus('amount');
    }
  }, [calculation, form]);

  // A result must never sit under answers it wasn't calculated from: if the user edits the
  // form after checking, clear the result and say why.
  const submittedValues = useRef<string | null>(null);
  const [stale, setStale] = useState(false);
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          if (
            submittedValues.current !== null &&
            JSON.stringify(values) !== submittedValues.current
          ) {
            submittedValues.current = null;
            setCalculation(null);
            setStale(true);
          }
        },
      }),
    [form],
  );

  const onValid = (input: CalculationInput) => {
    submittedValues.current = JSON.stringify(form.getValues());
    setStale(false);
    setCalculation({ input, result: calculate(input, asOfDate) });
    track('calculate_clicked');
  };

  /** Focus the first field with an error, in page order. */
  const onInvalid = (errors: Partial<Record<string, unknown>>) => {
    const fields = document.querySelectorAll<HTMLInputElement>('#calculator input[name]');
    Array.from(fields)
      .find((el) => el.name in errors)
      ?.focus();
  };

  // Keep the supplier's own answers; clear the invoice details, including in the letter draft,
  // so the next letter can't carry the previous invoice's number or date.
  const onCalculateAnother = () => {
    submittedValues.current = null;
    const { category, isTrader, registeredBeforeSupply } = form.getValues();
    form.reset({ ...emptyFormValues, category, isTrader, registeredBeforeSupply });
    setLetterDraft((d) => d && { ...d, invoiceNumber: '', invoiceDate: '' });
    focusAmountNext.current = true;
    setStale(false);
    setCalculation(null);
  };

  return (
    <>
      <div
        className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-start lg:gap-14"
        hidden={view === 'letter'}
      >
        <header className="space-y-6 lg:sticky lg:top-28 lg:pt-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-green-800 shadow-xs ring-1 ring-green-800/15">
            <span aria-hidden="true" className="size-2 rounded-full bg-green-700" />
            {t('home.eyebrow')}
          </p>
          <h1
            tabIndex={-1}
            className="text-[2.1rem] leading-[1.12] font-extrabold tracking-tight text-balance text-stone-900 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800 sm:text-5xl lg:text-[3.4rem]"
          >
            {t('home.title', { maxDays: legalConfig.paymentRules.maxAgreedDays })}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-stone-700 sm:text-xl">
            {t('home.subtitle')}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] font-medium text-stone-800">
            {(
              [
                [Gift, 'home.trust.free'],
                [UserOff, 'home.trust.noSignup'],
                [Lock, 'home.trust.private'],
              ] as const
            ).map(([Icon, key]) => (
              <li key={key} className="flex items-center gap-2">
                <Icon className="size-4.5 text-green-800" />
                {t(key)}
              </li>
            ))}
          </ul>
          <div className="hidden pt-4 lg:block">
            <h2 className="text-sm font-bold tracking-wider text-stone-600 uppercase">
              {t('home.how.heading')}
            </h2>
            <ol className="mt-4 space-y-3">
              {(['s1', 's2', 's3'] as const).map((k, i) => (
                <li key={k} className="flex items-center gap-3 text-stone-800">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-green-800 text-sm font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  {t(`home.how.${k}`)}
                </li>
              ))}
            </ol>
          </div>
        </header>

        <div className="mt-8 space-y-8 lg:mt-0">
          <div id="calculator" className="surface p-5 sm:p-7">
            <CalculatorForm
              form={form}
              asOfDate={asOfDate}
              onValid={onValid}
              onInvalid={onInvalid}
            />
          </div>

          <div aria-live="polite">
            {stale && !calculation && (
              <p className="rounded-xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
                {t('result.stale')}
              </p>
            )}
          </div>

          {calculation && (
            <Result
              input={calculation.input}
              result={calculation.result}
              siteUrl={siteUrl}
              headingRef={resultHeadingRef}
              onCalculateAnother={onCalculateAnother}
              onCreateLetter={() => {
                track('letter_opened');
                setView('letter');
              }}
              letterButtonRef={letterButtonRef}
            />
          )}
        </div>
      </div>
      {view === 'letter' && calculation && (
        <Suspense
          fallback={
            <p role="status" className="mx-auto max-w-2xl">
              {t('letter.loading')}
            </p>
          }
        >
          <LetterFlow
            input={calculation.input}
            result={calculation.result}
            asOfDate={asOfDate}
            draft={letterDraft}
            onDraftChange={onDraftChange}
            onBack={() => {
              returningFromLetter.current = true;
              setView('calculator');
            }}
          />
        </Suspense>
      )}
    </>
  );
}

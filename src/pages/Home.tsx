// Home / Calculator (PRD §1) with the Result section below it (PRD §2).
// Everything is computed in the browser; nothing is sent anywhere and nothing goes in the URL.
import { zodResolver } from '@hookform/resolvers/zod';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalculatorForm } from '../components/calculator/CalculatorForm';
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
      <div className="space-y-10" hidden={view === 'letter'}>
        <header className="space-y-3 pt-2">
          <h1
            tabIndex={-1}
            className="text-3xl leading-tight font-bold text-balance text-stone-900 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800 sm:text-4xl"
          >
            {t('home.title', { maxDays: legalConfig.paymentRules.maxAgreedDays })}
          </h1>
          <p className="text-lg text-stone-700">{t('home.subtitle')}</p>
        </header>

        <div id="calculator" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <CalculatorForm form={form} asOfDate={asOfDate} onValid={onValid} onInvalid={onInvalid} />
        </div>

        <div aria-live="polite">
          {stale && !calculation && (
            <p className="rounded-lg bg-stone-100 p-4 text-stone-800">{t('result.stale')}</p>
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
      {view === 'letter' && calculation && (
        <Suspense fallback={<p role="status">{t('letter.loading')}</p>}>
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

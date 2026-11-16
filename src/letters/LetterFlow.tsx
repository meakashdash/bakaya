// Letter flow (PRD §3). Loaded lazily when the user opens the letter; it then preloads the
// PDF module so "Download PDF" is quick. All data stays in the browser.
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Checkbox, RadioGroup, TextArea, TextField } from '../components/form/fields';
import { WARNING_VARS } from '../components/result/warningVars';
import { legalConfig } from '../data';
import type { CalculationInput, CalculationResult } from '../domain/types';
import { getLocale, LOCALES, t, tIn } from '../i18n';
import { LETTER_WARNINGS, buildLetter, letterFileName, type Letter } from './buildLetter';
import {
  TONES,
  letterFormDefaults,
  makeLetterSchema,
  type LetterDetails,
  type LetterFormValues,
} from './detailsSchema';
import { LetterPreview } from './LetterPreview';
import { letterMode, udyamFieldFor } from './mode';
import { clearBusinessDetails, loadBusinessDetails, saveBusinessDetails } from './storage';
import { waitlistUrl } from './waitlist';
import { SrSuffix } from '../components/SrSuffix';
import { track } from '../analytics';
import { Alert, ArrowLeft, Copy, Download, FileText } from '../components/icons';

type Props = {
  input: CalculationInput;
  result: CalculationResult;
  asOfDate: string;
  /** Letter details kept in memory for this session (survive closing and reopening the letter). */
  draft: LetterFormValues | null;
  onDraftChange: (values: LetterFormValues) => void;
  onBack: () => void;
};

type PdfModule = typeof import('./pdf');

function initialValues(): LetterFormValues {
  const stored = loadBusinessDetails();
  return stored ? { ...letterFormDefaults, ...stored, remember: true } : letterFormDefaults;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and non-secure pages: fall back to a hidden textarea.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

const buttonPrimary = 'btn-primary';
const buttonSecondary = 'btn-secondary';
const callout = 'rounded-2xl bg-amber-50 p-5 text-amber-950 ring-1 ring-amber-300';
const legendClass = 'mb-5 flex w-full items-center gap-2 text-xl font-extrabold tracking-tight';

export default function LetterFlow({
  input,
  result,
  asOfDate,
  draft,
  onDraftChange,
  onBack,
}: Props) {
  const mode = letterMode(input, result);
  const udyam = udyamFieldFor(input.category);
  const schema = useMemo(() => makeLetterSchema(asOfDate, udyam), [asOfDate, udyam]);
  // A new letter starts in the page language; the supplier can switch it (e.g. an English
  // letter for a buyer's accounts team, from the Hindi page).
  const [defaults] = useState(() => draft ?? { ...initialValues(), language: getLocale() });
  const form = useForm<LetterFormValues, unknown, LetterDetails>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    shouldFocusError: false,
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const [created, setCreated] = useState<{ letter: Letter; details: LetterDetails } | null>(null);
  const [download, setDownload] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const pdfModule = useRef<Promise<PdfModule> | null>(null);

  const loadPdf = (): Promise<PdfModule> => (pdfModule.current ??= import('./pdf'));

  useEffect(() => {
    headingRef.current?.focus();
    // Start fetching the PDF library now that the letter is open.
    loadPdf().catch(() => {
      pdfModule.current = null;
    });
  }, []);

  // A page title that says where the user is (WCAG 2.4.2); restored on the way back.
  useEffect(() => {
    const previous = document.title;
    document.title = t('letter.pageTitle');
    return () => {
      document.title = previous;
    };
  }, []);

  // Keep the details in memory for the session, even if the user goes back to the result.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => onDraftChange({ ...letterFormDefaults, ...values }),
    });
  }, [form, onDraftChange]);

  useEffect(() => {
    if (created) previewHeadingRef.current?.focus();
  }, [created]);

  const onValid = (details: LetterDetails) => {
    if (details.remember) saveBusinessDetails(details);
    else clearBusinessDetails();
    setCreated({
      letter: buildLetter({
        tone: details.tone,
        details,
        input,
        result,
        asOfDate,
        locale: details.language,
      }),
      details,
    });
    setDownload('idle');
    setCopy('idle');
  };

  const onInvalid = (errs: Partial<Record<string, unknown>>) => {
    const fields = document.querySelectorAll<HTMLElement & { name: string }>('#letter-form [name]');
    Array.from(fields)
      .find((el) => el.name in errs)
      ?.focus();
  };

  const onDownload = async () => {
    if (!created) return;
    setDownload('working');
    try {
      const { renderLetterPdf } = await loadPdf();
      const title = tIn(created.letter.locale, 'letter.pdfTitle', {
        invoice: created.details.invoiceNumber,
      });
      const blob = await renderLetterPdf(created.letter, title);
      triggerDownload(blob, letterFileName(created.details.invoiceNumber, created.letter.locale));
      setDownload('done');
      track('letter_downloaded');
    } catch {
      pdfModule.current = null;
      setDownload('error');
    }
  };

  const onCopy = async () => {
    if (!created) return;
    setCopy((await copyToClipboard(created.letter.plainText)) ? 'copied' : 'failed');
  };

  if (mode === 'not_yet_due') return null; // the Result page doesn't offer the letter then

  const warnings = result.warnings.filter((w) => LETTER_WARNINGS.includes(w));
  const maxDays = legalConfig.paymentRules.maxAgreedDays;
  const waitlist = waitlistUrl();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-lg px-2 font-semibold text-green-800 hover:bg-green-50"
      >
        <ArrowLeft className="size-4.5" />
        {t('letter.back')}
      </button>

      <header className="space-y-3">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-stone-900 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800 sm:text-4xl"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-green-50 text-green-800 ring-1 ring-green-800/15">
            <FileText className="size-6" />
          </span>
          {t('letter.heading')}
        </h1>
        <p className="text-lg leading-relaxed text-stone-600">{t('letter.intro')}</p>
      </header>

      {mode === 'general' && (
        <p className={callout}>
          {t(`letter.generalNote.${input.category === 'medium' ? 'medium' : 'not_registered'}`, {
            maxDays,
          })}
        </p>
      )}
      {mode === 'legal' && warnings.length > 0 && (
        <section aria-labelledby="letter-warnings-heading" className={callout}>
          <h2 id="letter-warnings-heading" className="flex items-center gap-2 font-bold">
            <Alert className="size-5 text-amber-700" />
            {t('letter.warningsHeading')}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-amber-700">
            {warnings.map((w) => (
              <li key={w}>{t(`warnings.${w}`, WARNING_VARS)}</li>
            ))}
          </ul>
        </section>
      )}

      <form
        id="letter-form"
        noValidate
        onSubmit={(e) => void handleSubmit(onValid, onInvalid)(e)}
        className="surface space-y-9 p-5 sm:p-7"
      >
        <RadioGroup
          name="language"
          legend={t('letter.language.label')}
          options={LOCALES.map((l) => ({
            value: l,
            label: t(`letter.language.${l}`),
          }))}
          registration={register('language')}
          error={errors.language?.message}
        />

        {mode === 'legal' && (
          <RadioGroup
            name="tone"
            legend={t('letter.tone.label')}
            options={TONES.map((tone) => ({
              value: tone,
              label: t(`letter.tone.${tone}`),
              description: t(`letter.tone.${tone}Help`),
            }))}
            registration={register('tone')}
            error={errors.tone?.message}
          />
        )}

        <fieldset className="space-y-5 border-t border-stone-200 pt-7">
          <legend className={legendClass}>{t('letter.sections.supplier')}</legend>
          <TextField
            name="supplierName"
            label={t('letter.fields.supplierName')}
            registration={register('supplierName')}
            error={errors.supplierName?.message}
            autoComplete="organization"
          />
          <TextArea
            name="supplierAddress"
            label={t('letter.fields.supplierAddress')}
            registration={register('supplierAddress')}
            error={errors.supplierAddress?.message}
            autoComplete="street-address"
          />
          {udyam !== 'hidden' && (
            <TextField
              name="udyamNumber"
              label={
                udyam === 'optional' ? (
                  <>
                    {t('letter.fields.udyamNumber')}{' '}
                    <span className="font-normal text-stone-600">({t('common.optional')})</span>
                  </>
                ) : (
                  t('letter.fields.udyamNumber')
                )
              }
              help={t('letter.fields.udyamHelp')}
              registration={register('udyamNumber')}
              error={errors.udyamNumber?.message}
              autoCapitalize="characters"
              autoComplete="off"
            />
          )}
          <TextField
            name="gstin"
            label={
              <>
                {t('letter.fields.gstin')}{' '}
                <span className="font-normal text-stone-600">({t('common.optional')})</span>
              </>
            }
            registration={register('gstin')}
            error={errors.gstin?.message}
            autoCapitalize="characters"
            autoComplete="off"
          />
          <TextField
            name="supplierSignatory"
            label={t('letter.fields.supplierSignatory')}
            help={t('letter.fields.supplierSignatoryHelp')}
            registration={register('supplierSignatory')}
            error={errors.supplierSignatory?.message}
            autoComplete="name"
          />
          <TextField
            name="supplierPhone"
            label={t('letter.fields.supplierPhone')}
            registration={register('supplierPhone')}
            error={errors.supplierPhone?.message}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
          <TextField
            name="supplierEmail"
            label={
              <>
                {t('letter.fields.supplierEmail')}{' '}
                <span className="font-normal text-stone-600">({t('common.optional')})</span>
              </>
            }
            registration={register('supplierEmail')}
            error={errors.supplierEmail?.message}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
          <Checkbox
            name="remember"
            label={t('letter.fields.remember')}
            help={t('letter.fields.rememberHelp')}
            registration={register('remember')}
          />
        </fieldset>

        <fieldset className="space-y-5 border-t border-stone-200 pt-7">
          <legend className={legendClass}>{t('letter.sections.buyer')}</legend>
          <TextField
            name="buyerName"
            label={t('letter.fields.buyerName')}
            registration={register('buyerName')}
            error={errors.buyerName?.message}
            autoComplete="off"
          />
          <TextField
            name="buyerContactPerson"
            label={t('letter.fields.buyerContactPerson')}
            help={t('letter.fields.buyerContactPersonHelp')}
            registration={register('buyerContactPerson')}
            error={errors.buyerContactPerson?.message}
            autoComplete="off"
          />
          <TextArea
            name="buyerAddress"
            label={t('letter.fields.buyerAddress')}
            registration={register('buyerAddress')}
            error={errors.buyerAddress?.message}
            autoComplete="off"
          />
        </fieldset>

        <fieldset className="space-y-5 border-t border-stone-200 pt-7">
          <legend className={legendClass}>{t('letter.sections.invoice')}</legend>
          <TextField
            name="invoiceNumber"
            label={t('letter.fields.invoiceNumber')}
            help={t('letter.fields.invoiceNumberHelp')}
            registration={register('invoiceNumber')}
            error={errors.invoiceNumber?.message}
            autoComplete="off"
          />
          <TextField
            name="invoiceDate"
            label={t('letter.fields.invoiceDate')}
            registration={register('invoiceDate')}
            error={errors.invoiceDate?.message}
            type="date"
            max={asOfDate}
          />
        </fieldset>

        <button type="submit" className={buttonPrimary}>
          <FileText />
          {t('letter.create')}
        </button>
      </form>

      {created && (
        <section aria-labelledby="preview-heading" className="space-y-4">
          <h2
            id="preview-heading"
            ref={previewHeadingRef}
            tabIndex={-1}
            className="scroll-mt-24 text-2xl font-extrabold tracking-tight text-stone-900 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800"
          >
            {t('letter.preview')}
          </h2>
          <LetterPreview letter={created.letter} />

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void onDownload()}
              disabled={download === 'working'}
              className={buttonPrimary}
            >
              <Download />
              {download === 'working' ? t('letter.downloading') : t('letter.download')}
            </button>
            <button type="button" onClick={() => void onCopy()} className={buttonSecondary}>
              <Copy />
              {t('letter.copy')}
            </button>
          </div>

          <div aria-live="polite" className="space-y-2 text-center">
            {download === 'done' && <p className="font-semibold">{t('letter.downloaded')}</p>}
            {download === 'error' && (
              <p className="font-semibold text-red-700">{t('letter.downloadFailed')}</p>
            )}
            {copy === 'copied' && <p className="font-semibold">{t('letter.copied')}</p>}
            {copy === 'failed' && (
              <p className="font-semibold text-red-700">{t('letter.copyFailed')}</p>
            )}
          </div>

          {download === 'done' && waitlist && (
            <aside
              aria-labelledby="waitlist-heading"
              className="rounded-2xl bg-gradient-to-br from-green-800 to-green-950 p-6 text-white shadow-lift"
            >
              <h2 id="waitlist-heading" className="text-xl font-bold">
                {t('waitlist.heading')}
              </h2>
              <p className="mt-1 text-green-50">{t('waitlist.body')}</p>
              <a
                href={waitlist}
                onClick={() => track('waitlist_clicked')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-green-800 hover:bg-green-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t('waitlist.link')}
                <SrSuffix>{t('common.opensNewTab')}</SrSuffix>
              </a>
            </aside>
          )}
        </section>
      )}
    </div>
  );
}

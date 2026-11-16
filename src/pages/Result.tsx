// Result section (PRD §2), shown below the form on the Home page.
import type { Ref } from 'react';
import {
  DeadlineCard,
  Disclaimer,
  InterestCard,
  NotCoveredCard,
  TaxCard,
  Warnings,
  WhyCard,
} from '../components/result/cards';
import type { CalculationInput, CalculationResult } from '../domain/types';
import { formatDate, getLocale, t } from '../i18n';
import { localePath } from '../router';
import { letterMode } from '../letters/mode';
import { buildWhatsAppText, whatsAppUrl } from '../letters/whatsapp';
import { SrSuffix } from '../components/SrSuffix';
import { FileText, Refresh, WhatsApp } from '../components/icons';
import { track } from '../analytics';

type Props = {
  input: CalculationInput;
  result: CalculationResult;
  siteUrl: string;
  headingRef: Ref<HTMLHeadingElement>;
  onCalculateAnother: () => void;
  onCreateLetter: () => void;
  letterButtonRef: Ref<HTMLButtonElement>;
};

export function Result({
  input,
  result,
  siteUrl,
  headingRef,
  onCalculateAnother,
  onCreateLetter,
  letterButtonRef,
}: Props) {
  // The link in the message opens the calculator in the same language.
  const shareHref = whatsAppUrl(
    buildWhatsAppText(input, result, siteUrl + localePath('/', getLocale()).replace(/\/$/, '')),
  );
  const mode = letterMode(input, result);

  return (
    <section aria-labelledby="result-heading" className="space-y-4 lg:pt-2">
      <h2
        id="result-heading"
        ref={headingRef}
        tabIndex={-1}
        className="scroll-mt-24 text-2xl font-extrabold tracking-tight text-stone-900 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800 sm:text-3xl"
      >
        {t('result.heading')}
      </h2>

      {result.covered ? (
        <>
          {/* Seasonality rule: interest first April–December when at risk; otherwise tax first. */}
          {result.tax && result.leadWith === 'tax' ? (
            <>
              <TaxCard tax={result.tax} dueDate={result.dueDate} lead />
              <InterestCard result={result} lead={false} />
            </>
          ) : (
            <>
              <InterestCard result={result} lead />
              {result.tax && <TaxCard tax={result.tax} dueDate={result.dueDate} lead={false} />}
            </>
          )}
          <Warnings codes={result.warnings} />
          <DeadlineCard result={result} objectionRaised={input.objection.raised} />
          <WhyCard
            citations={result.citations}
            multiplier={result.currentRate.multiplier}
            tax={result.tax}
          />
        </>
      ) : (
        <NotCoveredCard />
      )}

      <div className="space-y-3 pt-2">
        {mode === 'not_yet_due' && result.covered ? (
          <p className="rounded-xl bg-stone-100 p-4 text-stone-800 ring-1 ring-stone-200">
            {t('letter.notYetDue', { dueDate: formatDate(result.dueDate) })}
          </p>
        ) : (
          <button
            type="button"
            ref={letterButtonRef}
            onClick={onCreateLetter}
            className="btn-primary"
          >
            <FileText />
            {t('letter.open')}
          </button>
        )}
        <a
          href={shareHref}
          onClick={() => track('whatsapp_shared')}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="whatsapp-hint"
          className="btn-secondary"
        >
          <WhatsApp />
          {t('result.actions.whatsapp')}
          <SrSuffix>{t('common.opensNewTab')}</SrSuffix>
        </a>
        <p id="whatsapp-hint" className="text-center text-sm text-stone-600">
          {t('result.actions.whatsappHint')}
        </p>
        <button
          type="button"
          onClick={onCalculateAnother}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-green-800 hover:bg-green-50"
        >
          <Refresh className="size-4.5" />
          {t('result.actions.another')}
        </button>
      </div>

      <Disclaimer />
    </section>
  );
}

import type { ReactNode } from 'react';
import { legalConfig } from '../../data';
import { formatRupees, type Amount } from '../../domain/money';
import type {
  Citation,
  CoveredResult,
  TaxExposure,
  TaxResult,
  WarningCode,
} from '../../domain/types';
import { formatDate, formatPercent, pluralKey, t } from '../../i18n';
import { citationLabel, disclaimerText } from '../../i18n/legal';
import { Trans } from '../../i18n/Trans';
import { Alert, Calendar, Info, Scale } from '../icons';
import { Link } from '../Link';
import { WARNING_VARS } from './warningVars';
import { SrSuffix } from '../SrSuffix';

/** Card shell. The leading card (seasonality rule) is filled deep green with the biggest numbers. */
function Card({
  lead,
  labelledBy,
  children,
}: {
  lead: boolean;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={
        lead
          ? 'relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-green-800 via-green-800 to-green-950 p-6 text-white shadow-lift sm:p-7'
          : 'surface p-5 text-stone-900 sm:p-6'
      }
    >
      {lead && (
        // Decorative ring in the corner of the headline card.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 -z-10 size-56 rounded-full border-[28px] border-white/[0.06]"
        />
      )}
      {children}
    </section>
  );
}

function Money({ amount, lead }: { amount: Amount; lead: boolean }) {
  return (
    <strong
      className={`font-extrabold tracking-tight whitespace-nowrap tabular-nums ${lead ? 'text-[2.6rem] leading-tight sm:text-5xl' : 'text-3xl text-green-800'}`}
    >
      {formatRupees(amount.rupees)}
    </strong>
  );
}

function Exposure({ exposure, lead }: { exposure: TaxExposure; lead: boolean }) {
  if (exposure.kind === 'single') return <Money amount={exposure.amount} lead={lead} />;
  return (
    <Trans
      k="result.tax.range"
      values={{
        low: <Money amount={exposure.low} lead={lead} />,
        high: <Money amount={exposure.high} lead={lead} />,
      }}
    />
  );
}

function ExposureBasis({ exposure }: { exposure: TaxExposure }) {
  return exposure.kind === 'single'
    ? t('result.tax.basisSingle', { rate: formatPercent(exposure.ratePct) })
    : t('result.tax.basisRange', {
        low: formatPercent(exposure.lowPct),
        high: formatPercent(exposure.highPct),
      });
}

const muted = (lead: boolean) => (lead ? 'text-green-50/90' : 'text-stone-600');

export function InterestCard({ result, lead }: { result: CoveredResult; lead: boolean }) {
  return (
    <Card lead={lead} labelledBy="interest-card-title">
      {result.isOverdue ? (
        <>
          <p id="interest-card-title" className="text-xl font-semibold sm:text-2xl">
            {t(pluralKey('result.interest.lateBy', result.daysOverdue), {
              days: result.daysOverdue,
            })}
          </p>
          <p className="mt-3 text-lg leading-relaxed">
            <Trans
              k="result.interest.owes"
              values={{ amount: <Money amount={result.interest} lead={lead} /> }}
            />
          </p>
        </>
      ) : (
        <>
          <p id="interest-card-title" className="text-xl font-semibold sm:text-2xl">
            {t(pluralKey('status.notDueYet', result.daysUntilDue), { days: result.daysUntilDue })}
          </p>
          <p className={`mt-2 ${muted(lead)}`}>
            {t('result.interest.startsAfter', { dueDate: formatDate(result.dueDate) })}
          </p>
        </>
      )}
    </Card>
  );
}

export function TaxCard({
  tax,
  dueDate,
  lead,
}: {
  tax: TaxResult;
  dueDate: string;
  lead: boolean;
}) {
  const amount = <Exposure exposure={tax.exposure} lead={lead} />;
  let body: ReactNode;
  if (tax.status === 'at_risk') {
    body = (
      <>
        <p id="tax-card-title" className="text-lg leading-relaxed">
          <Trans k="result.tax.atRisk" values={{ yearEnd: formatDate(tax.yearEnd), amount }} />
        </p>
        {tax.daysToYearEnd > 0 && (
          <p
            className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              lead ? 'bg-white/15 text-white' : 'bg-amber-100 text-amber-950'
            }`}
          >
            <Calendar className="size-4" />
            {t(pluralKey('result.tax.daysLeft', tax.daysToYearEnd), { days: tax.daysToYearEnd })}
          </p>
        )}
        <p className={`mt-3 ${muted(lead)}`}>{t('result.tax.atRiskWhy')}</p>
      </>
    );
  } else if (tax.status === 'deferred') {
    body = (
      <>
        <p id="tax-card-title" className="text-lg leading-relaxed">
          {t('status.deferred', { taxYear: tax.taxYear })}
        </p>
        <p className="mt-3 text-lg leading-relaxed">
          <Trans k="result.tax.deferredAmount" values={{ amount }} />
        </p>
      </>
    );
  } else {
    body = (
      <>
        <p id="tax-card-title" className="text-lg leading-relaxed">
          {t('status.not_at_risk_this_year')}
        </p>
        <p className="mt-3 text-lg leading-relaxed">
          <Trans k="result.tax.ifMissed" values={{ dueDate: formatDate(dueDate), amount }} />
        </p>
      </>
    );
  }
  return (
    <Card lead={lead} labelledBy="tax-card-title">
      {body}
      <p
        className={`mt-4 border-t pt-3 text-sm ${lead ? 'border-white/15' : 'border-stone-200'} ${muted(lead)}`}
      >
        <ExposureBasis exposure={tax.exposure} />
      </p>
    </Card>
  );
}

function Row({ term, wide, children }: { term: string; wide?: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl bg-stone-50 p-3.5 ring-1 ring-stone-200/70 ${wide ? 'col-span-2' : ''}`}
    >
      <dt className="text-sm text-stone-600">{term}</dt>
      <dd className="text-lg leading-snug font-bold text-stone-900 tabular-nums">{children}</dd>
    </div>
  );
}

export function DeadlineCard({
  result,
  objectionRaised,
}: {
  result: CoveredResult;
  objectionRaised: boolean;
}) {
  const rate = result.currentRate;
  return (
    <Card lead={false} labelledBy="deadline-heading">
      <h3 id="deadline-heading" className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Calendar className="size-5 text-green-800" />
        {t('result.deadline.heading')}
      </h3>
      <dl className="grid grid-cols-2 gap-2.5">
        <Row term={t(result.isOverdue ? 'result.deadline.wasDueBy' : 'result.deadline.dueBy')}>
          {formatDate(result.dueDate)}
        </Row>
        <Row
          term={t(
            result.isOverdue ? 'result.deadline.interestFrom' : 'result.deadline.interestStartsOn',
          )}
        >
          {formatDate(result.interestStartDate)}
        </Row>
        {/* Tiles pair up two per row; the period takes the full row when there's no "days late". */}
        <Row term={t('result.deadline.period')} wide={!result.isOverdue}>
          {t(pluralKey('result.deadline.periodValue', result.agreedDaysUsed), {
            days: result.agreedDaysUsed,
            date: formatDate(result.acceptanceDate),
          })}
        </Row>
        {result.isOverdue && <Row term={t('result.deadline.daysLate')}>{result.daysOverdue}</Row>}
        <Row term={t('result.deadline.rate')} wide>
          {t('result.deadline.rateValue', {
            annual: formatPercent(rate.annualInterestPct),
            multiplier: rate.multiplier,
            bank: formatPercent(rate.bankRatePct),
          })}
        </Row>
      </dl>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-stone-600 marker:text-green-800">
        {objectionRaised && <li>{t('result.deadline.objectionNote')}</li>}
        {result.interestPeriods.length > 1 && <li>{t('result.deadline.rateChanged')}</li>}
        <li>{t('result.deadline.compounding')}</li>
        <li>{t('result.deadline.rbiExplained')}</li>
      </ul>
    </Card>
  );
}

export function WhyCard({
  citations,
  multiplier,
  tax,
}: {
  citations: Citation[];
  multiplier: number;
  tax: { act: string; section: string } | null;
}) {
  const rules = legalConfig.paymentRules;
  const explain: Record<Citation['id'], string> = {
    deadline: t('result.why.deadline', {
      noAgreementDays: rules.noAgreementDays,
      maxDays: rules.maxAgreedDays,
    }),
    interest: t('result.why.interest', { multiplier }),
    tax: t('result.why.tax'),
  };
  return (
    <Card lead={false} labelledBy="why-heading">
      <h3 id="why-heading" className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Scale className="size-5 text-green-800" />
        {t('result.why.heading')}
      </h3>
      <ul className="divide-y divide-stone-200">
        {citations.map((c) => (
          <li key={c.id} className="py-4 first:pt-0 last:pb-0">
            <p className="inline-flex rounded-md bg-green-50 px-2 py-0.5 text-sm font-bold text-green-900 ring-1 ring-green-800/15">
              {citationLabel(c, tax)}
            </p>
            <p className="mt-2 text-stone-700">{explain[c.id]}</p>
            <p className="mt-1 flex flex-wrap gap-x-5">
              <Link
                to={`/how-it-works#${c.id}`}
                className="inline-flex min-h-11 items-center font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
              >
                {t('result.why.learnMore')}
                <SrSuffix>
                  {t('result.why.learnMoreAbout', { topic: citationLabel(c, tax) })}
                </SrSuffix>
              </Link>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
                >
                  {t('result.why.source')}
                  <SrSuffix>{t('common.opensNewTab')}</SrSuffix>
                </a>
              )}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** due_after_year_end is already explained in the tax card; medium is shown as its own card. */
const HIDDEN_WARNINGS: readonly WarningCode[] = ['due_after_year_end', 'medium_enterprise'];

export function Warnings({ codes }: { codes: WarningCode[] }) {
  const shown = codes.filter((c) => !HIDDEN_WARNINGS.includes(c));
  if (shown.length === 0) return null;
  return (
    <section
      aria-labelledby="warnings-heading"
      className="rounded-2xl bg-amber-50 p-5 text-amber-950 ring-1 ring-amber-300 sm:p-6"
    >
      <h3 id="warnings-heading" className="flex items-center gap-2 font-bold">
        <Alert className="size-5 text-amber-700" />
        {t('result.warningsHeading')}
      </h3>
      <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-amber-700">
        {shown.map((c) => (
          <li key={c}>{t(`warnings.${c}`, WARNING_VARS)}</li>
        ))}
      </ul>
    </section>
  );
}

/** The disclaimer from legal-config.json, in the page language. */
export function Disclaimer({ text = disclaimerText() }: { text?: string }) {
  return (
    <aside
      aria-labelledby="disclaimer-heading"
      className="flex gap-3 rounded-2xl bg-stone-100 p-5 text-sm leading-relaxed text-stone-700"
    >
      <Info className="mt-0.5 size-5 shrink-0 text-stone-500" />
      <div>
        <h3 id="disclaimer-heading" className="mb-1 font-semibold text-stone-900">
          {t('result.disclaimerHeading')}
        </h3>
        <p>{text}</p>
      </div>
    </aside>
  );
}

export function NotCoveredCard() {
  return (
    <Card lead labelledBy="not-covered-heading">
      <h3 id="not-covered-heading" className="text-xl font-semibold">
        {t('result.notCovered.heading')}
      </h3>
      <p className="mt-2 text-lg">
        {t('eligibility.mediumNotCovered', { maxDays: legalConfig.paymentRules.maxAgreedDays })}
      </p>
      <p className="mt-2 text-green-50/90">{t('result.notCovered.next')}</p>
    </Card>
  );
}

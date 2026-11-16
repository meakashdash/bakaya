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
          ? 'rounded-2xl bg-green-800 p-5 text-white shadow-sm sm:p-6'
          : 'rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 sm:p-6'
      }
    >
      {children}
    </section>
  );
}

function Money({ amount, lead }: { amount: Amount; lead: boolean }) {
  return (
    <strong
      className={`font-bold whitespace-nowrap tabular-nums ${lead ? 'text-4xl sm:text-5xl' : 'text-3xl'}`}
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

const muted = (lead: boolean) => (lead ? 'text-green-50' : 'text-stone-700');

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
          <p className="mt-3 inline-block rounded-full bg-stone-900/10 px-3 py-1 font-semibold">
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
      <p className={`mt-3 text-sm ${muted(lead)}`}>
        <ExposureBasis exposure={tax.exposure} />
      </p>
    </Card>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-stone-200 py-3 first:border-t-0 first:pt-0">
      <dt className="text-sm text-stone-600">{term}</dt>
      <dd className="text-lg font-semibold text-stone-900 tabular-nums">{children}</dd>
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
      <h3 id="deadline-heading" className="mb-4 text-lg font-bold">
        {t('result.deadline.heading')}
      </h3>
      <dl>
        <Row term={t(result.isOverdue ? 'result.deadline.wasDueBy' : 'result.deadline.dueBy')}>
          {formatDate(result.dueDate)}
        </Row>
        <Row term={t('result.deadline.period')}>
          {t(pluralKey('result.deadline.periodValue', result.agreedDaysUsed), {
            days: result.agreedDaysUsed,
            date: formatDate(result.acceptanceDate),
          })}
        </Row>
        <Row
          term={t(
            result.isOverdue ? 'result.deadline.interestFrom' : 'result.deadline.interestStartsOn',
          )}
        >
          {formatDate(result.interestStartDate)}
        </Row>
        {result.isOverdue && <Row term={t('result.deadline.daysLate')}>{result.daysOverdue}</Row>}
        <Row term={t('result.deadline.rate')}>
          {t('result.deadline.rateValue', {
            annual: formatPercent(rate.annualInterestPct),
            multiplier: rate.multiplier,
            bank: formatPercent(rate.bankRatePct),
          })}
        </Row>
      </dl>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-stone-700">
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
      <h3 id="why-heading" className="mb-3 text-lg font-bold">
        {t('result.why.heading')}
      </h3>
      <ul className="space-y-4">
        {citations.map((c) => (
          <li key={c.id} className="border-l-4 border-green-800 pl-3">
            <p className="font-semibold">{citationLabel(c, tax)}</p>
            <p className="mt-1 text-stone-700">{explain[c.id]}</p>
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
      className="rounded-2xl border-2 border-stone-900 bg-white p-5 text-stone-900"
    >
      <h3 id="warnings-heading" className="font-bold">
        {t('result.warningsHeading')}
      </h3>
      <ul className="mt-2 list-disc space-y-2 pl-5">
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
      className="rounded-2xl bg-stone-100 p-5 text-sm text-stone-700"
    >
      <h3 id="disclaimer-heading" className="mb-1 font-semibold text-stone-900">
        {t('result.disclaimerHeading')}
      </h3>
      <p>{text}</p>
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
      <p className="mt-2 text-green-50">{t('result.notCovered.next')}</p>
    </Card>
  );
}

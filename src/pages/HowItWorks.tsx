// /how-it-works: the law in plain language (docs/LEGAL_RULES.md). Every number on this page is
// read from /data or computed with the same domain functions the calculator uses.
import { ContentPage, ExternalLink, Section, Sources } from '../components/content';
import { Disclaimer } from '../components/result/cards';
import { bankRates, legalConfig, taxRates } from '../data';
import { dueDate, interestStartDate } from '../domain/dates';
import { annualInterestPct, bankRateOn } from '../domain/interest';
import { formatDate, formatPercent, t } from '../i18n';
import { msmedSection, portalName, taxLaw } from '../i18n/legal';
import { SrSuffix } from '../components/SrSuffix';

/** The worked example from LEGAL_RULES.md §3 (acceptance 10 Jan 2027, maximum agreed days). */
const EXAMPLE_ACCEPTANCE = '2027-01-10';

const SECTIONS = ['who', 'deadline', 'interest', 'tax', 'complaint', 'rates'] as const;

const formatCrore = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

export default function HowItWorks({ asOfDate }: { asOfDate: string }) {
  const rules = legalConfig.paymentRules;
  const m = rules.interestMultiplier;
  const example = dueDate(
    EXAMPLE_ACCEPTANCE,
    { hasAgreement: true, days: rules.maxAgreedDays },
    rules,
  );
  const rateToday = bankRateOn(asOfDate, bankRates.rates);
  const limits = legalConfig.classificationFrom2025;
  const portal = legalConfig.complaintPortal;
  const company = taxRates.buyerTypes.find((b) => b.id === 'company_concessional');
  const firm = taxRates.buyerTypes.find((b) => b.id === 'firm_llp_high_income');

  return (
    <ContentPage
      title={t('howItWorks.title', { maxDays: rules.maxAgreedDays })}
      intro={t('howItWorks.intro')}
    >
      <nav aria-labelledby="contents-heading" className="surface p-5">
        <h2
          id="contents-heading"
          className="text-sm font-bold tracking-wider text-stone-600 uppercase"
        >
          {t('howItWorks.contents')}
        </h2>
        <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {SECTIONS.map((id) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="text-green-800 underline underline-offset-2 hover:text-green-900"
              >
                {t(`howItWorks.${id}.heading`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="who" heading={t('howItWorks.who.heading')}>
        <p>{t('howItWorks.who.p1')}</p>
        <div className="overflow-x-auto">
          <table className="w-full overflow-hidden rounded-xl bg-white text-left text-base shadow-xs ring-1 ring-stone-200">
            <caption className="mb-2 text-left text-sm text-stone-700">
              {t('howItWorks.who.tableCaption', { date: formatDate(limits.effectiveFrom) })}
            </caption>
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100 text-sm text-stone-700">
                <th scope="col" className="px-3 py-2.5">
                  {t('howItWorks.who.colCategory')}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t('howItWorks.who.colInvestment')}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t('howItWorks.who.colTurnover')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(['micro', 'small', 'medium'] as const).map((c) => (
                <tr key={c} className="border-b border-stone-200 last:border-b-0">
                  <th scope="row" className="px-3 py-2.5 font-semibold">
                    {t(`howItWorks.who.${c}`)}
                  </th>
                  <td className="px-3 py-2.5 tabular-nums">
                    {t('howItWorks.who.crore', { amount: formatCrore(limits[c].investmentCr) })}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {t('howItWorks.who.crore', { amount: formatCrore(limits[c].turnoverCr) })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t('howItWorks.who.medium_note')}</li>
          <li>{t('howItWorks.who.trader')}</li>
          <li>{t('howItWorks.who.registration')}</li>
        </ul>
        <Sources topic="who" />
      </Section>

      <Section id="deadline" heading={t('howItWorks.deadline.heading')}>
        <p>{t('howItWorks.deadline.p1')}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            {t('howItWorks.deadline.noAgreement', { noAgreementDays: rules.noAgreementDays })}
          </li>
          <li>{t('howItWorks.deadline.agreement', { maxDays: rules.maxAgreedDays })}</li>
        </ul>
        <p>{t('howItWorks.deadline.objection', { objectionDays: rules.objectionWindowDays })}</p>
        <p className="rounded-xl bg-green-50 p-4 ring-1 ring-green-800/15">
          {t('howItWorks.deadline.example', {
            acceptance: formatDate(EXAMPLE_ACCEPTANCE),
            maxDays: rules.maxAgreedDays,
            due: formatDate(example.dueDate),
            interestStart: formatDate(interestStartDate(example.dueDate)),
          })}
        </p>
        <p className="text-base text-stone-700">{t('howItWorks.deadline.counting')}</p>
        <p className="text-base text-stone-700">{msmedSection('deadline').label}</p>
        <Sources topic="deadline" />
      </Section>

      <Section id="interest" heading={t('howItWorks.interest.heading')}>
        <p>
          {t('howItWorks.interest.p1', {
            multiplier: m,
            annual: formatPercent(annualInterestPct(rateToday.bankRatePct, m)),
            bank: formatPercent(rateToday.bankRatePct),
          })}
        </p>
        <p>{t('howItWorks.interest.rbi')}</p>
        <p>{t('howItWorks.interest.compound')}</p>
        <p>{t('howItWorks.interest.daily')}</p>
        <p>{t('howItWorks.interest.noContract')}</p>
        <p>
          {t('howItWorks.interest.notDeductible', {
            section: msmedSection('interestNotDeductible').label,
          })}
        </p>
        <p className="text-base text-stone-700">{msmedSection('interest').label}</p>
        <Sources topic="interest" />
      </Section>

      <Section id="tax" heading={t('howItWorks.tax.heading')}>
        <p>{t('howItWorks.tax.p1')}</p>
        <p>{t('howItWorks.tax.p2')}</p>
        <p>{t('howItWorks.tax.p3')}</p>
        <p className="font-semibold">{t('howItWorks.tax.lawHeading')}</p>
        <ul className="list-disc space-y-2 pl-5">
          {legalConfig.taxSections.map((s) => (
            <li key={s.section}>
              {s.toTaxYear
                ? t('howItWorks.tax.lawRange', {
                    from: s.fromTaxYear,
                    to: s.toTaxYear,
                    ...taxLaw(s),
                  })
                : t('howItWorks.tax.lawOpen', {
                    from: s.fromTaxYear,
                    ...taxLaw(s),
                  })}
            </li>
          ))}
        </ul>
        {company && firm && (
          <p>
            {t('howItWorks.tax.estimate', {
              company: formatPercent(company.effectiveRatePct),
              firm: formatPercent(firm.effectiveRatePct),
            })}
          </p>
        )}
        <p className="text-base text-stone-700">{t('howItWorks.tax.estimateNote')}</p>
        <Sources topic="tax" />
      </Section>

      <Section id="complaint" heading={t('howItWorks.complaint.heading')}>
        <p>
          {t('howItWorks.complaint.p1', {
            portal: portalName(),
            since: formatDate(portal.onlyRouteSince),
          })}
        </p>
        <p>{t('howItWorks.complaint.p2')}</p>
        <p>{t('howItWorks.complaint.p3')}</p>
        {/^https:\/\//.test(portal.url) && (
          <p>
            <ExternalLink href={portal.url}>
              {t('howItWorks.complaint.link', { portal: portalName() })}
            </ExternalLink>
          </p>
        )}
        <Sources topic="complaint" />
      </Section>

      <Section id="rates" heading={t('howItWorks.rates.heading')}>
        <p>{t('howItWorks.rates.p1', { date: formatDate(bankRates.lastReviewed) })}</p>
        <div className="overflow-x-auto">
          <table className="w-full overflow-hidden rounded-xl bg-white text-left text-base shadow-xs ring-1 ring-stone-200">
            <caption className="sr-only">{t('howItWorks.rates.caption')}</caption>
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100 text-sm text-stone-700">
                <th scope="col" className="px-3 py-2.5">
                  {t('howItWorks.rates.colFrom')}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t('howItWorks.rates.colBank')}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t('howItWorks.rates.colInterest', { multiplier: m })}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t('howItWorks.rates.colSource')}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...bankRates.rates].reverse().map((r) => (
                <tr key={r.effectiveFrom} className="border-b border-stone-200 last:border-b-0">
                  <th scope="row" className="px-3 py-2.5 font-normal whitespace-nowrap">
                    {formatDate(r.effectiveFrom)}
                  </th>
                  <td className="px-3 py-2.5 tabular-nums">{formatPercent(r.bankRatePct)}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {formatPercent(annualInterestPct(r.bankRatePct, m))}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.source ? (
                      <ExternalLink href={r.source}>
                        {t('howItWorks.rates.sourceLink')}
                        <SrSuffix>
                          {t('howItWorks.rates.sourceLinkFor', {
                            date: formatDate(r.effectiveFrom),
                          })}
                        </SrSuffix>
                      </ExternalLink>
                    ) : (
                      <span className="text-stone-600">{t('howItWorks.rates.noSource')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section heading={t('content.sources')}>
        <p>{t('howItWorks.sourcesIntro')}</p>
        <ul className="list-disc space-y-1 pl-5">
          {legalConfig.sources.map((s) => (
            <li key={s.id}>
              <ExternalLink href={s.url}>{s.label}</ExternalLink>
            </li>
          ))}
        </ul>
      </Section>

      <Disclaimer />
    </ContentPage>
  );
}

// Building blocks for the text pages (How it works, Privacy, Terms).
import type { ReactNode } from 'react';
import { legalConfig } from '../data';
import { t } from '../i18n';
import { SrSuffix } from './SrSuffix';

type Topic = (typeof legalConfig.sources)[number]['topics'][number];

export function ContentPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-10 text-stone-900">
      <header className="space-y-4 border-b border-stone-200 pt-2 pb-8">
        <h1
          tabIndex={-1}
          className="text-[2rem] leading-tight font-extrabold tracking-tight text-balance focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800 sm:text-5xl"
        >
          {title}
        </h1>
        <p className="text-lg leading-relaxed text-stone-600 sm:text-xl">{intro}</p>
      </header>
      {children}
    </article>
  );
}

export function Section({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  const headingId = id ? `page-${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      tabIndex={id ? -1 : undefined}
      className="scroll-mt-24 space-y-4 text-lg leading-relaxed text-stone-800 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800"
    >
      <h2 id={headingId} className="text-2xl font-extrabold tracking-tight text-stone-900">
        {heading}
      </h2>
      {children}
    </section>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
    >
      {children}
      <SrSuffix>{t('common.opensNewTab')}</SrSuffix>
    </a>
  );
}

/** Sources from legal-config.json for one topic. */
export function Sources({ topic }: { topic: Topic }) {
  const sources = legalConfig.sources.filter((s) => s.topics.includes(topic));
  if (sources.length === 0) return null;
  return (
    <div className="rounded-xl bg-white p-4 text-base shadow-xs ring-1 ring-stone-200">
      <p className="text-sm font-bold tracking-wider text-stone-600 uppercase">
        {t('content.sources')}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-green-800">
        {sources.map((s) => (
          <li key={s.id}>
            <ExternalLink href={s.url}>{s.label}</ExternalLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

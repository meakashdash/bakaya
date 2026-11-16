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
    <article className="space-y-10 text-stone-900">
      <header className="space-y-3 pt-2">
        <h1
          tabIndex={-1}
          className="text-3xl leading-tight font-bold text-balance focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800 sm:text-4xl"
        >
          {title}
        </h1>
        <p className="text-lg text-stone-700">{intro}</p>
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
      className="scroll-mt-4 space-y-4 text-lg leading-relaxed focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-green-800"
    >
      <h2 id={headingId} className="text-2xl font-bold">
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
    <div className="rounded-lg bg-stone-100 p-4 text-base">
      <p className="font-semibold">{t('content.sources')}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {sources.map((s) => (
          <li key={s.id}>
            <ExternalLink href={s.url}>{s.label}</ExternalLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

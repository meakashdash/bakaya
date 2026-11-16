// Every i18n key the code uses must exist in en.json, so no screen can crash on a missing string.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import en from '../src/i18n/en.json';
import { t } from '../src/i18n';
import type { WarningCode } from '../src/domain/types';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const source = sourceFiles(path.resolve('src'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const has = (key: string) => {
  let node: unknown = en;
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  return typeof node === 'string';
};

describe('en.json', () => {
  it('has every literal key used with t(), pluralKey() and Trans', () => {
    const keys = new Set<string>();
    for (const re of [
      /\bt\(\s*'([a-zA-Z_.]+)'/g,
      /pluralKey\(\s*'([a-zA-Z_.]+)'/g,
      /\bk="([a-zA-Z_.]+)"/g,
      /error:\s*'([a-zA-Z_]+\.[a-zA-Z_.]+)'/g,
      /\b(?:error|message):\s*'(errors\.[a-zA-Z]+|letterErrors\.[a-zA-Z]+)'/g,
      /'(errors\.[a-zA-Z]+|letterErrors\.[a-zA-Z]+)'/g,
    ]) {
      for (const m of source.matchAll(re)) if (m[1]) keys.add(m[1]);
    }
    expect(keys.size).toBeGreaterThan(80);
    const missing = [...keys].filter((k) => !has(k));
    expect(missing).toEqual([]);
  });

  it('has a message for every warning code', () => {
    const codes: WarningCode[] = [
      'medium_enterprise',
      'trader',
      'registration',
      'agreement_capped',
      'due_after_year_end',
      'tax_rule_not_applicable',
    ];
    for (const c of codes) expect(has(`warnings.${c}`)).toBe(true);
    expect(t('warnings.tax_rule_not_applicable', { fromTaxYear: '2023-24' })).toBe(
      'The tax rule on late payments started in tax year 2023-24, so it does not apply to this invoice.',
    );
  });

  it('has every key built from a template string in the code', () => {
    const dynamic = [
      ...['micro', 'small', 'medium', 'not_registered'].map((c) => `form.category.${c}`),
      ...['company', 'firm_llp', 'not_sure'].map((c) => `form.buyerType.${c}`),
      ...['yes', 'no'].map((c) => `common.${c}`),
      ...['friendly', 'firm', 'final'].flatMap((c) => [`letter.tone.${c}`, `letter.tone.${c}Help`]),
      'letter.generalNote.medium',
      'letter.generalNote.not_registered',
      'letter.category.micro',
      'letter.category.small',
      'letter.days',
      'letter.days_one',
      'result.deadline.periodValue_one',
      'result.interest.lateBy_one',
      'result.tax.daysLeft_one',
      'status.notDueYet_one',
      ...['home', 'howItWorks', 'privacy', 'terms', 'notFound'].flatMap((k) => [
        `meta.${k}.title`,
        `meta.${k}.description`,
      ]),
      ...['who', 'deadline', 'interest', 'tax', 'complaint', 'rates'].map(
        (k) => `howItWorks.${k}.heading`,
      ),
      ...['micro', 'small', 'medium'].map((k) => `howItWorks.who.${k}`),
    ];
    expect(dynamic.filter((k) => !has(k))).toEqual([]);
  });

  it('never says the buyer loses the deduction (CLAUDE.md wording rule)', () => {
    expect(JSON.stringify(en)).not.toMatch(/\blos(e|es|t|ing)\b/i);
  });
});

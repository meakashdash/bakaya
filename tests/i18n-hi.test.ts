// Hindi: hi.json mirrors en.json exactly, Hindi templates mirror the English ones, and the
// Hindi legal labels say the same section numbers as the English ones.
import en from '../src/i18n/en.json';
import hi from '../src/i18n/hi.json';
import { legalConfig } from '../src/data';
import { formatDisplayDate } from '../src/domain/dates';
import { formatDate, LOCALES, setLocale, t, tIn, tSections } from '../src/i18n';
import { citationLabel, disclaimerText, msmedSection, portalName, taxLaw } from '../src/i18n/legal';
import { TEMPLATES } from '../src/letters/buildLetter';
import { TONES } from '../src/letters/detailsSchema';

type Leaf = { path: string; value: string };

function leaves(node: unknown, path = ''): Leaf[] {
  if (typeof node === 'string') return [{ path, value: node }];
  if (Array.isArray(node)) return node.flatMap((n, i) => leaves(n, `${path}[${i}]`));
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  throw new Error(`Unexpected value at ${path}`);
}

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
const DEVANAGARI = /[ऀ-ॿ]/;

const enLeaves = leaves(en);
const hiLeaves = new Map(leaves(hi).map((l) => [l.path, l.value]));

afterEach(() => setLocale('en'));

describe('hi.json', () => {
  it('has exactly the same keys as en.json', () => {
    expect([...hiLeaves.keys()].sort()).toEqual(enLeaves.map((l) => l.path).sort());
  });

  it('uses the same {{placeholders}} as en.json in every string', () => {
    const mismatched = enLeaves
      .filter(
        (l) => placeholders(l.value).join() !== placeholders(hiLeaves.get(l.path) ?? '').join(),
      )
      .map((l) => l.path);
    expect(mismatched).toEqual([]);
  });

  it('is actually in Hindi (except names, codes and formats)', () => {
    const allowedLatin = new Set([
      'app.name',
      'letter.fields.gstin',
      'letter.gstinLabel',
      'letter.fileName',
      'date.format',
      'nav.switchLanguage', // "English": the switch is named in the language it leads to
    ]);
    const notHindi = [...hiLeaves]
      .filter(([path, value]) => !allowedLatin.has(path) && !DEVANAGARI.test(value))
      .map(([path]) => path);
    expect(notHindi).toEqual([]);
  });

  it('the language switch on each side names the other language in that language', () => {
    expect(tIn('en', 'nav.switchLanguage')).toBe('हिंदी');
    expect(tIn('hi', 'nav.switchLanguage')).toBe('English');
  });

  it('t() follows the current locale; tIn() ignores it', () => {
    setLocale('hi');
    expect(t('form.submit')).toBe('देखें उन पर कितना बकाया है');
    expect(tIn('en', 'form.submit')).toBe('Check what they owe');
    expect(tSections('privacy.sections')).toHaveLength(en.privacy.sections.length);
    setLocale('en');
    expect(t('form.submit')).toBe('Check what they owe');
  });

  it('throws on a missing key in either language', () => {
    for (const l of LOCALES) expect(() => tIn(l, 'nope.missing')).toThrow(/Missing i18n key/);
    expect(() => tSections('nope', 'hi')).toThrow(/Missing i18n section list/);
  });
});

describe('dates', () => {
  it('English matches the domain formatter for every month: 24 Feb 2027', () => {
    for (let m = 1; m <= 12; m++) {
      const iso = `2027-${String(m).padStart(2, '0')}-04`;
      expect(formatDate(iso, 'en')).toBe(formatDisplayDate(iso));
    }
    expect(formatDate('2027-02-24', 'en')).toBe('24 Feb 2027');
  });

  it('Hindi uses Hindi month names and Western digits: 24 फ़रवरी 2027', () => {
    expect(formatDate('2027-02-24', 'hi')).toBe('24 फ़रवरी 2027');
    expect(formatDate('2027-03-31', 'hi')).toBe('31 मार्च 2027');
    expect(formatDate('2026-12-05', 'hi')).toBe('5 दिसंबर 2026');
  });

  it('defaults to the current locale and rejects malformed dates', () => {
    setLocale('hi');
    expect(formatDate('2027-01-10')).toBe('10 जनवरी 2027');
    expect(() => formatDate('10/01/2027')).toThrow(/YYYY-MM-DD/);
  });
});

describe('legal labels in Hindi (data/legal-config.json)', () => {
  const digits = (s: string) => s.match(/\d+(\(\d+\))?(\(\w\))?/g)?.join(' ');

  it('MSMED sections carry the same numbers in both languages', () => {
    for (const key of Object.keys(
      legalConfig.msmedSections,
    ) as (keyof typeof legalConfig.msmedSections)[]) {
      const enLabel = msmedSection(key, 'en');
      const hiLabel = msmedSection(key, 'hi');
      expect(digits(hiLabel.label)).toBe(digits(enLabel.label));
      expect(digits(hiLabel.short)).toBe(digits(enLabel.short));
      expect(hiLabel.label).toMatch(DEVANAGARI);
    }
    expect(msmedSection('interest', 'hi').label).toBe('MSMED अधिनियम, 2006, धारा 16');
  });

  it('tax sections carry the same section and year in both languages', () => {
    for (const s of legalConfig.taxSections) {
      const law = taxLaw(s, 'hi');
      expect(law.section.replace('धारा', 'Section')).toBe(s.section);
      expect(digits(law.act)).toBe(digits(s.act));
    }
    expect(taxLaw({ act: 'Income-tax Act, 2025', section: 'Section 37(2)(g)' }, 'hi')).toEqual({
      act: 'आयकर अधिनियम, 2025',
      section: 'धारा 37(2)(g)',
    });
    expect(() => taxLaw({ act: 'x', section: 'y' }, 'hi')).toThrow(/Unknown tax section/);
  });

  it('portal name, disclaimer and citations', () => {
    expect(portalName('en')).toBe(legalConfig.complaintPortal.name);
    expect(portalName('hi')).toMatch(/ODR पोर्टल/);
    expect(disclaimerText('en')).toBe(legalConfig.disclaimer);
    expect(disclaimerText('hi')).toMatch(/कानूनी या टैक्स सलाह नहीं है/);
    const tax = { act: 'Income-tax Act, 2025', section: 'Section 37(2)(g)' };
    expect(
      citationLabel({ id: 'tax', label: 'Income-tax Act, 2025, Section 37(2)(g)' }, tax, 'hi'),
    ).toBe('आयकर अधिनियम, 2025, धारा 37(2)(g)');
    expect(citationLabel({ id: 'tax', label: 'L' }, tax, 'en')).toBe('L');
    expect(citationLabel({ id: 'interest', label: 'L' }, null, 'hi')).toBe(
      'MSMED अधिनियम, 2006, धारा 16',
    );
  });
});

describe('Hindi letter templates', () => {
  const names = (s: string) =>
    [...new Set([...s.matchAll(/\{\{[#/]?(\w+)\}\}/g)].map((m) => m[1]))].sort();
  const sections = (s: string) => [...s.matchAll(/\{\{#(\w+)\}\}/g)].map((m) => m[1]);

  it.each(TONES)('%s uses exactly the same variables and sections as the English one', (tone) => {
    expect(names(TEMPLATES.hi[tone])).toEqual(names(TEMPLATES.en[tone]));
    expect(sections(TEMPLATES.hi[tone])).toEqual(sections(TEMPLATES.en[tone]));
    expect(TEMPLATES.hi[tone]).toMatch(/^विषय: /m);
  });
});

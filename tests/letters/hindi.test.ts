// Hindi letters: built from templates/hi/*.md with the same numbers as the English letter.
import { calculate } from '../../src/domain/calculate';
import type { CalculationInput } from '../../src/domain/types';
import { buildLetter, letterFileName, type Letter } from '../../src/letters/buildLetter';
import { TONES, type Tone } from '../../src/letters/detailsSchema';
import { blocksToPlainText } from '../../src/letters/template';
import { DETAILS, TC1_INPUT } from './fixtures';

function letterFor(
  tone: Tone,
  locale: 'en' | 'hi',
  input: CalculationInput = TC1_INPUT,
  asOf = '2027-03-31',
): Letter {
  return buildLetter({
    tone,
    details: { ...DETAILS, tone, language: locale },
    input,
    result: calculate(input, asOf),
    asOfDate: asOf,
    locale,
  });
}

const body = (l: Letter) => blocksToPlainText(l.body);

describe('Hindi letter (TC1, as of 31 Mar 2027)', () => {
  it.each(TONES)('%s: Hindi text with the same amounts as the English letter', (tone) => {
    const hi = letterFor(tone, 'hi');
    const en = letterFor(tone, 'en');
    expect(hi.locale).toBe('hi');
    expect(hi.plainText).not.toMatch(/\{\{|\}\}/);
    expect(body(hi)).toMatch(/^विषय: /m);
    // Same ₹ figures in both languages.
    const rupees = (s: string) => [...s.matchAll(/₹\d+(?:,\d+)*/g)].map((m) => m[0]).sort();
    expect(rupees(hi.plainText)).toEqual(rupees(en.plainText));
    expect(hi.plainText).toContain('₹5,00,000');
    // Dates in Hindi, digits stay Western.
    expect(hi.plainText).toContain('31 मार्च 2027');
    expect(hi.plainText).not.toContain('Mar 2027');
    // Letterhead is the supplier's own text, unchanged.
    expect(hi.letterhead[0]).toBe('Shakti Fabricators');
    // Hindi disclaimer, from legal-config.json.
    expect(hi.disclaimer).toMatch(/कानूनी या टैक्स सलाह नहीं है/);
    expect(hi.plainText.endsWith(hi.disclaimer)).toBe(true);
  });

  it('friendly: cites the Hindi section labels, the due date and both legal points', () => {
    const text = body(letterFor('friendly', 'hi'));
    expect(text).toContain(
      'MSMED अधिनियम, 2006, धारा 15 के अनुसार भुगतान की नियत तारीख: 24 फ़रवरी 2027',
    );
    expect(text).toContain('MSMED अधिनियम, 2006, धारा 16 के तहत अब तक');
    expect(text).toContain('आयकर अधिनियम, 2025 की धारा 37(2)(g) के तहत');
    expect(text).toContain('सूक्ष्म उद्यम');
    expect(letterFor('friendly', 'hi').letterhead).toContain(
      'उद्यम रजिस्ट्रेशन नं.: UDYAM-MH-26-0123456 | GSTIN: 27ABCDE1234F1Z5',
    );
  });

  it('firm: table rows in Hindi; final: Hindi portal name and days overdue', () => {
    const firm = letterFor('firm', 'hi');
    const table = firm.body.find((b) => b.type === 'table');
    expect(table?.type === 'table' && table.rows.map(([k]) => k)).toContain('राशि');
    const final = body(letterFor('final', 'hi'));
    expect(final).toContain('MSME ODR पोर्टल के माध्यम से');
    expect(final).toContain('अब यह 35 दिन से बकाया है');
    expect(body(letterFor('final', 'hi', TC1_INPUT, '2027-02-25'))).toContain('1 दिन से बकाया');
  });

  it('medium enterprise: a plain Hindi reminder with no legal citations', () => {
    const medium: CalculationInput = { ...TC1_INPUT, category: 'medium' };
    const text = body(letterFor('final', 'hi', medium));
    expect(text).toMatch(/^विषय: विनम्र अनुस्मारक/m);
    expect(text).not.toMatch(/धारा|MSMED|अधिनियम, 2006 के तहत/);
  });

  it('file name stays ASCII', () => {
    expect(letterFileName('INV-104', 'hi')).toBe('reminder-letter-hindi-INV-104.pdf');
    expect(letterFileName('INV-104', 'en')).toBe('reminder-letter-INV-104.pdf');
  });
});

// @vitest-environment node
// A Hindi letter renders as a real PDF: Noto Sans for Latin text and ₹, Noto Sans Devanagari
// for Hindi, both embedded. English letters don't embed (or download) the Devanagari font.
import { renderToBuffer } from '@react-pdf/renderer';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { calculate } from '../../src/domain/calculate';
import { buildLetter } from '../../src/letters/buildLetter';
import { LetterDocument } from '../../src/letters/LetterDocument';
import { fontFamilyFor, registerFonts } from '../../src/letters/pdfFonts';
import { DETAILS, TC1_INPUT } from './fixtures';

const FONT_DIR = `${path.resolve('public/fonts').replaceAll('\\', '/')}/`;
beforeAll(() => registerFonts(FONT_DIR));

const letter = (locale: 'en' | 'hi') =>
  buildLetter({
    tone: 'firm',
    details: { ...DETAILS, tone: 'firm', language: locale },
    input: TC1_INPUT,
    result: calculate(TC1_INPUT, '2027-03-31'),
    asOfDate: '2027-03-31',
    locale,
  });

async function pdfText(buffer: Buffer): Promise<string> {
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: false }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) {
    for (const item of (await (await doc.getPage(p)).getTextContent()).items) {
      if ('str' in item) text += `${item.str} `;
    }
  }
  return text.replace(/\s+/g, ' ');
}

describe('Hindi PDF', () => {
  it('embeds both fonts and keeps the Latin details and ₹ amounts', async () => {
    const buffer = await renderToBuffer(<LetterDocument letter={letter('hi')} title="Test" />);
    const raw = buffer.toString('latin1');
    expect(raw).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSansDevanagari-Regular/);
    expect(raw).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSans-Regular/);
    expect(raw).toContain('/Lang (hi-IN)');
    const text = await pdfText(buffer);
    expect(text).toContain('Shakti Fabricators');
    expect(text).toContain('UDYAM-MH-26-0123456');
    expect(text).toContain('₹5,00,000');
    expect(text).not.toContain('{{');
  }, 30_000);

  it('English letters use Noto Sans only', async () => {
    expect(fontFamilyFor('en')).toBe('NotoSans');
    expect(fontFamilyFor('hi')).toEqual(['NotoSans', 'NotoSansDevanagari']);
    const raw = (await renderToBuffer(<LetterDocument letter={letter('en')} title="T" />)).toString(
      'latin1',
    );
    expect(raw).not.toMatch(/NotoSansDevanagari/);
    expect(raw).toContain('/Lang (en-IN)');
  }, 30_000);
});

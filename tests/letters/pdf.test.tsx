// @vitest-environment node
// Renders real PDFs with the bundled Noto Sans and reads the text back with pdf.js,
// to prove ₹ is encoded with a real glyph and the disclaimer is on the page.
import { renderToBuffer } from '@react-pdf/renderer';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { legalConfig } from '../../src/data';
import { calculate } from '../../src/domain/calculate';
import { buildLetter, type Letter } from '../../src/letters/buildLetter';
import { TONES, type Tone } from '../../src/letters/detailsSchema';
import { LetterDocument } from '../../src/letters/LetterDocument';
import { FONT_FAMILY, registerFonts } from '../../src/letters/pdfFonts';
import { DETAILS, TC1_INPUT } from './fixtures';

const FONT_DIR = `${path.resolve('public/fonts').replaceAll('\\', '/')}/`;

function letter(tone: Tone): Letter {
  const asOf = '2027-03-31';
  return buildLetter({
    tone,
    details: { ...DETAILS, tone },
    input: TC1_INPUT,
    result: calculate(TC1_INPUT, asOf),
    asOfDate: asOf,
    locale: 'en',
  });
}

/** Read the PDF back with pdf.js: page count, page size and the extracted text. */
async function readPdf(buffer: Buffer): Promise<{ pages: number; view: number[]; text: string }> {
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: false }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    for (const item of content.items) {
      if ('str' in item) text += item.str + (item.hasEOL ? '\n' : '');
    }
  }
  const view = (await doc.getPage(1)).view;
  return { pages: doc.numPages, view, text };
}

const normalise = (s: string) => s.replace(/\s+/g, ' ');

beforeAll(() => registerFonts(FONT_DIR));

describe('PDF', () => {
  it.each(TONES)(
    '%s: A4, Noto Sans embedded, ₹ amounts, letterhead and disclaimer present',
    async (tone) => {
      const buffer = await renderToBuffer(<LetterDocument letter={letter(tone)} title="Test" />);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');

      const raw = buffer.toString('latin1');
      // Both Noto Sans weights are embedded (as subsets, e.g. "CZZZZZ+NotoSans-Bold").
      expect(FONT_FAMILY).toBe('NotoSans');
      expect(raw).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSans-Regular/);
      expect(raw).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSans-Bold/);

      const { pages, view, text } = await readPdf(buffer);
      // A4 is 595.28 x 841.89 points.
      expect(view[2]).toBeCloseTo(595.28, 1);
      expect(view[3]).toBeCloseTo(841.89, 1);
      const flat = normalise(text);
      expect(pages).toBeGreaterThanOrEqual(1);
      expect(pages).toBeLessThanOrEqual(2);
      // The disclaimer footer repeats on every page.
      const disclaimerStart = normalise(legalConfig.disclaimer).slice(0, 40);
      expect(flat.split(disclaimerStart).length - 1).toBe(pages);
      expect(flat).toContain('Shakti Fabricators');
      expect(flat).toContain('₹5,00,000');
      expect(flat).toContain('₹8,284');
      expect(flat).toContain(normalise(legalConfig.disclaimer));
      expect(flat).not.toContain('{{');
    },
    30_000,
  );
});

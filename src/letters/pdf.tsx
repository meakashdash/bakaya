// A4 PDF of the letter with @react-pdf/renderer, generated in the browser.
// This module is loaded only when the letter view opens (dynamic import), so the PDF library
// never touches the first page load.
import { pdf } from '@react-pdf/renderer';
import type { Letter } from './buildLetter';
import { LetterDocument } from './LetterDocument';
import { registerFonts } from './pdfFonts';

export async function renderLetterPdf(letter: Letter, title: string): Promise<Blob> {
  registerFonts('/fonts/');
  return pdf(<LetterDocument letter={letter} title={title} />).toBlob();
}

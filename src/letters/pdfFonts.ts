// Fonts are bundled in /public/fonts: the standard PDF fonts have no ₹ glyph and no Hindi.
// Noto Sans covers English and ₹. Noto Sans Devanagari covers Hindi (it has no Latin letters),
// so Hindi letters use both: Noto Sans first, Devanagari for anything it lacks.
import { Font } from '@react-pdf/renderer';
import type { Locale } from '../i18n';

export const FONT_FAMILY = 'NotoSans';
export const FONT_FAMILY_DEVANAGARI = 'NotoSansDevanagari';
let fontsRegisteredFrom: string | null = null;

/** Font families for a letter. English letters never download the Devanagari font. */
export const fontFamilyFor = (locale: Locale): string | string[] =>
  locale === 'hi' ? [FONT_FAMILY, FONT_FAMILY_DEVANAGARI] : FONT_FAMILY;

/** Register the fonts once. `base` is '/fonts/' in the browser, a file path in tests. */
export function registerFonts(base: string): void {
  if (fontsRegisteredFrom === base) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: `${base}NotoSans-Regular.ttf`, fontWeight: 'normal' },
      { src: `${base}NotoSans-Bold.ttf`, fontWeight: 'bold' },
    ],
  });
  Font.register({
    family: FONT_FAMILY_DEVANAGARI,
    fonts: [
      { src: `${base}NotoSansDevanagari-Regular.ttf`, fontWeight: 'normal' },
      { src: `${base}NotoSansDevanagari-Bold.ttf`, fontWeight: 'bold' },
    ],
  });
  // Don't split words with hyphens; a formal letter reads better without them.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegisteredFrom = base;
}

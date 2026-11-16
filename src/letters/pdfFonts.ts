// Noto Sans is bundled in /public/fonts because the standard PDF fonts have no ₹ glyph.
import { Font } from '@react-pdf/renderer';

export const FONT_FAMILY = 'NotoSans';
let fontsRegisteredFrom: string | null = null;

/** Register Noto Sans once. `base` is '/fonts/' in the browser, a file path in tests. */
export function registerFonts(base: string): void {
  if (fontsRegisteredFrom === base) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: `${base}NotoSans-Regular.ttf`, fontWeight: 'normal' },
      { src: `${base}NotoSans-Bold.ttf`, fontWeight: 'bold' },
    ],
  });
  // Don't split words with hyphens; a formal letter reads better without them.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegisteredFrom = base;
}

// Renders public/og-image.png (1200x630), the link-preview image for WhatsApp, LinkedIn and X.
// Run with `npm run og-image` after changing the headline. Uses the headline from en.json, the
// day limit from data/legal-config.json and the bundled Noto Sans, so it matches the site.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(path.join(root, p));
const en = JSON.parse(read('src/i18n/en.json'));
const legal = JSON.parse(read('data/legal-config.json'));

const fill = (s, vars) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const headline = fill(en.home.title, { maxDays: legal.paymentRules.maxAgreedDays });
const subtitle = en.og.subtitle;
const brand = en.app.name;
const font = (file) => `data:font/ttf;base64,${read(`public/fonts/${file}`).toString('base64')}`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: Noto; src: url(${font('NotoSans-Regular.ttf')}); font-weight: 400; }
  @font-face { font-family: Noto; src: url(${font('NotoSans-Bold.ttf')}); font-weight: 700; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; font-family: Noto, sans-serif; background: #166534; color: #fff;
         display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px; }
  .brand { font-size: 40px; font-weight: 700; letter-spacing: -0.5px; display: flex; align-items: center; gap: 16px; }
  .mark { width: 56px; height: 56px; border-radius: 14px; background: #fff; color: #166534;
          display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 700; }
  h1 { font-size: 72px; line-height: 1.12; font-weight: 700; letter-spacing: -1px; max-width: 1000px; text-wrap: balance; }
  p { font-size: 32px; color: #dcfce7; text-wrap: balance; max-width: 900px; }
</style></head>
<body>
  <div class="brand"><span class="mark">₹</span>${escape(brand)}</div>
  <h1>${escape(headline)}</h1>
  <p>${escape(subtitle)}</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const out = path.join(root, 'public/og-image.png');
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`Wrote ${path.relative(root, out)}`);

import AxeBuilder from '@axe-core/playwright';
import { applySiteHeaders } from './siteHeaders';
import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// TC1 through the real UI at 360px: form, result, letter and a real PDF download.
test.use({ viewport: { width: 360, height: 740 } });

const screenshotDir = process.env.SCREENSHOT_DIR;

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
}

async function noA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function pdfText(bytes: Buffer): Promise<string> {
  const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    text += content.items.map((i) => ('str' in i ? i.str : '')).join(' ') + ' ';
  }
  return text.replace(/\s+/g, ' ');
}

test('TC1 at 360px: form, result, letter, PDF, accessibility, no console errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  // Track what the browser fetches, to prove the PDF library and fonts load only with the letter.
  const requested: string[] = [];
  const otherOrigins: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    requested.push(url.pathname);
    // CLAUDE.md: no invoice data leaves the device. The app may only talk to its own origin.
    if (!['http:', 'https:'].includes(url.protocol)) return; // blob:/data: stay in the browser
    if (url.origin !== 'http://localhost:4173') otherOrigins.push(url.href);
  });
  const pdfChunkLoaded = () => requested.some((p) => /^\/assets\/pdf-.*\.js$/.test(p));
  const fontLoaded = () => requested.some((p) => p.startsWith('/fonts/'));

  await applySiteHeaders(page); // the real CSP from public/_headers

  // Freeze "today" so TC1's numbers are deterministic.
  await page.clock.setFixedTime(new Date('2027-03-31T10:00:00'));
  await page.goto('/');
  await noHorizontalScroll(page);
  await noA11yViolations(page);

  // Empty submit shows errors and focuses the first question.
  await page.getByRole('button', { name: 'Check what they owe' }).click();
  await expect(page.getByText('Choose your business type')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Micro' })).toBeFocused();
  await noA11yViolations(page);
  if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/errors.png`, fullPage: true });

  await page.getByRole('radio', { name: 'Micro' }).check();
  await page
    .getByRole('group', { name: /only trade goods/ })
    .getByRole('radio', { name: 'No' })
    .check();
  await page
    .getByRole('group', { name: /registration done before/ })
    .getByRole('radio', { name: 'Yes' })
    .check();
  await page.getByLabel(/Invoice amount/).pressSequentially('500000');
  await expect(page.getByLabel(/Invoice amount/)).toHaveValue('5,00,000');
  await page.getByLabel(/Date you delivered/).fill('2027-01-10');
  await page
    .getByRole('group', { name: /object in writing/ })
    .getByRole('radio', { name: 'No' })
    .check();
  await page
    .getByRole('group', { name: /written agreement/ })
    .getByRole('radio', { name: 'Yes' })
    .check();
  await page.getByLabel('How many days?').fill('45');
  if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/form.png`, fullPage: true });
  await page.getByRole('button', { name: 'Check what they owe' }).click();

  // Result
  await expect(page.getByRole('heading', { name: 'What your buyer owes' })).toBeFocused();
  await expect(page.getByText('Your buyer is 35 days late.')).toBeVisible();
  await expect(page.getByText('₹8,284', { exact: true })).toBeVisible();
  await expect(page.getByText('₹1,25,840', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText(/not legal or tax advice/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Share on WhatsApp/ })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/\?text=/,
  );
  await noHorizontalScroll(page);
  await noA11yViolations(page);
  if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/result.png`, fullPage: true });

  // Nothing PDF-related has been fetched yet.
  expect(pdfChunkLoaded()).toBe(false);
  expect(fontLoaded()).toBe(false);

  // Letter
  await page.getByRole('button', { name: 'Create a polite reminder letter' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your reminder letter' })).toBeFocused();
  await expect.poll(pdfChunkLoaded).toBe(true); // preloaded as soon as the letter opens
  await noHorizontalScroll(page);
  await noA11yViolations(page);

  await page.getByLabel(/^Business name/).fill('Shakti Fabricators');
  await page.getByLabel(/^Business address/).fill('Plot 12, MIDC Bhosari\nPune 411026');
  await page.getByLabel(/Udyam registration number/).fill('UDYAM-MH-26-0123456');
  await page.getByLabel(/^Your name/).fill('Ramesh Patil');
  await page.getByLabel(/Phone number/).fill('9820012345');
  await page.getByLabel(/Buyer's company name/).fill('Big Motors Ltd');
  await page.getByLabel(/Contact person/).fill('Mr. Sharma');
  await page.getByLabel(/Buyer's address/).fill('1 Industrial Area, Chennai 600032');
  await page.getByLabel(/^Invoice number/).fill('INV-104');
  await page.getByLabel(/^Invoice date/).fill('2027-01-10');
  await page.getByRole('button', { name: 'Show my letter' }).click();
  await expect(page.getByRole('heading', { name: 'Letter preview' })).toBeFocused();
  await noHorizontalScroll(page);
  await noA11yViolations(page);

  // A real PDF, generated in the browser.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('reminder-letter-INV-104.pdf');
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(fontLoaded()).toBe(true);

  // The ₹ amounts must be real, extractable text in the bundled font.
  const text = await pdfText(bytes);
  expect(text).toContain('₹5,00,000');
  expect(text).toContain('₹8,284');
  expect(text).toContain('Shakti Fabricators');
  expect(text).toContain('not legal or tax advice');

  await expect(page.getByText('Your PDF is downloaded.')).toBeVisible();
  await noA11yViolations(page);
  if (screenshotDir) {
    await writeFile(`${screenshotDir}/letter.pdf`, bytes);
    await page.screenshot({ path: `${screenshotDir}/letter.png`, fullPage: true });
  }

  expect(errors).toEqual([]);
  expect(otherOrigins).toEqual([]);
});

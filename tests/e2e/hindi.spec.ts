import AxeBuilder from '@axe-core/playwright';
import { applySiteHeaders } from './siteHeaders';
import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// TC1 on the Hindi site at 360px, through to a real Hindi PDF under the real CSP.
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

test('Hindi pages: static Hindi meta and lang for link previews', async ({ page }) => {
  const res = await page.request.get('/hi/privacy');
  const html = await res.text();
  expect(html).toContain('<html lang="hi-IN">');
  expect(html).toContain('<title>प्राइवेसी | Bakaya</title>');
  expect(html).toContain('hreflang="en-IN"');
  await page.goto('/hi/how-it-works');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('कैसे काम करता है');
  await noHorizontalScroll(page);
  await noA11yViolations(page);
});

test('TC1 in Hindi at 360px: result, Hindi letter and Hindi PDF, no console errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  const fonts: string[] = [];
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith('/fonts/')) fonts.push(path);
  });

  await applySiteHeaders(page);
  await page.clock.setFixedTime(new Date('2027-03-31T10:00:00'));
  await page.goto('/hi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
  await noHorizontalScroll(page);
  await noA11yViolations(page);
  if (screenshotDir)
    await page.screenshot({ path: `${screenshotDir}/hi-form.png`, fullPage: true });

  const group = (name: RegExp) => page.getByRole('group', { name });
  await page.getByRole('radio', { name: /सूक्ष्म/ }).check();
  await group(/सिर्फ़ सामान खरीदकर/)
    .getByRole('radio', { name: 'नहीं' })
    .check();
  await group(/सप्लाई से पहले/)
    .getByRole('radio', { name: 'हाँ' })
    .check();
  await page.getByLabel(/इनवॉइस की रकम/).pressSequentially('500000');
  await page.getByLabel(/माल पहुँचाया/).fill('2027-01-10');
  await group(/लिखकर आपत्ति/)
    .getByRole('radio', { name: 'नहीं' })
    .check();
  await group(/लिखित समझौता/)
    .getByRole('radio', { name: 'हाँ' })
    .check();
  await page.getByLabel('कितने दिन?').fill('45');
  await page.getByRole('button', { name: 'देखें उन पर कितना बकाया है' }).click();

  await expect(page.getByRole('heading', { name: 'आपके खरीदार पर कितना बकाया है' })).toBeFocused();
  await expect(page.getByText('आपका खरीदार 35 दिन देर कर चुका है।')).toBeVisible();
  await expect(page.getByText('₹8,284', { exact: true })).toBeVisible();
  await noHorizontalScroll(page);
  await noA11yViolations(page);
  if (screenshotDir)
    await page.screenshot({ path: `${screenshotDir}/hi-result.png`, fullPage: true });

  await page.getByRole('button', { name: 'विनम्र रिमाइंडर पत्र बनाएँ' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'आपका रिमाइंडर पत्र' })).toBeFocused();
  await page.getByLabel(/^बिज़नेस का नाम/).fill('Shakti Fabricators');
  await page.getByLabel(/^बिज़नेस का पता/).fill('Plot 12, MIDC Bhosari\nPune 411026');
  await page.getByLabel(/उद्यम रजिस्ट्रेशन नंबर/).fill('UDYAM-MH-26-0123456');
  await page.getByLabel(/^आपका नाम/).fill('Ramesh Patil');
  await page.getByLabel(/फ़ोन नंबर/).fill('9820012345');
  await page.getByLabel(/खरीदार की कंपनी का नाम/).fill('Big Motors Ltd');
  await page.getByLabel(/संपर्क व्यक्ति/).fill('श्री शर्मा');
  await page.getByLabel(/खरीदार का पता/).fill('1 Industrial Area, Chennai 600032');
  await page.getByLabel(/^इनवॉइस नंबर/).fill('INV-104');
  await page.getByLabel(/^इनवॉइस की तारीख/).fill('2027-01-10');
  await page.getByRole('button', { name: 'मेरा पत्र दिखाएँ' }).click();
  await expect(page.getByRole('heading', { name: 'पत्र की झलक' })).toBeFocused();
  await expect(page.getByText(/^विषय: विनम्र अनुस्मारक/)).toBeVisible();
  await noHorizontalScroll(page);
  await noA11yViolations(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF डाउनलोड करें' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('reminder-letter-hindi-INV-104.pdf');
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.toString('latin1')).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSansDevanagari-Regular/);
  expect(fonts).toContain('/fonts/NotoSansDevanagari-Regular.ttf');
  await expect(page.getByText('आपकी PDF डाउनलोड हो गई है।')).toBeVisible();
  if (screenshotDir) {
    await writeFile(`${screenshotDir}/hi-letter.pdf`, bytes);
    await page.screenshot({ path: `${screenshotDir}/hi-letter.png`, fullPage: true });
  }

  expect(errors).toEqual([]);
});

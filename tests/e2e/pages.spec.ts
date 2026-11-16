import AxeBuilder from '@axe-core/playwright';
import { applySiteHeaders } from './siteHeaders';
import { test, expect } from '@playwright/test';

// The content pages at 360px, plus what link-preview bots and search engines see.
test.use({ viewport: { width: 360, height: 740 } });

const screenshotDir = process.env.SCREENSHOT_DIR;

const PAGES = [
  {
    path: '/how-it-works',
    title: 'How the MSME 45-day payment rule works | Bakaya',
    h1: 'How the MSME 45-day payment rule works',
  },
  { path: '/privacy', title: 'Privacy | Bakaya', h1: 'Privacy' },
  { path: '/terms', title: 'Terms of use | Bakaya', h1: 'Terms of use' },
  { path: '/', title: 'MSME 45-day payment rule calculator | Bakaya', h1: /Owed money/ },
];

for (const p of PAGES) {
  test(`${p.path}: static meta for link previews, accessible at 360px`, async ({
    page,
    request,
  }) => {
    // What WhatsApp, LinkedIn and search engines get before any JavaScript runs.
    const res = await request.get(p.path);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<title>${p.title}</title>`);
    expect(html).toMatch(/<meta name="description" content="[^"]{40,}" \/>/);
    expect(html).toMatch(/<meta property="og:image" content="https:\/\/[^"]+\/og-image\.png" \/>/);
    expect(html).toContain(`<meta property="og:title" content="${p.title}" />`);

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await applySiteHeaders(page);
    await page.clock.setFixedTime(new Date('2027-03-31T10:00:00'));
    await page.goto(p.path);
    await expect(page.getByRole('heading', { level: 1, name: p.h1 })).toBeVisible();
    await expect(page).toHaveTitle(p.title);
    await expect(page.getByRole('contentinfo')).toContainText('Rates last reviewed: 7 Nov 2026');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    if (screenshotDir) {
      const name = p.path === '/' ? 'home' : p.path.slice(1);
      await page.screenshot({ path: `${screenshotDir}/page-${name}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}

test('sitemap.xml, robots.txt and the Open Graph image are served', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ['/', '/how-it-works', '/privacy', '/terms']) {
    expect(xml).toMatch(new RegExp(`<loc>https://[^<]+${path === '/' ? '/' : path}</loc>`));
  }

  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toMatch(
    /^User-agent: \*\nAllow: \/\n\nSitemap: https:\/\/.+\/sitemap\.xml\n$/,
  );

  const og = await request.get('/og-image.png');
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toBe('image/png');
  const png = await og.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test('footer and "Learn more" navigation work without reloading the page', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  await page.getByRole('contentinfo').getByRole('link', { name: 'How it works' }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(page.getByRole('heading', { level: 1, name: /How the MSME/ })).toBeFocused();
  // Same document: no full reload happened.
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Check what they owe' })).toBeVisible();
});

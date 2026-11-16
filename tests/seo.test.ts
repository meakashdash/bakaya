import { bankRates, legalConfig } from '../src/data';
import { normalisePath, routeFor } from '../src/router';
import {
  META_VARS,
  headTags,
  normaliseSiteUrl,
  pageMeta,
  robotsTxt,
  sitemapXml,
  withHeadTags,
} from '../src/seo/meta';
import { ROUTES } from '../src/seo/routes';

const SITE = 'https://bakaya.pages.dev';

describe('page meta', () => {
  it('targets the PRD search phrases', () => {
    expect(pageMeta('home').title).toBe('MSME 45-day payment rule calculator | Bakaya');
    expect(pageMeta('home').description).toContain('MSME delayed payment interest calculator');
    expect(pageMeta('howItWorks').title).toBe('How the MSME 45-day payment rule works | Bakaya');
  });

  it('fills legal numbers from /data, not from the copy', () => {
    expect(META_VARS.maxDays).toBe(legalConfig.paymentRules.maxAgreedDays);
    expect(pageMeta('home').description).toContain(
      `${legalConfig.paymentRules.interestMultiplier} times the RBI bank rate`,
    );
    expect(pageMeta('howItWorks').description).toContain(legalConfig.msmedSections.interest.label);
    expect(pageMeta('howItWorks').description).toContain('Section 37(2)(g)');
  });

  it('every page has a unique title and description within search-result limits', () => {
    const metas = [...ROUTES.map((r) => r.key), 'notFound' as const].map(pageMeta);
    expect(new Set(metas.map((m) => m.title)).size).toBe(metas.length);
    expect(new Set(metas.map((m) => m.description)).size).toBe(metas.length);
    for (const m of metas) {
      expect(m.title.length).toBeLessThanOrEqual(60);
      expect(m.description.length).toBeLessThanOrEqual(200);
      expect(m.description).not.toMatch(/\{\{/);
    }
  });
});

describe('head tags', () => {
  const tags = headTags('privacy', `${SITE}/`);

  it('have the title, description, canonical and Open Graph image as absolute URLs', () => {
    expect(tags).toContain('<title>Privacy | Bakaya</title>');
    expect(tags).toContain('<meta name="description" content="Your invoice details never leave');
    expect(tags).toContain(`<link rel="canonical" href="${SITE}/privacy" />`);
    expect(tags).toContain(`<meta property="og:url" content="${SITE}/privacy" />`);
    expect(tags).toContain(`<meta property="og:image" content="${SITE}/og-image.png" />`);
    expect(tags).toContain('<meta property="og:image:width" content="1200" />');
    expect(tags).toContain('<meta property="og:image:height" content="630" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(tags).toContain('<meta property="og:locale" content="en_IN" />');
    expect(headTags('home', SITE)).toContain(`<link rel="canonical" href="${SITE}/" />`);
  });

  it('escape quotes and angle brackets', () => {
    expect(headTags('howItWorks', SITE)).toContain('buyer’s tax');
    expect(tags).not.toMatch(/content="[^"]*<[^"]*"/);
  });

  it('replace the marked block in the HTML template', () => {
    const html = '<head>\n<!-- seo:start -->\nold\n<!-- seo:end -->\n</head>';
    const out = withHeadTags(html, '<title>X</title>');
    expect(out).toContain('<title>X</title>');
    expect(out).not.toContain('old');
    expect(out).toContain('<!-- seo:start -->');
  });
});

describe('sitemap.xml and robots.txt', () => {
  it('lists every page with the data review date', () => {
    const xml = sitemapXml(`${SITE}/`);
    for (const r of ROUTES) expect(xml).toContain(`<loc>${SITE}${r.path}</loc>`);
    expect(xml).toContain(`<lastmod>${bankRates.lastReviewed}</lastmod>`);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('robots.txt allows crawling and points to the sitemap', () => {
    expect(robotsTxt(SITE)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  });

  it('normalises the site URL', () => {
    expect(normaliseSiteUrl(' https://x.dev/// ')).toBe('https://x.dev');
  });
});

describe('router', () => {
  it.each([
    ['/', '/'],
    ['/index.html', '/'],
    ['/privacy', '/privacy'],
    ['/privacy/', '/privacy'],
    ['/privacy.html', '/privacy'],
    ['/how-it-works//', '/how-it-works'],
  ])('normalises %s to %s', (input, expected) => expect(normalisePath(input)).toBe(expected));

  it('maps paths to pages', () => {
    expect(routeFor('/')).toBe('home');
    expect(routeFor('/how-it-works')).toBe('howItWorks');
    expect(routeFor('/terms.html')).toBe('terms');
    expect(routeFor('/nope')).toBe('notFound');
  });
});

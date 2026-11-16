// Page titles, descriptions and Open Graph tags. Used at runtime (document.title) and at build
// time (static HTML per page, sitemap.xml, robots.txt). Legal numbers come from /data.
import { bankRates, legalConfig } from '../data';
import { t } from '../i18n';
import { ROUTES, type RouteKey } from './routes';

export const OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630 };

const currentTaxSection =
  legalConfig.taxSections.find((s) => s.toTaxYear === null) ?? legalConfig.taxSections[0];

/** Placeholder values for meta copy in en.json. */
export const META_VARS = {
  maxDays: legalConfig.paymentRules.maxAgreedDays,
  multiplier: legalConfig.paymentRules.interestMultiplier,
  interestSection: legalConfig.msmedSections.interest.label,
  taxSection: currentTaxSection?.section ?? '',
};

export function pageMeta(key: RouteKey | 'notFound'): { title: string; description: string } {
  return {
    title: t(`meta.${key}.title`, META_VARS),
    description: t(`meta.${key}.description`, META_VARS),
  };
}

/** 'https://x.pages.dev/' -> 'https://x.pages.dev' */
export const normaliseSiteUrl = (url: string): string => url.trim().replace(/\/+$/, '');

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The <head> tags for one page, as an HTML string. */
export function headTags(key: RouteKey, siteUrl: string): string {
  const site = normaliseSiteUrl(siteUrl);
  const route = ROUTES.find((r) => r.key === key);
  const url = `${site}${route?.path === '/' ? '/' : (route?.path ?? '/')}`;
  const { title, description } = pageMeta(key);
  const image = `${site}${OG_IMAGE.path}`;
  const imageAlt = t('home.title', META_VARS);
  const tags: [string, Record<string, string>][] = [
    ['meta', { name: 'description', content: description }],
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: t('app.name') }],
    ['meta', { property: 'og:locale', content: 'en_IN' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:image', content: image }],
    ['meta', { property: 'og:image:width', content: String(OG_IMAGE.width) }],
    ['meta', { property: 'og:image:height', content: String(OG_IMAGE.height) }],
    ['meta', { property: 'og:image:alt', content: imageAlt }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: image }],
  ];
  const lines = [`<title>${escapeAttr(title)}</title>`];
  for (const [tag, attrs] of tags) {
    const a = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
      .join(' ');
    lines.push(`<${tag} ${a} />`);
  }
  return lines.join('\n    ');
}

/** Most recent review date across the data files, for sitemap <lastmod>. */
export const contentLastReviewed = (): string =>
  [bankRates.lastReviewed, legalConfig.lastReviewed].sort().at(-1) ?? bankRates.lastReviewed;

export function sitemapXml(siteUrl: string): string {
  const site = normaliseSiteUrl(siteUrl);
  const lastmod = contentLastReviewed();
  const urls = ROUTES.map(
    (r) =>
      `  <url>\n    <loc>${site}${r.path === '/' ? '/' : r.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const robotsTxt = (siteUrl: string): string =>
  `User-agent: *\nAllow: /\n\nSitemap: ${normaliseSiteUrl(siteUrl)}/sitemap.xml\n`;

/** Replace the SEO block in an HTML document. */
export const SEO_BLOCK = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;
export const withHeadTags = (html: string, tags: string): string =>
  html.replace(SEO_BLOCK, `<!-- seo:start -->\n    ${tags}\n    <!-- seo:end -->`);

// Page titles, descriptions and Open Graph tags. Used at runtime (document.title) and at build
// time (static HTML per page, sitemap.xml, robots.txt). Legal numbers come from /data.
import { bankRates, legalConfig } from '../data';
import { getLocale, isLocale, LOCALES, tIn, type Locale } from '../i18n';
import { msmedSection, taxLaw } from '../i18n/legal';
import { localePath } from '../router';
import { ROUTES, type RouteKey } from './routes';

export const OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630 };

const currentTaxSection =
  legalConfig.taxSections.find((s) => s.toTaxYear === null) ?? legalConfig.taxSections[0];

/** Placeholder values for meta copy in en.json / hi.json. */
export const metaVars = (locale: Locale) => ({
  maxDays: legalConfig.paymentRules.maxAgreedDays,
  multiplier: legalConfig.paymentRules.interestMultiplier,
  interestSection: msmedSection('interest', locale).label,
  taxSection: currentTaxSection ? taxLaw(currentTaxSection, locale).section : '',
});
export const META_VARS = metaVars('en');

const OG_LOCALE: Record<Locale, string> = { en: 'en_IN', hi: 'hi_IN' };

/** Title and description. `locale` defaults to the current page language. */
export function pageMeta(
  key: RouteKey | 'notFound',
  locale?: unknown,
): { title: string; description: string } {
  const l = isLocale(locale) ? locale : getLocale();
  const vars = metaVars(l);
  return {
    title: tIn(l, `meta.${key}.title`, vars),
    description: tIn(l, `meta.${key}.description`, vars),
  };
}

const pageUrl = (site: string, path: string, locale: Locale) =>
  `${site}${localePath(path, locale)}`;

/** 'https://x.pages.dev/' -> 'https://x.pages.dev' */
export const normaliseSiteUrl = (url: string): string => url.trim().replace(/\/+$/, '');

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The <head> tags for one page, as an HTML string. */
export function headTags(key: RouteKey, siteUrl: string, locale: Locale = 'en'): string {
  const site = normaliseSiteUrl(siteUrl);
  const path = ROUTES.find((r) => r.key === key)?.path ?? '/';
  const url = pageUrl(site, path, locale);
  const { title, description } = pageMeta(key, locale);
  const image = `${site}${OG_IMAGE.path}`;
  const imageAlt = tIn(locale, 'home.title', metaVars(locale));
  const tags: [string, Record<string, string>][] = [
    ['meta', { name: 'description', content: description }],
    ['link', { rel: 'canonical', href: url }],
    // The same page in each language, so search engines show the right one.
    ...LOCALES.map((l): [string, Record<string, string>] => [
      'link',
      { rel: 'alternate', hreflang: `${l}-IN`, href: pageUrl(site, path, l) },
    ]),
    ['link', { rel: 'alternate', hreflang: 'x-default', href: pageUrl(site, path, 'en') }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: tIn(locale, 'app.name') }],
    ['meta', { property: 'og:locale', content: OG_LOCALE[locale] }],
    ...LOCALES.filter((l) => l !== locale).map((l): [string, Record<string, string>] => [
      'meta',
      { property: 'og:locale:alternate', content: OG_LOCALE[l] },
    ]),
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
  const urls = LOCALES.flatMap((l) =>
    ROUTES.map(
      (r) =>
        `  <url>\n    <loc>${pageUrl(site, r.path, l)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
    ),
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const robotsTxt = (siteUrl: string): string =>
  `User-agent: *\nAllow: /\n\nSitemap: ${normaliseSiteUrl(siteUrl)}/sitemap.xml\n`;

/** Replace the SEO block in an HTML document. */
export const SEO_BLOCK = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;
export const withHeadTags = (html: string, tags: string): string =>
  html.replace(SEO_BLOCK, `<!-- seo:start -->\n    ${tags}\n    <!-- seo:end -->`);

/** The <html lang> of a built page. */
export const withHtmlLang = (html: string, locale: Locale): string =>
  html.replace(/<html lang="[^"]*">/, `<html lang="${locale}-IN">`);

/** The static file each page is written to: privacy.html, hi/privacy.html, hi/index.html. */
export const pageFile = (file: string, locale: Locale): string =>
  locale === 'en' ? file : `${locale}/${file}`;

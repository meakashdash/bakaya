// Hindi pages live under /hi. Routing, head tags, sitemap and the static files for each language.
import { headTags, pageFile, pageMeta, sitemapXml, withHtmlLang } from '../src/seo/meta';
import { localeFor, localePath, routeFor, stripLocale } from '../src/router';
import { ROUTES } from '../src/seo/routes';
import { setLocale } from '../src/i18n';

const SITE = 'https://bakaya.pages.dev';
afterEach(() => setLocale('en'));

describe('routes by language', () => {
  it.each([
    ['/', 'en', '/', 'home'],
    ['/privacy', 'en', '/privacy', 'privacy'],
    ['/hi', 'hi', '/', 'home'],
    ['/hi/', 'hi', '/', 'home'],
    ['/hi/index.html', 'hi', '/', 'home'],
    ['/hi/privacy', 'hi', '/privacy', 'privacy'],
    ['/hi/how-it-works.html', 'hi', '/how-it-works', 'howItWorks'],
    ['/hi/nope', 'hi', '/nope', 'notFound'],
    ['/history', 'en', '/history', 'notFound'], // starts with "hi" but isn't /hi
    ['/hindi', 'en', '/hindi', 'notFound'],
  ])('%s -> %s, %s, %s', (path, locale, stripped, route) => {
    expect(localeFor(path)).toBe(locale);
    expect(stripLocale(path)).toBe(stripped);
    expect(routeFor(path)).toBe(route);
  });

  it('localePath moves a path between languages and keeps the #hash', () => {
    expect(localePath('/', 'hi')).toBe('/hi');
    expect(localePath('/privacy', 'hi')).toBe('/hi/privacy');
    expect(localePath('/how-it-works#rates', 'hi')).toBe('/hi/how-it-works#rates');
    expect(localePath('/hi/privacy', 'en')).toBe('/privacy');
    expect(localePath('/hi', 'en')).toBe('/');
    expect(localePath('/hi/terms', 'hi')).toBe('/hi/terms');
    expect(localePath('#interest', 'hi')).toBe('/hi#interest');
  });
});

describe('Hindi head tags', () => {
  const tags = headTags('privacy', SITE, 'hi');

  it('Hindi title and description, canonical under /hi, og:locale hi_IN', () => {
    expect(tags).toContain('<title>प्राइवेसी | Bakaya</title>');
    expect(tags).toContain(`<link rel="canonical" href="${SITE}/hi/privacy" />`);
    expect(tags).toContain(`<meta property="og:url" content="${SITE}/hi/privacy" />`);
    expect(tags).toContain('<meta property="og:locale" content="hi_IN" />');
    expect(tags).toContain('<meta property="og:locale:alternate" content="en_IN" />');
  });

  it('both languages link to each other (hreflang), English is the default', () => {
    for (const t of [tags, headTags('privacy', SITE, 'en')]) {
      expect(t).toContain(`<link rel="alternate" hreflang="en-IN" href="${SITE}/privacy" />`);
      expect(t).toContain(`<link rel="alternate" hreflang="hi-IN" href="${SITE}/hi/privacy" />`);
      expect(t).toContain(`<link rel="alternate" hreflang="x-default" href="${SITE}/privacy" />`);
    }
    expect(headTags('home', SITE, 'hi')).toContain(`<link rel="canonical" href="${SITE}/hi" />`);
  });

  it('Hindi meta uses the Hindi section labels from /data', () => {
    expect(pageMeta('howItWorks', 'hi').description).toContain('MSMED अधिनियम, 2006, धारा 16');
    expect(pageMeta('howItWorks', 'hi').description).toContain('धारा 37(2)(g)');
    setLocale('hi');
    expect(pageMeta('home').title).toBe('MSME 45 दिन भुगतान नियम कैलकुलेटर | Bakaya');
  });

  it('static files: hi/ folder and <html lang>', () => {
    expect(pageFile('privacy.html', 'en')).toBe('privacy.html');
    expect(pageFile('privacy.html', 'hi')).toBe('hi/privacy.html');
    expect(pageFile('index.html', 'hi')).toBe('hi/index.html');
    expect(withHtmlLang('<html lang="en-IN">\n<head>', 'hi')).toBe('<html lang="hi-IN">\n<head>');
  });

  it('sitemap lists every page in both languages', () => {
    const xml = sitemapXml(SITE);
    for (const r of ROUTES) {
      expect(xml).toContain(`<loc>${SITE}${r.path}</loc>`);
      expect(xml).toContain(`<loc>${SITE}${localePath(r.path, 'hi')}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(ROUTES.length * 2);
  });
});

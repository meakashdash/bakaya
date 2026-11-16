/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { ROUTES } from './src/seo/routes';
import {
  headTags,
  pageFile,
  robotsTxt,
  sitemapXml,
  withHeadTags,
  withHtmlLang,
} from './src/seo/meta';
import { LOCALES } from './src/i18n';
import { beaconTag } from './src/seo/beacon';

/**
 * SEO at build time: every page gets its own static HTML with the right <title>, description
 * and Open Graph tags (link previews on WhatsApp don't run JavaScript), plus sitemap.xml and
 * robots.txt. Cloudflare Pages serves privacy.html at /privacy.
 */
function seo(siteUrl: string, analyticsToken: string | undefined): Plugin {
  const beacon = beaconTag(analyticsToken);
  return {
    name: 'bakaya-seo',
    transformIndexHtml: (html) => {
      const withTags = withHeadTags(html, headTags('home', siteUrl));
      // Cookieless page views, only if a token is configured.
      return beacon
        ? withTags.replace(
            '</body>',
            `  ${beacon}
  </body>`,
          )
        : withTags;
    },
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const index = bundle['index.html'];
        if (!index || index.type !== 'asset') return;
        const html = String(index.source);
        // English pages at /, /privacy, ...; Hindi pages at /hi, /hi/privacy, ...
        for (const locale of LOCALES) {
          for (const route of ROUTES) {
            if (route.key === 'home' && locale === 'en') continue;
            this.emitFile({
              type: 'asset',
              fileName: pageFile(route.file, locale),
              source: withHtmlLang(
                withHeadTags(html, headTags(route.key, siteUrl, locale)),
                locale,
              ),
            });
          }
        }
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(siteUrl) });
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(siteUrl) });
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Absolute URLs for canonical, Open Graph and the sitemap. Set VITE_SITE_URL once the
  // Cloudflare Pages project (or a custom domain) exists.
  const siteUrl = env.VITE_SITE_URL || 'https://bakaya.pages.dev';
  return {
    plugins: [react(), tailwindcss(), seo(siteUrl, env.VITE_CF_ANALYTICS_TOKEN)],
    build: {
      // The lazy-loaded PDF chunk (@react-pdf/renderer) is ~1.2 MB raw / ~450 KB gzipped and loads
      // only when a letter is opened. The first-load bundle is far below this.
      chunkSizeWarningLimit: 1300,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
      exclude: ['tests/e2e/**', 'node_modules/**'],
      passWithNoTests: true,
      coverage: {
        provider: 'v8',
        include: ['src/domain/**', 'src/data/**', 'src/i18n/**'],
        // CLAUDE.md: the domain layer must have 100% test coverage.
        thresholds: {
          'src/domain/**': { lines: 100, branches: 100, functions: 100, statements: 100 },
        },
      },
    },
  };
});

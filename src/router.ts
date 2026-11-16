// A tiny client-side router for four pages; no dependency needed.
// Each route also exists as a static HTML file at build time (see vite.config.ts), so direct
// visits and link previews get the right title and Open Graph tags without JavaScript.
import { useSyncExternalStore } from 'react';
import type { Locale } from './i18n';
import { ROUTES, type RouteKey } from './seo/routes';

/** '/privacy/', '/privacy.html' and '/privacy' are the same page. */
export function normalisePath(pathname: string): string {
  const p = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  return p.length > 1 ? p.replace(/\/+$/, '') : '/';
}

/** Hindi pages live under /hi: /hi, /hi/how-it-works, ... Everything else is English. */
export function localeFor(pathname: string): Locale {
  const path = normalisePath(pathname);
  return path === '/hi' || path.startsWith('/hi/') ? 'hi' : 'en';
}

/** The path without its language prefix: '/hi/privacy' -> '/privacy', '/hi' -> '/'. */
export function stripLocale(pathname: string): string {
  const path = normalisePath(pathname);
  if (localeFor(path) === 'en') return path;
  return path.slice(3) || '/';
}

/** The same page in a language: ('/privacy', 'hi') -> '/hi/privacy'. Keeps any #hash. */
export function localePath(to: string, locale: Locale): string {
  const i = to.indexOf('#');
  const [path, hash] = i === -1 ? [to, ''] : [to.slice(0, i), to.slice(i)];
  const base = stripLocale(path || '/');
  if (locale === 'en') return base + hash;
  return (base === '/' ? '/hi' : `/hi${base}`) + hash;
}

export function routeFor(pathname: string): RouteKey | 'notFound' {
  const path = stripLocale(pathname);
  return ROUTES.find((r) => r.path === path)?.key ?? 'notFound';
}

const NAVIGATE = 'bakaya:navigate';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE, onChange);
  };
}

/** The current pathname and hash, kept in sync with the address bar. */
export function useLocation(): { pathname: string; hash: string } {
  const href = useSyncExternalStore(
    subscribe,
    () => window.location.pathname + window.location.hash,
  );
  const i = href.indexOf('#');
  return i === -1
    ? { pathname: href, hash: '' }
    : { pathname: href.slice(0, i), hash: href.slice(i + 1) };
}

export function navigate(to: string): void {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(NAVIGATE));
}

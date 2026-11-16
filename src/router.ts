// A tiny client-side router for four pages; no dependency needed.
// Each route also exists as a static HTML file at build time (see vite.config.ts), so direct
// visits and link previews get the right title and Open Graph tags without JavaScript.
import { useSyncExternalStore } from 'react';
import { ROUTES, type RouteKey } from './seo/routes';

/** '/privacy/', '/privacy.html' and '/privacy' are the same page. */
export function normalisePath(pathname: string): string {
  const p = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  return p.length > 1 ? p.replace(/\/+$/, '') : '/';
}

export function routeFor(pathname: string): RouteKey | 'notFound' {
  const path = normalisePath(pathname);
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

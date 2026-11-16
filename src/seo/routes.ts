// The site's pages. `file` is the static HTML written at build time for each route
// (Cloudflare Pages serves privacy.html at /privacy).
export const ROUTES = [
  { key: 'home', path: '/', file: 'index.html' },
  { key: 'howItWorks', path: '/how-it-works', file: 'how-it-works.html' },
  { key: 'privacy', path: '/privacy', file: 'privacy.html' },
  { key: 'terms', path: '/terms', file: 'terms.html' },
] as const;

export type RouteKey = (typeof ROUTES)[number]['key'];

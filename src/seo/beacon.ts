// Cloudflare Web Analytics beacon (cookieless page views), added to the HTML at build time
// only when VITE_CF_ANALYTICS_TOKEN is set. The beacon sees the page address, never form
// values; the app never puts user data in the URL.

export const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

/** Cloudflare's site tokens are 32 hex characters. Anything else fails the build loudly. */
const TOKEN = /^[a-f0-9]{32}$/i;

export function beaconTag(token: string | undefined): string {
  const value = token?.trim() ?? '';
  if (value === '') return '';
  if (!TOKEN.test(value)) {
    throw new Error(
      'VITE_CF_ANALYTICS_TOKEN does not look like a Cloudflare Web Analytics token (32 hex characters).',
    );
  }
  // spa: true counts in-app page changes (/how-it-works etc.) as page views.
  const config = JSON.stringify({ token: value, spa: true });
  return `<script defer src="${BEACON_SRC}" data-cf-beacon='${config}'></script>`;
}

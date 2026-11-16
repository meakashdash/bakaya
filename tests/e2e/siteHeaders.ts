// Applies public/_headers to every response in the Playwright run, so the tests exercise the
// real Content Security Policy that Cloudflare Pages will send (vite preview doesn't read _headers).
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

export function parseHeadersFile(text: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();
  let current: Record<string, string> | null = null;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = {};
      rules.set(raw.trim(), current);
    } else if (current) {
      const i = raw.indexOf(':');
      current[raw.slice(0, i).trim().toLowerCase()] = raw.slice(i + 1).trim();
    }
  }
  return rules;
}

export const siteHeaders = () =>
  parseHeadersFile(readFileSync('public/_headers', 'utf8')).get('/*') ?? {};

export async function applySiteHeaders(page: Page): Promise<void> {
  const headers = siteHeaders();
  await page.route('http://localhost:4173/**', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
}

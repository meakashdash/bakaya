// Analytics: the five PRD events, never with form values; beacon only with a valid token;
// security headers allow exactly what the app needs.
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { ANALYTICS_EVENTS, track } from '../src/analytics';
import Home from '../src/pages/Home';
import { BEACON_SRC, beaconTag } from '../src/seo/beacon';
import { parseHeadersFile } from './e2e/siteHeaders';

const renderLetterPdf = vi.fn(async () => new Blob(['%PDF-1.3'], { type: 'application/pdf' }));
vi.mock('../src/letters/pdf', () => ({ renderLetterPdf }));
vi.setConfig({ testTimeout: 30_000 });

type ZarazWindow = Window & { zaraz?: { track: ReturnType<typeof vi.fn> } };
const win = window as ZarazWindow;

afterEach(() => {
  delete win.zaraz;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('track()', () => {
  it('does nothing when Zaraz is not on the page (e.g. on *.pages.dev)', () => {
    expect(() => track('calculate_clicked')).not.toThrow();
  });

  it('sends only the event name to Zaraz', () => {
    win.zaraz = { track: vi.fn() };
    track('letter_opened');
    expect(win.zaraz.track).toHaveBeenCalledTimes(1);
    expect(win.zaraz.track.mock.calls[0]).toEqual(['letter_opened']);
  });

  it('never breaks the app if Zaraz throws or rejects', async () => {
    win.zaraz = {
      track: vi.fn(() => {
        throw new Error('boom');
      }),
    };
    expect(() => track('whatsapp_shared')).not.toThrow();
    win.zaraz = { track: vi.fn(() => Promise.reject(new Error('offline'))) };
    expect(() => track('whatsapp_shared')).not.toThrow();
    await Promise.resolve();
  });

  it('has exactly the events listed in the PRD', () => {
    const prd = readFileSync('docs/PRD.md', 'utf8');
    const listed = [...prd.matchAll(/`([a-z_]+_(?:clicked|opened|downloaded|shared))`/g)].map(
      (m) => m[1],
    );
    expect([...ANALYTICS_EVENTS].sort()).toEqual([...new Set(listed)].sort());
  });
});

describe('events through the real UI', () => {
  it('fires all five events, each with no data, on a full journey', async () => {
    vi.stubEnv('VITE_WAITLIST_URL', 'https://forms.gle/early');
    win.zaraz = { track: vi.fn() };
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // Stop jsdom from trying to follow external links when they are clicked.
    const stopNavigation = (e: Event) => {
      if ((e.target as Element).closest('a[target="_blank"]')) e.preventDefault();
    };
    document.addEventListener('click', stopNavigation);

    const user = userEvent.setup({ delay: null });
    render(<Home asOfDate="2027-03-31" siteUrl="https://x.test" />);
    const group = (name: RegExp) => screen.getByRole('group', { name });
    await user.click(screen.getByRole('radio', { name: /^micro$/i }));
    await user.click(within(group(/only trade goods/i)).getByRole('radio', { name: 'No' }));
    await user.click(
      within(group(/registration done before/i)).getByRole('radio', { name: 'Yes' }),
    );
    await user.type(screen.getByLabelText(/invoice amount/i), '500000');
    fireEvent.change(screen.getByLabelText(/date you delivered/i), {
      target: { value: '2027-01-10' },
    });
    await user.click(within(group(/object in writing/i)).getByRole('radio', { name: 'No' }));
    await user.click(within(group(/written agreement/i)).getByRole('radio', { name: 'Yes' }));
    await user.type(screen.getByLabelText(/how many days/i), '45');

    // An invalid submit is not a calculation.
    await user.clear(screen.getByLabelText(/how many days/i));
    await user.click(screen.getByRole('button', { name: 'Check what they owe' }));
    await screen.findByText('Enter the agreed number of days');
    expect(win.zaraz.track).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/how many days/i), '45');
    await user.click(screen.getByRole('button', { name: 'Check what they owe' }));
    await screen.findByRole('heading', { name: 'What your buyer owes' });
    await user.click(screen.getByRole('link', { name: /Share on WhatsApp/ }));
    await user.click(screen.getByRole('button', { name: 'Create a polite reminder letter' }));
    await screen.findByRole(
      'heading',
      { level: 1, name: 'Your reminder letter' },
      { timeout: 10_000 },
    );

    const type = (label: RegExp, text: string) => user.type(screen.getByLabelText(label), text);
    await type(/^business name/i, 'Shakti Fabricators');
    await type(/^business address/i, 'Plot 12, Pune');
    await type(/udyam registration number/i, 'UDYAM-MH-26-0123456');
    await type(/^your name/i, 'Ramesh Patil');
    await type(/phone number/i, '9820012345');
    await type(/buyer's company name/i, 'Big Motors Ltd');
    await type(/contact person/i, 'Mr. Sharma');
    await type(/buyer's address/i, 'Chennai');
    await type(/invoice number/i, 'INV-104');
    fireEvent.change(screen.getByLabelText(/invoice date/i), { target: { value: '2027-01-10' } });
    await user.click(screen.getByRole('button', { name: 'Show my letter' }));
    await user.click(await screen.findByRole('button', { name: 'Download PDF' }));
    await screen.findByText('Your PDF is downloaded.');
    await user.click(screen.getByRole('link', { name: /Join the early list/ }));
    document.removeEventListener('click', stopNavigation);

    const calls = win.zaraz.track.mock.calls;
    expect(calls).toEqual([
      ['calculate_clicked'],
      ['whatsapp_shared'],
      ['letter_opened'],
      ['letter_downloaded'],
      ['waitlist_clicked'],
    ]);
    // Belt and braces: nothing the user typed appears anywhere in what was sent.
    const sent = JSON.stringify(calls);
    for (const value of [
      '500000',
      '5,00,000',
      '8,284',
      'Shakti',
      'Ramesh',
      'Big Motors',
      'INV-104',
      '9820012345',
      '2027',
    ]) {
      expect(sent).not.toContain(value);
    }
  });
});

describe('Cloudflare Web Analytics beacon', () => {
  it('is skipped when the token is empty', () => {
    expect(beaconTag(undefined)).toBe('');
    expect(beaconTag('')).toBe('');
    expect(beaconTag('   ')).toBe('');
  });

  it('is a deferred script with the token and SPA page views', () => {
    const tag = beaconTag('0123456789abcdef0123456789ABCDEF');
    expect(tag).toBe(
      `<script defer src="${BEACON_SRC}" data-cf-beacon='{"token":"0123456789abcdef0123456789ABCDEF","spa":true}'></script>`,
    );
  });

  it('refuses anything that is not a token, so nothing can be injected into the HTML', () => {
    expect(() => beaconTag(`abc' onload='alert(1)`)).toThrow(/32 hex characters/);
    expect(() => beaconTag('0123456789abcdef')).toThrow();
  });
});

describe('public/_headers', () => {
  const rules = parseHeadersFile(readFileSync('public/_headers', 'utf8'));
  const all = rules.get('/*') ?? {};
  const csp = Object.fromEntries(
    (all['content-security-policy'] ?? '').split(';').map((d) => {
      const [name = '', ...values] = d.trim().split(/\s+/);
      return [name, values];
    }),
  );

  it('sends the security headers on every page', () => {
    expect(all['x-frame-options']).toBe('DENY');
    expect(all['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(all['x-content-type-options']).toBe('nosniff');
    expect(all['strict-transport-security']).toMatch(/^max-age=\d+/);
    expect(all['permissions-policy']).toContain('camera=()');
  });

  it('has a strict CSP that allows only this site, the analytics beacon and the PDF engine', () => {
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['script-src']).toEqual(["'self'", "'wasm-unsafe-eval'", new URL(BEACON_SRC).origin]);
    expect(csp['script-src']).not.toContain("'unsafe-inline'");
    expect(csp['script-src']).not.toContain("'unsafe-eval'");
    expect(csp['connect-src']).toEqual(["'self'", 'data:', 'https://cloudflareinsights.com']);
    expect(csp['style-src']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
  });

  it('caches hashed assets for a year', () => {
    expect(rules.get('/assets/*')?.['cache-control']).toBe('public, max-age=31536000, immutable');
  });
});

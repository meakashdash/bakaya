// How it works, Privacy, Terms, footer and in-app navigation.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { bankRates, legalConfig } from '../../src/data';
import HowItWorks from '../../src/pages/HowItWorks';
import Privacy from '../../src/pages/Privacy';
import Terms from '../../src/pages/Terms';

vi.setConfig({ testTimeout: 20_000 });

const goTo = (path: string) => window.history.replaceState(null, '', path);
afterEach(() => goTo('/'));

describe('/how-it-works', () => {
  beforeEach(() => {
    render(<HowItWorks asOfDate="2027-03-31" />);
  });

  it('explains every rule from LEGAL_RULES.md, with values from /data', () => {
    expect(
      screen.getByRole('heading', { level: 1, name: 'How the MSME 45-day payment rule works' }),
    ).toBeInTheDocument();
    for (const name of [
      'Who is protected',
      'When the buyer must pay',
      'Interest on late payment',
      'The buyer’s income tax',
      'If the buyer still doesn’t pay',
      'RBI bank rates we use',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByText(/must pay within 15 days\./)).toBeInTheDocument();
    expect(screen.getByText(/never more than 45 days/)).toBeInTheDocument();
    expect(screen.getByText(/objects in writing within 15 days of delivery/)).toBeInTheDocument();
  });

  it('works through the LEGAL_RULES.md example with the real date functions', () => {
    expect(
      screen.getByText(
        'Example: you deliver on 10 Jan 2027 and the agreement says 45 days. Payment is due by 24 Feb 2027. Interest starts on 25 Feb 2027.',
      ),
    ).toBeInTheDocument();
  });

  it('shows today’s interest rate from the bank-rate data', () => {
    expect(screen.getByText(/Today that is 17\.25% a year \(3 × 5\.75%\)\./)).toBeInTheDocument();
  });

  it('says the deduction is deferred, not lost (CLAUDE.md wording rule)', () => {
    const tax = screen.getByRole('region', { name: 'The buyer’s income tax' });
    expect(tax).toHaveTextContent('They can claim it only in the year they actually pay.');
    expect(tax.textContent).not.toMatch(/\blos[et]\b/i);
  });

  it('lists both tax sections by tax year', () => {
    expect(
      screen.getByText('Tax years 2023-24 to 2025-26: Section 43B(h) of the Income-tax Act, 1961'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tax year 2026-27 onwards: Section 37(2)(g) of the Income-tax Act, 2025'),
    ).toBeInTheDocument();
  });

  it('shows the size limits table from legal-config', () => {
    const table = screen.getByRole('table', { name: /Business size limits from 1 Apr 2025/ });
    const micro = within(table).getByRole('row', { name: /Micro/ });
    expect(micro).toHaveTextContent('₹2.5 crore');
    expect(micro).toHaveTextContent('₹10 crore');
    expect(within(table).getByRole('row', { name: /Medium/ })).toHaveTextContent('₹500 crore');
  });

  it('lists every bank rate, newest first, with 3× the rate', () => {
    const table = screen.getByRole('table', { name: 'RBI bank rate history used for interest' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(bankRates.rates.length);
    expect(rows[0]).toHaveTextContent('7 Oct 2026');
    expect(rows[0]).toHaveTextContent('5.75%');
    expect(rows[0]).toHaveTextContent('17.25%');
    expect(
      screen.getByText(
        `Rates last reviewed on 7 Nov 2026. We update this list after every change by the RBI.`,
      ),
    ).toBeInTheDocument();
  });

  it('links every source safely in a new tab', () => {
    const links = screen.getAllByRole('link', { name: /opens in a new tab/ });
    expect(links.length).toBeGreaterThanOrEqual(legalConfig.sources.length);
    for (const a of links) {
      expect(a.getAttribute('href')).toMatch(/^https:\/\//);
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
    expect(
      screen.getByRole('link', { name: 'Open the MSME ODR portal (opens in a new tab)' }),
    ).toHaveAttribute('href', legalConfig.complaintPortal.url);
  });

  it('shows the disclaimer', () => {
    expect(screen.getByText(legalConfig.disclaimer)).toBeInTheDocument();
  });
});

describe('/privacy and /terms', () => {
  it('privacy: nothing leaves the device, no cookies, cookieless analytics', () => {
    render(<Privacy />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument();
    expect(screen.getByText(/never sent to us or to anyone else/)).toBeInTheDocument();
    expect(screen.getByText(/We don’t set cookies\./)).toBeInTheDocument();
    expect(screen.getByText(/Cloudflare Web Analytics.*doesn’t use cookies/)).toBeInTheDocument();
    expect(screen.getByText(/We never record what you type into the form\./)).toBeInTheDocument();
  });

  it('terms: information only, not legal advice, with the disclaimer', () => {
    render(<Terms />);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of use' })).toBeInTheDocument();
    expect(screen.getByText(/Nothing on this site is legal or tax advice/)).toBeInTheDocument();
    expect(screen.getByText(legalConfig.disclaimer)).toBeInTheDocument();
  });
});

describe('app navigation', () => {
  it('footer shows "Rates last reviewed" from bank-rates.json and links to every page', () => {
    render(<App />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('Rates last reviewed: 7 Nov 2026')).toBeInTheDocument();
    const nav = within(footer).getByRole('navigation', { name: 'Site' });
    for (const [name, href] of [
      ['Calculator', '/'],
      ['How it works', '/how-it-works'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
    ] as const) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('opens a page in-app, sets its title, focuses its heading, and Back works', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);
    await user.click(
      within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Privacy' }),
    );
    expect(window.location.pathname).toBe('/privacy');
    const h1 = screen.getByRole('heading', { level: 1, name: 'Privacy' });
    await waitFor(() => expect(h1).toHaveFocus());
    expect(document.title).toBe('Privacy | Bakaya');

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(await screen.findByRole('button', { name: 'Check what they owe' })).toBeVisible();
    expect(document.title).toBe('MSME 45-day payment rule calculator | Bakaya');
  });

  it('a direct visit to /how-it-works#interest opens that section', async () => {
    goTo('/how-it-works#interest');
    render(<App />);
    const section = screen.getByRole('region', { name: 'Interest on late payment' });
    await waitFor(() => expect(section).toHaveFocus());
    expect(document.title).toBe('How the MSME 45-day payment rule works | Bakaya');
  });

  it('keeps the calculator result while you read another page', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);
    const group = (name: RegExp) => screen.getByRole('group', { name });
    await user.click(screen.getByRole('radio', { name: /^micro$/i }));
    await user.click(within(group(/only trade goods/i)).getByRole('radio', { name: 'No' }));
    await user.click(
      within(group(/registration done before/i)).getByRole('radio', { name: 'Yes' }),
    );
    await user.type(screen.getByLabelText(/invoice amount/i), '500000');
    fireEvent.change(screen.getByLabelText(/date you delivered/i), {
      target: { value: '2026-01-10' },
    });
    await user.click(within(group(/object in writing/i)).getByRole('radio', { name: 'No' }));
    await user.click(within(group(/written agreement/i)).getByRole('radio', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Check what they owe' }));
    const why = await screen.findByRole('region', { name: 'Why this is true' });

    // "Learn more" goes to the matching section of /how-it-works.
    await user.click(
      within(why).getByRole('link', { name: /Learn more about MSMED Act, 2006, Section 16/ }),
    );
    expect(window.location.pathname + window.location.hash).toBe('/how-it-works#interest');
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Interest on late payment' })).toHaveFocus(),
    );

    await user.click(screen.getByRole('link', { name: 'Bakaya, go to the calculator' }));
    expect(screen.getByRole('heading', { name: 'What your buyer owes' })).toBeVisible();
  });

  it('unknown paths show a friendly "Page not found"', () => {
    goTo('/does-not-exist');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the calculator' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Page not found | Bakaya');
  });
});

// Regression tests for issues found in the senior review.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import Home from '../../src/pages/Home';

vi.setConfig({ testTimeout: 20_000 });

type User = ReturnType<typeof userEvent.setup>;
const group = (name: RegExp) => screen.getByRole('group', { name });

async function fillCalculator(
  user: User,
  { delivery = '2027-01-10', days = '45', amount = '500000' } = {},
) {
  await user.click(screen.getByRole('radio', { name: /^micro$/i }));
  await user.click(within(group(/only trade goods/i)).getByRole('radio', { name: 'No' }));
  await user.click(within(group(/registration done before/i)).getByRole('radio', { name: 'Yes' }));
  await user.type(screen.getByLabelText(/invoice amount/i), amount);
  fireEvent.change(screen.getByLabelText(/date you delivered/i), { target: { value: delivery } });
  await user.click(within(group(/object in writing/i)).getByRole('radio', { name: 'No' }));
  await user.click(within(group(/written agreement/i)).getByRole('radio', { name: 'Yes' }));
  await user.type(screen.getByLabelText(/how many days/i), days);
}

const check = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Check what they owe' }));

describe('review fixes', () => {
  it('an invoice older than the bank-rate data gets a clear message instead of failing silently', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Home asOfDate="2026-11-07" siteUrl="https://x.test" />);
    await fillCalculator(user, { delivery: '2022-06-01' });
    await check(user);
    expect(
      await screen.findByText('We can only check invoices delivered on or after 8 Feb 2023.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/date you delivered/i)).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'What your buyer owes' })).not.toBeInTheDocument();
  });

  it('editing an answer after checking clears the old result and explains why', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Home asOfDate="2027-03-31" siteUrl="https://x.test" />);
    await fillCalculator(user);
    await check(user);
    expect(await screen.findByText('₹8,284')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/invoice amount/i), '0');
    expect(screen.queryByText('₹8,284')).not.toBeInTheDocument();
    expect(screen.getByText(/You changed your answers/)).toBeInTheDocument();

    await check(user);
    expect(
      await screen.findByRole('heading', { name: 'What your buyer owes' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/You changed your answers/)).not.toBeInTheDocument();
  });

  it('"1 day", not "1 days", in the payment period', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Home asOfDate="2027-03-31" siteUrl="https://x.test" />);
    await fillCalculator(user, { days: '1' });
    await check(user);
    expect(await screen.findByText('1 day from 10 Jan 2027')).toBeInTheDocument();
  });

  it('before the due date the label says interest "would start", and the RBI rate is explained', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Home asOfDate="2027-02-01" siteUrl="https://x.test" />);
    await fillCalculator(user);
    await check(user);
    expect(await screen.findByText('Interest would start on')).toBeInTheDocument();
    expect(screen.queryByText('Interest counted from')).not.toBeInTheDocument();
    expect(screen.getByText(/set by the Reserve Bank of India/)).toBeInTheDocument();
  });

  it('"Calculate another invoice" does not carry the old invoice number into the next letter', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Home asOfDate="2027-03-31" siteUrl="https://x.test" />);
    await fillCalculator(user);
    await check(user);
    await user.click(
      await screen.findByRole('button', { name: 'Create a polite reminder letter' }),
    );
    await screen.findByRole(
      'heading',
      { level: 1, name: 'Your reminder letter' },
      { timeout: 10_000 },
    );
    await user.type(screen.getByLabelText(/^business name/i), 'Shakti Fabricators');
    await user.type(screen.getByLabelText(/buyer's company name/i), 'Big Motors Ltd');
    await user.type(screen.getByLabelText(/invoice number/i), 'INV-104');
    fireEvent.change(screen.getByLabelText(/invoice date/i), { target: { value: '2027-01-10' } });
    await user.click(screen.getByRole('button', { name: /Back to the result/ }));
    await user.click(screen.getByRole('button', { name: 'Calculate another invoice' }));

    await fillCalculator(user, { amount: '100000' });
    await check(user);
    await user.click(
      await screen.findByRole('button', { name: 'Create a polite reminder letter' }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Your reminder letter' });
    expect(screen.getByLabelText(/^business name/i)).toHaveValue('Shakti Fabricators');
    expect(screen.getByLabelText(/buyer's company name/i)).toHaveValue('Big Motors Ltd');
    expect(screen.getByLabelText(/invoice number/i)).toHaveValue('');
    expect(screen.getByLabelText(/invoice date/i)).toHaveValue('');
  });

  it('page titles describe the page, and the skip link targets main content', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);
    expect(document.title).toBe('MSME 45-day payment rule calculator | Bakaya');
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.getElementById('main')?.tagName).toBe('MAIN');

    await fillCalculator(user, { delivery: '2026-01-10' });
    await check(user);
    await user.click(
      await screen.findByRole('button', { name: 'Create a polite reminder letter' }),
    );
    await screen.findByRole(
      'heading',
      { level: 1, name: 'Your reminder letter' },
      { timeout: 10_000 },
    );
    expect(document.title).toBe('Your reminder letter: Bakaya');
    await user.click(screen.getByRole('button', { name: /Back to the result/ }));
    await waitFor(() =>
      expect(document.title).toBe('MSME 45-day payment rule calculator | Bakaya'),
    );
  });
});

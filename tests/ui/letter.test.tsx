// Letter flow (PRD §3) through the UI. The real PDF is tested in tests/letters/pdf.test.tsx;
// here the lazily-imported PDF module is mocked so jsdom doesn't need fonts.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../src/pages/Home';
import { STORAGE_KEY } from '../../src/letters/storage';

const renderLetterPdf = vi.fn(async () => new Blob(['%PDF-1.3'], { type: 'application/pdf' }));
vi.mock('../../src/letters/pdf', () => ({ renderLetterPdf }));

// These flows type ~200 characters; allow time when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

type User = ReturnType<typeof userEvent.setup>;
const group = (name: RegExp) => screen.getByRole('group', { name });

beforeEach(() => {
  localStorage.clear();
  renderLetterPdf.mockClear();
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function calculateTC1(
  user: User,
  { category = /^micro$/i, asOf = '2027-03-31' }: { category?: RegExp; asOf?: string } = {},
) {
  render(<Home asOfDate={asOf} siteUrl="https://bakaya.pages.dev" />);
  await user.click(screen.getByRole('radio', { name: category }));
  if (/micro|small/.test(String(category))) {
    await user.click(within(group(/only trade goods/i)).getByRole('radio', { name: 'No' }));
  }
  await user.click(within(group(/registration done before/i)).getByRole('radio', { name: 'Yes' }));
  await user.type(screen.getByLabelText(/invoice amount/i), '500000');
  fireEvent.change(screen.getByLabelText(/date you delivered/i), {
    target: { value: '2027-01-10' },
  });
  await user.click(within(group(/object in writing/i)).getByRole('radio', { name: 'No' }));
  await user.click(within(group(/written agreement/i)).getByRole('radio', { name: 'Yes' }));
  await user.type(screen.getByLabelText(/how many days/i), '45');
  await user.click(screen.getByRole('button', { name: 'Check what they owe' }));
  await screen.findByRole('heading', { name: 'What your buyer owes' });
}

async function openLetter(user: User) {
  await user.click(screen.getByRole('button', { name: 'Create a polite reminder letter' }));
  // The letter view is lazy-loaded; a cold import can be slow under coverage.
  return screen.findByRole(
    'heading',
    { level: 1, name: 'Your reminder letter' },
    { timeout: 10_000 },
  );
}

async function fillDetails(user: User, { udyam = true }: { udyam?: boolean } = {}) {
  const type = (label: RegExp, text: string) => user.type(screen.getByLabelText(label), text);
  await type(/^business name/i, 'Shakti Fabricators');
  await type(/^business address/i, 'Plot 12, MIDC Bhosari{Enter}Pune 411026');
  if (udyam) await type(/udyam registration number/i, 'udyam-mh-26-0123456');
  await type(/^your name/i, 'Ramesh Patil');
  await type(/phone number/i, '9820012345');
  await type(/buyer's company name/i, 'Big Motors Ltd');
  await type(/contact person/i, 'Mr. Sharma');
  await type(/buyer's address/i, '1 Industrial Area, Chennai');
  await type(/invoice number/i, 'INV-104');
  fireEvent.change(screen.getByLabelText(/invoice date/i), { target: { value: '2027-01-10' } });
}

const showLetter = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Show my letter' }));

describe('letter flow', () => {
  it('opens in place of the result, with focus on its heading', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    const heading = await openLetter(user);
    // The view is lazy-loaded; focus moves in an effect just after it appears.
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByRole('heading', { name: 'What your buyer owes' })).not.toBeInTheDocument();
    expect(group(/how firm should the letter be/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Friendly reminder/ })).toBeChecked();
  });

  it('explains missing details and focuses the first one', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    await openLetter(user);
    await showLetter(user);
    expect((await screen.findAllByText('Please fill this in')).length).toBeGreaterThan(5);
    expect(screen.getByText('Enter a phone number with at least 10 digits')).toBeInTheDocument();
    expect(screen.getByText('Enter the invoice date')).toBeInTheDocument();
    expect(screen.getByLabelText(/^business name/i)).toHaveFocus();
  });

  it('firm letter: preview, Copy text, Download PDF, then the early-access card', async () => {
    vi.stubEnv('VITE_WAITLIST_URL', 'https://forms.gle/early');
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    await openLetter(user);
    await user.click(screen.getByRole('radio', { name: /Firm notice/ }));
    await fillDetails(user);
    await showLetter(user);

    const previewHeading = await screen.findByRole('heading', { name: 'Letter preview' });
    expect(previewHeading).toHaveFocus();
    const preview = within(previewHeading.closest('section') as HTMLElement);
    expect(preview.getByText('Shakti Fabricators', { selector: 'header p' })).toBeInTheDocument();
    expect(preview.getByText('Udyam Registration No.: UDYAM-MH-26-0123456')).toBeInTheDocument();
    expect(
      preview.getByRole('rowheader', { name: 'Interest accrued (MSMED Act, 2006, Section 16)' }),
    ).toBeInTheDocument();
    expect(preview.getByRole('cell', { name: '₹8,284' })).toBeInTheDocument();
    expect(preview.getByText(/It is not legal or tax advice\./)).toBeInTheDocument();

    // No early-access card before a download.
    expect(screen.queryByRole('link', { name: /Join the early list/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy text' }));
    expect(await screen.findByText(/Letter copied/)).toBeInTheDocument();
    const copied = await navigator.clipboard.readText();
    expect(copied).toContain(
      'Subject: Overdue payment under the MSMED Act, 2006 — invoice INV-104',
    );
    expect(copied).toContain('Interest accrued (MSMED Act, 2006, Section 16): ₹8,284');
    expect(copied).toContain('not legal or tax advice');

    await user.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(await screen.findByText('Your PDF is downloaded.')).toBeInTheDocument();
    expect(renderLetterPdf).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    const join = screen.getByRole('link', { name: /Join the early list/ });
    expect(join).toHaveAttribute('href', 'https://forms.gle/early');
    expect(join).toHaveAttribute('target', '_blank');
    expect(
      screen.getByText('Want us to send follow-ups for you automatically?'),
    ).toBeInTheDocument();
  });

  it('without VITE_WAITLIST_URL there is no early-access card', async () => {
    vi.stubEnv('VITE_WAITLIST_URL', '');
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    await openLetter(user);
    await fillDetails(user);
    await showLetter(user);
    await user.click(await screen.findByRole('button', { name: 'Download PDF' }));
    await screen.findByText('Your PDF is downloaded.');
    expect(screen.queryByRole('link', { name: /Join the early list/ })).not.toBeInTheDocument();
  });

  it('a PDF failure is explained, and the user can still copy', async () => {
    renderLetterPdf.mockRejectedValueOnce(new Error('font failed'));
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    await openLetter(user);
    await fillDetails(user);
    await showLetter(user);
    await user.click(await screen.findByRole('button', { name: 'Download PDF' }));
    expect(await screen.findByText(/couldn't create the PDF/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy text' })).toBeEnabled();
  });

  it('Back returns to the result and keeps the details for this session', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    await openLetter(user);
    await user.type(screen.getByLabelText(/buyer's company name/i), 'Big Motors Ltd');
    await user.click(screen.getByRole('button', { name: /Back to the result/ }));
    expect(screen.getByRole('heading', { name: 'What your buyer owes' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create a polite reminder letter' })).toHaveFocus();
    await openLetter(user);
    expect(screen.getByLabelText(/buyer's company name/i)).toHaveValue('Big Motors Ltd');
  });
});

describe('remember my business details', () => {
  it('is off by default and stores nothing', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    await openLetter(user);
    expect(
      screen.getByRole('checkbox', { name: /Remember my business details/ }),
    ).not.toBeChecked();
    await fillDetails(user);
    await showLetter(user);
    await screen.findByRole('heading', { name: 'Letter preview' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('when ticked, saves only the business details and fills them in next time', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    await openLetter(user);
    await fillDetails(user);
    await user.click(screen.getByRole('checkbox', { name: /Remember my business details/ }));
    await showLetter(user);
    await screen.findByRole('heading', { name: 'Letter preview' });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
    expect(stored.supplierName).toBe('Shakti Fabricators');
    expect(stored.udyamNumber).toBe('UDYAM-MH-26-0123456');
    expect(stored).not.toHaveProperty('buyerName');

    // A new visit on the same device.
    document.body.innerHTML = '';
    await calculateTC1(user);
    await openLetter(user);
    expect(screen.getByLabelText(/^business name/i)).toHaveValue('Shakti Fabricators');
    expect(screen.getByLabelText(/buyer's company name/i)).toHaveValue('');
    const remember = screen.getByRole('checkbox', { name: /Remember my business details/ });
    expect(remember).toBeChecked();

    // Unticking removes them.
    await user.click(remember);
    await user.type(screen.getByLabelText(/buyer's company name/i), 'B');
    await user.type(screen.getByLabelText(/contact person/i), 'C');
    await user.type(screen.getByLabelText(/buyer's address/i), 'D');
    await user.type(screen.getByLabelText(/invoice number/i), 'E');
    fireEvent.change(screen.getByLabelText(/invoice date/i), { target: { value: '2027-01-10' } });
    await showLetter(user);
    await screen.findByRole('heading', { name: 'Letter preview' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('still works when the browser blocks storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user);
    await openLetter(user);
    await fillDetails(user);
    await user.click(screen.getByRole('checkbox', { name: /Remember my business details/ }));
    await showLetter(user);
    expect(await screen.findByRole('heading', { name: 'Letter preview' })).toBeInTheDocument();
  });
});

describe('who gets which letter', () => {
  it('TC5 Medium: friendly letter only, no legal citations, Udyam optional', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user, { category: /^medium$/i });
    await openLetter(user);
    expect(screen.queryByRole('group', { name: /how firm/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/doesn't mention the law, because the 45-day rule/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/udyam registration number/i)).toBeInTheDocument();
    await fillDetails(user, { udyam: false });
    await showLetter(user);
    const preview = (await screen.findByRole('heading', { name: 'Letter preview' })).closest(
      'section',
    ) as HTMLElement;
    const body = within(preview).getByRole('article');
    const letterText = (body.textContent ?? '').replace(
      body.querySelector('footer')?.textContent ?? '',
      '',
    );
    expect(letterText).toContain('Friendly reminder');
    expect(letterText).not.toMatch(/Section|MSMED|interest/i);
  });

  it('Not on Udyam: no Udyam field and a general letter', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user, { category: /^not registered$/i });
    await openLetter(user);
    expect(screen.queryByLabelText(/udyam registration number/i)).not.toBeInTheDocument();
    expect(screen.getByText(/these protections need a Udyam registration/)).toBeInTheDocument();
  });

  it('TC18 not yet due: no letter button, a note instead', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1(user, { asOf: '2027-02-01' });
    expect(
      screen.queryByRole('button', { name: 'Create a polite reminder letter' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'You can create a reminder letter once the payment is late, after 24 Feb 2027.',
      ),
    ).toBeInTheDocument();
  });
});

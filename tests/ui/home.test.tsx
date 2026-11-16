// Home page: form (PRD §1) + result (PRD §2), driven like a user would.
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../src/pages/Home';

const SITE = 'https://bakaya.pages.dev';

function setup(asOfDate = '2027-03-31') {
  const user = userEvent.setup({ delay: null });
  render(<Home asOfDate={asOfDate} siteUrl={SITE} />);
  return user;
}

const group = (name: RegExp) => screen.getByRole('group', { name });

type Fill = {
  category?: RegExp;
  trader?: 'Yes' | 'No';
  registered?: 'Yes' | 'No' | 'Not sure';
  amount?: string;
  delivery?: string;
  objectionResolved?: string;
  agreementDays?: string | null; // null = "No"
  buyer?: RegExp;
};

async function fill(user: ReturnType<typeof userEvent.setup>, f: Fill) {
  await user.click(screen.getByRole('radio', { name: f.category ?? /^micro$/i }));
  if (f.category === undefined || /micro|small/.test(String(f.category))) {
    await user.click(
      within(group(/only trade goods/i)).getByRole('radio', { name: f.trader ?? 'No' }),
    );
  }
  await user.click(
    within(group(/registration done before/i)).getByRole('radio', { name: f.registered ?? 'Yes' }),
  );
  if (f.amount !== undefined) await user.type(screen.getByLabelText(/invoice amount/i), f.amount);
  if (f.delivery !== undefined) {
    fireEvent.change(screen.getByLabelText(/date you delivered/i), {
      target: { value: f.delivery },
    });
  }
  const objection = within(group(/object in writing/i));
  if (f.objectionResolved) {
    await user.click(objection.getByRole('radio', { name: 'Yes' }));
    fireEvent.change(screen.getByLabelText(/objection was sorted out/i), {
      target: { value: f.objectionResolved },
    });
  } else {
    await user.click(objection.getByRole('radio', { name: 'No' }));
  }
  const agreement = within(group(/written agreement/i));
  if (f.agreementDays === null || f.agreementDays === undefined) {
    await user.click(agreement.getByRole('radio', { name: 'No' }));
  } else {
    await user.click(agreement.getByRole('radio', { name: 'Yes' }));
    if (f.agreementDays !== '')
      await user.type(screen.getByLabelText(/how many days/i), f.agreementDays);
  }
  if (f.buyer)
    await user.click(
      within(group(/kind of business is the buyer/i)).getByRole('radio', { name: f.buyer }),
    );
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Check what they owe' }));

const TC1: Fill = { amount: '500000', delivery: '2027-01-10', agreementDays: '45' };

describe('form', () => {
  it('shows the PRD hero and every question, in order', () => {
    setup();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Owed money for more than 45 days? The law is on your side.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Free\. Nothing leaves your phone\./)).toBeInTheDocument();
    const labels = [
      /What is your business type on Udyam\?/,
      /Was your Udyam registration done before this supply\?/,
      /Invoice amount \(₹\)/,
      /Date you delivered the goods or finished the service/,
      /Did the buyer object in writing within 15 days\?/,
      /Is there a written agreement on payment days\?/,
      /What kind of business is the buyer\?/,
    ];
    for (const l of labels) expect(screen.getAllByText(l).length).toBeGreaterThan(0);
    expect(screen.getByText("It's on your Udyam certificate.")).toBeInTheDocument();
    // Buyer type defaults to "Not sure".
    expect(
      within(group(/kind of business is the buyer/i)).getByRole('radio', { name: 'Not sure' }),
    ).toBeChecked();
  });

  it('asks the trader question only for Micro or Small', async () => {
    const user = setup();
    expect(screen.queryByRole('group', { name: /only trade goods/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Small' }));
    expect(group(/only trade goods/i)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Medium' }));
    expect(screen.queryByRole('group', { name: /only trade goods/i })).not.toBeInTheDocument();
  });

  it('shows the follow-up fields only when the answer is Yes', async () => {
    const user = setup();
    expect(screen.queryByLabelText(/objection was sorted out/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/how many days/i)).not.toBeInTheDocument();
    await user.click(within(group(/object in writing/i)).getByRole('radio', { name: 'Yes' }));
    await user.click(within(group(/written agreement/i)).getByRole('radio', { name: 'Yes' }));
    expect(screen.getByLabelText(/objection was sorted out/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how many days/i)).toBeInTheDocument();
  });

  it('formats the amount with Indian commas as you type', async () => {
    const user = setup();
    const amount = screen.getByLabelText(/invoice amount/i);
    await user.type(amount, '12500000');
    expect(amount).toHaveValue('1,25,00,000');
  });

  it('an empty submit explains every missing answer and focuses the first one', async () => {
    const user = setup();
    await submit(user);
    expect(await screen.findByText('Choose your business type')).toBeInTheDocument();
    expect(screen.getAllByText('Choose an answer')).toHaveLength(3);
    expect(screen.getByText('Enter the invoice amount')).toBeInTheDocument();
    expect(screen.getByText('Enter the delivery date')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Micro' })).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'What your buyer owes' })).not.toBeInTheDocument();
  });

  it('links errors to inputs for screen readers', async () => {
    const user = setup();
    await submit(user);
    const amount = await screen.findByLabelText(/invoice amount/i);
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(amount).toHaveAccessibleDescription(/Enter the invoice amount/);
  });

  it('TC14: amount 0 -> "Enter an amount above ₹0"', async () => {
    const user = setup();
    await fill(user, { ...TC1, amount: '0' });
    await submit(user);
    expect(await screen.findByText('Enter an amount above ₹0')).toBeInTheDocument();
  });

  it('TC15: above ₹100 crore -> "That\'s above what this tool supports"', async () => {
    const user = setup();
    await fill(user, { ...TC1, amount: '1000000001' });
    await submit(user);
    expect(await screen.findByText("That's above what this tool supports")).toBeInTheDocument();
  });

  it('TC16: future delivery date -> "Delivery date can\'t be in the future"', async () => {
    const user = setup();
    await fill(user, { ...TC1, delivery: '2027-04-01' });
    await submit(user);
    expect(await screen.findByText("Delivery date can't be in the future")).toBeInTheDocument();
  });

  it.each(['', '0'])(
    'TC17: agreement "Yes" with days "%s" -> "Enter the agreed number of days"',
    async (days) => {
      const user = setup();
      await fill(user, { ...TC1, agreementDays: days });
      await submit(user);
      expect(await screen.findByText('Enter the agreed number of days')).toBeInTheDocument();
    },
  );
});

describe('result', () => {
  it('TC1 (31 March): numbers, tax card first, no countdown, disclaimer, WhatsApp text', async () => {
    const user = setup('2027-03-31');
    await fill(user, TC1);
    await submit(user);

    const heading = await screen.findByRole('heading', { name: 'What your buyer owes' });
    expect(heading).toHaveFocus();
    const result = within(heading.closest('section') as HTMLElement);

    const interestCard = result
      .getByText('Your buyer is 35 days late.')
      .closest('section') as HTMLElement;
    expect(interestCard).toHaveTextContent('They now owe you ₹8,284 in interest.');

    const taxCard = result.getByText(/more tax this year/).closest('section') as HTMLElement;
    expect(taxCard).toHaveTextContent(
      "If they don't pay by 31 Mar 2027, they pay about ₹1,25,840 to ₹1,74,720 more tax this year.",
    );
    expect(taxCard).toHaveTextContent('Based on a tax rate of 25.168% to 34.944%');
    expect(result.queryByText(/left to 31 March/)).not.toBeInTheDocument();

    // Seasonality: in March the tax argument leads.
    expect(
      taxCard.compareDocumentPosition(interestCard) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const deadline = within(result.getByRole('region', { name: 'The deadline' }));
    expect(deadline.getByText('24 Feb 2027')).toBeInTheDocument();
    expect(deadline.getByText('25 Feb 2027')).toBeInTheDocument();
    expect(deadline.getByText('45 days from 10 Jan 2027')).toBeInTheDocument();
    expect(
      deadline.getByText('17.25% a year, which is 3 × RBI bank rate of 5.75%'),
    ).toBeInTheDocument();

    const why = within(result.getByRole('region', { name: 'Why this is true' }));
    expect(why.getByText('MSMED Act, 2006, Section 15')).toBeInTheDocument();
    expect(why.getByText('MSMED Act, 2006, Section 16')).toBeInTheDocument();
    expect(why.getByText('Income-tax Act, 2025, Section 37(2)(g)')).toBeInTheDocument();

    expect(result.getByText(/It is not legal or tax advice\./)).toBeInTheDocument();

    const share = result.getByRole('link', { name: /Share on WhatsApp/ });
    const href = share.getAttribute('href') ?? '';
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(href.slice('https://wa.me/?text='.length))).toBe(
      'Hi, a gentle reminder about invoice of ₹5,00,000 delivered on 10 Jan 2027. ' +
        'As per the MSMED Act, payment was due by 24 Feb 2027. ' +
        'Interest under Section 16 is now ₹8,284. ' +
        "If unpaid by 31 Mar 2027, it also can't be claimed as an expense this tax year. " +
        'Please arrange payment. Thank you.\n' +
        `(Calculated on ${SITE})`,
    );
    expect(share).toHaveAttribute('target', '_blank');
    expect(share).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('TC8 (October): interest card leads, and the rate change is explained', async () => {
    const user = setup('2026-10-31');
    await fill(user, { amount: '1000000', delivery: '2026-08-01', agreementDays: null });
    await submit(user);
    await screen.findByRole('heading', { name: 'What your buyer owes' });

    const interestCard = screen
      .getByText('Your buyer is 76 days late.')
      .closest('section') as HTMLElement;
    expect(interestCard).toHaveTextContent('₹35,259');
    const taxCard = screen.getByText(/more tax this year/).closest('section') as HTMLElement;
    expect(
      interestCard.compareDocumentPosition(taxCard) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(taxCard).toHaveTextContent('151 days left to 31 March.');
    expect(screen.getByText(/The RBI bank rate changed during this time/)).toBeInTheDocument();
  });

  it('TC4: shows the 45-day cap warning', async () => {
    const user = setup('2027-03-31');
    await fill(user, { amount: '100000', delivery: '2027-01-01', agreementDays: '60' });
    await submit(user);
    expect(
      await screen.findByText('The law caps agreed payment periods at 45 days, so we used 45.'),
    ).toBeInTheDocument();
    expect(screen.getByText('₹2,088')).toBeInTheDocument();
  });

  it('TC6: counts from the day the objection was sorted out', async () => {
    const user = setup('2027-03-31');
    await fill(user, {
      amount: '150000',
      delivery: '2027-01-05',
      objectionResolved: '2027-01-20',
      agreementDays: '30',
    });
    await submit(user);
    expect(await screen.findByText('30 days from 20 Jan 2027')).toBeInTheDocument();
    expect(
      screen.getByText('We counted from the day the objection was sorted out.'),
    ).toBeInTheDocument();
    expect(screen.getByText('₹2,845')).toBeInTheDocument();
  });

  it('TC12/TC13: trader and registration warnings are shown', async () => {
    const user = setup('2027-03-31');
    await fill(user, { ...TC1, category: /^small$/i, trader: 'Yes', registered: 'No' });
    await submit(user);
    expect(await screen.findByText(/Traders are generally not covered/)).toBeInTheDocument();
    expect(
      screen.getByText(/registration should exist before the supply date/),
    ).toBeInTheDocument();
  });

  it('TC18: not due yet', async () => {
    const user = setup('2027-02-01');
    await fill(user, { amount: '100000', delivery: '2027-01-10', agreementDays: '45' });
    await submit(user);
    expect(
      await screen.findByText('Not due yet. Your buyer has 23 days left.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Payment due by')).toBeInTheDocument();
    expect(screen.queryByText('Days late')).not.toBeInTheDocument();
    expect(screen.getByText('58 days left to 31 March.')).toBeInTheDocument();
  });

  it('TC3: deadline after 31 March', async () => {
    const user = setup('2027-03-31');
    await fill(user, { amount: '300000', delivery: '2027-03-10', agreementDays: '45' });
    await submit(user);
    expect(
      await screen.findByText(/The deadline falls after 31 March, so there's no tax hit this year/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent ===
          'If they miss the 24 Apr 2027 deadline, they could pay about ₹75,504 to ₹1,04,832 more tax.',
      ),
    ).toBeInTheDocument();
  });

  it('TC10: deferred after 31 March', async () => {
    const user = setup('2026-04-15');
    await fill(user, { amount: '400000', delivery: '2026-02-01', agreementDays: '30' });
    await submit(user);
    expect(await screen.findByText(/couldn't claim this in tax year 2025-26/)).toBeInTheDocument();
    expect(screen.getByText('Income-tax Act, 1961, Section 43B(h)')).toBeInTheDocument();
  });

  it('a known buyer type shows a single tax figure', async () => {
    const user = setup('2027-03-31');
    await fill(user, { ...TC1, buyer: /^company$/i });
    await submit(user);
    expect(await screen.findByText('Based on a tax rate of 25.168%.')).toBeInTheDocument();
    expect(screen.getByText('₹1,25,840')).toBeInTheDocument();
  });

  it('TC5: Medium is not covered, no legal citations, plain WhatsApp reminder', async () => {
    const user = setup('2027-03-31');
    await fill(user, { ...TC1, category: /^medium$/i });
    await submit(user);
    expect(
      await screen.findByText('The 45-day rule protects only micro and small businesses.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Why this is true' })).not.toBeInTheDocument();
    expect(screen.getByText(/It is not legal or tax advice\./)).toBeInTheDocument();
    const href = screen.getByRole('link', { name: /Share on WhatsApp/ }).getAttribute('href') ?? '';
    const text = decodeURIComponent(href.split('text=')[1] ?? '');
    expect(text).not.toMatch(/MSMED|Section|Interest/);
    expect(text).toContain('Please arrange payment.');
  });

  it('"Calculate another invoice" clears the invoice but keeps your business answers', async () => {
    const user = setup('2027-03-31');
    await fill(user, TC1);
    await submit(user);
    await user.click(await screen.findByRole('button', { name: 'Calculate another invoice' }));
    expect(screen.queryByRole('heading', { name: 'What your buyer owes' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Micro' })).toBeChecked();
    const amount = screen.getByLabelText(/invoice amount/i);
    expect(amount).toHaveValue('');
    expect(amount).toHaveFocus();
  });
});

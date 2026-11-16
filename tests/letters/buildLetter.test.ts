import { legalConfig } from '../../src/data';
import { calculate } from '../../src/domain/calculate';
import type { CalculationInput } from '../../src/domain/types';
import { buildLetter, letterFileName, TEMPLATES } from '../../src/letters/buildLetter';
import { TONES, type Tone } from '../../src/letters/detailsSchema';
import { letterMode, udyamFieldFor } from '../../src/letters/mode';
import { DETAILS, TC1_INPUT } from './fixtures';

function letterFor(
  tone: Tone,
  input: CalculationInput = TC1_INPUT,
  asOf = '2027-03-31',
  details = DETAILS,
) {
  return buildLetter({
    tone,
    details,
    input,
    result: calculate(input, asOf),
    asOfDate: asOf,
    locale: 'en',
  });
}

/** The letter body without the disclaimer (which names the Acts on purpose). */
const bodyText = (l: ReturnType<typeof letterFor>) =>
  l.plainText.slice(0, l.plainText.lastIndexOf('\n\n—\n'));

describe('letter mode', () => {
  const r = (input: CalculationInput, asOf = '2027-03-31') =>
    letterMode(input, calculate(input, asOf));
  it('micro/small overdue -> legal; not yet due -> none; medium and unregistered -> general', () => {
    expect(r(TC1_INPUT)).toBe('legal');
    expect(r(TC1_INPUT, '2027-02-01')).toBe('not_yet_due');
    expect(r({ ...TC1_INPUT, category: 'medium' })).toBe('general');
    expect(r({ ...TC1_INPUT, category: 'not_registered' })).toBe('general');
    expect(r({ ...TC1_INPUT, category: 'medium' }, '2027-02-01')).toBe('general');
  });
  it('Udyam number field', () => {
    expect(udyamFieldFor('micro')).toBe('required');
    expect(udyamFieldFor('small')).toBe('required');
    expect(udyamFieldFor('medium')).toBe('optional');
    expect(udyamFieldFor('not_registered')).toBe('hidden');
  });
});

describe('every tone renders completely', () => {
  it.each(TONES)('%s: no leftover placeholders, letterhead first, disclaimer last', (tone) => {
    const l = letterFor(tone);
    expect(l.plainText).not.toMatch(/\{\{|\}\}/);
    expect(l.letterhead[0]).toBe('Shakti Fabricators');
    expect(l.letterhead).toContain('Plot 12, MIDC Bhosari');
    expect(l.plainText.endsWith(legalConfig.disclaimer)).toBe(true);
    expect(l.disclaimer).toBe(legalConfig.disclaimer);
  });
});

describe('friendly letter (TC1)', () => {
  const text = bodyText(letterFor('friendly'));
  it.each([
    'Udyam Registration No.: UDYAM-MH-26-0123456 | GSTIN: 27ABCDE1234F1Z5',
    'Date: 31 Mar 2027',
    'Subject: Friendly reminder — payment for invoice INV-104 dated 10 Jan 2027',
    'Dear Mr. Sharma,',
    '- Amount: ₹5,00,000',
    '- Goods delivered / services completed on: 10 Jan 2027',
    '- Payment due as per MSMED Act, 2006, Section 15: 24 Feb 2027',
    'We are registered as a micro enterprise under the MSMED Act, 2006. As of 31 Mar 2027, the payment is 35 days past the due date.',
    '1. Under MSMED Act, 2006, Section 16, interest of ₹8,284 has accrued so far',
    "2. Under Section 37(2)(g) of the Income-tax Act, 2025, an amount payable to a micro or small enterprise that remains unpaid past its due date on 31 March can't be claimed",
    '+91 98200 12345 | accounts@shakti.example',
  ])('contains: %s', (snippet) => expect(text).toContain(snippet));
  it('has no objection line without an objection', () =>
    expect(text).not.toContain('Objection resolved'));
});

describe('firm letter (TC1)', () => {
  const l = letterFor('firm');
  it('puts the invoice facts in a table', () => {
    const table = l.body.find((b) => b.type === 'table');
    expect(table).toEqual({
      type: 'table',
      rows: [
        ['Invoice', 'INV-104 dated 10 Jan 2027'],
        ['Amount', '₹5,00,000'],
        ['Accepted on', '10 Jan 2027'],
        ['Due date (MSMED Act, 2006, Section 15)', '24 Feb 2027'],
        ['Days overdue as of 31 Mar 2027', '35'],
        ['Interest accrued (MSMED Act, 2006, Section 16)', '₹8,284'],
      ],
    });
  });
  it('mentions the tax year ending 31 March', () =>
    expect(l.plainText).toContain(
      "under Section 37(2)(g) of the Income-tax Act, 2025, this expense can't be claimed in your tax year ending 31 Mar 2027",
    ));
});

describe('final letter (TC1)', () => {
  const text = bodyText(letterFor('final'));
  it('names the complaint route from legal-config', () => {
    expect(text).toContain(`through the ${legalConfig.complaintPortal.name}`);
    expect(text).toContain('due on 24 Feb 2027 and now 35 days overdue');
    expect(text).toContain(
      'Interest accrued under MSMED Act, 2006, Section 16 as of 31 Mar 2027 is ₹8,284.',
    );
  });
});

describe('content rules', () => {
  it('TC5 Medium: a friendly letter with no legal citations, whatever tone was asked', () => {
    const medium = { ...TC1_INPUT, category: 'medium' as const };
    for (const tone of TONES) {
      const l = letterFor(tone, medium, '2027-03-31', { ...DETAILS, udyamNumber: '' });
      const text = bodyText(l);
      expect(text).toContain('Subject: Friendly reminder');
      expect(text).not.toMatch(/Section|MSMED|Act|interest|registered|Udyam|due as per/i);
      expect(l.letterhead).toContain('GSTIN: 27ABCDE1234F1Z5');
    }
  });

  it('Not on Udyam: no claim of registration, and no empty registration line', () => {
    const l = letterFor('firm', { ...TC1_INPUT, category: 'not_registered' }, '2027-03-31', {
      ...DETAILS,
      udyamNumber: '',
      gstin: '',
    });
    expect(bodyText(l)).not.toMatch(/Udyam|registered|Section/i);
    expect(l.letterhead).toEqual(['Shakti Fabricators', 'Plot 12, MIDC Bhosari', 'Pune 411026']);
  });

  it('TC3: deadline after 31 March -> no tax paragraph (friendly and firm)', () => {
    // Delivered 10 Mar 2027 with 45 days: due 24 Apr 2027; check once it is overdue.
    const input = { ...TC1_INPUT, deliveryDate: '2027-03-10' };
    for (const tone of ['friendly', 'firm'] as const) {
      const text = bodyText(letterFor(tone, input, '2027-05-31'));
      expect(text).toContain('days');
      expect(text).not.toMatch(/Income-tax|31 March|tax year/);
    }
  });

  it('TC10: deferred (31 March has passed) keeps the tax paragraph, with the 1961 Act', () => {
    const input = {
      ...TC1_INPUT,
      amountPaise: 40_000_000,
      deliveryDate: '2026-02-01',
      agreement: { hasAgreement: true as const, days: 30 },
    };
    const text = bodyText(letterFor('friendly', input, '2026-04-15'));
    expect(text).toContain('Under Section 43B(h) of the Income-tax Act, 1961');
    expect(text).toContain('interest of ₹7,810');
  });

  it('TC6: objection shows both the delivery date and the date it was resolved', () => {
    const input: CalculationInput = {
      ...TC1_INPUT,
      amountPaise: 15_000_000,
      deliveryDate: '2027-01-05',
      objection: { raised: true, resolvedDate: '2027-01-20' },
      agreement: { hasAgreement: true, days: 30 },
    };
    const text = bodyText(letterFor('friendly', input));
    expect(text).toContain('- Goods delivered / services completed on: 5 Jan 2027');
    expect(text).toContain('- Objection resolved on: 20 Jan 2027');
    expect(text).toContain('interest of ₹2,845');
    const bullets = letterFor('friendly', input).body.find((b) => b.type === 'bullets');
    expect(bullets?.type === 'bullets' && bullets.items).toHaveLength(5);
  });

  it('no email: the sign-off shows just the phone', () => {
    const text = letterFor('friendly', TC1_INPUT, '2027-03-31', {
      ...DETAILS,
      supplierEmail: '',
    }).plainText;
    expect(text).toContain('Shakti Fabricators\n+91 98200 12345\n');
    expect(text).not.toContain(' | \n');
  });

  it('never says the deduction is lost', () => {
    for (const tone of TONES) expect(letterFor(tone).plainText).not.toMatch(/\blos[et]\b/i);
  });

  it('refuses to write a "late payment" letter before the due date', () => {
    expect(() => letterFor('friendly', TC1_INPUT, '2027-02-01')).toThrow();
  });

  it('every template uses only variables we provide', () => {
    for (const tone of TONES) {
      const names = [...TEMPLATES.en[tone].matchAll(/\{\{[#/]?(\w+)\}\}/g)].map((m) => m[1]);
      expect(names.length).toBeGreaterThan(5);
    }
  });
});

describe('file name', () => {
  it('is safe for any invoice number', () => {
    expect(letterFileName('INV-104', 'en')).toBe('reminder-letter-INV-104.pdf');
    expect(letterFileName('INV/104, INV/105', 'en')).toBe('reminder-letter-INV-104-INV-105.pdf');
    expect(letterFileName('///', 'en')).toBe('reminder-letter.pdf');
  });
});

describe('review fixes', () => {
  it('"1 day", not "1 days", when the payment is one day late (friendly and final)', () => {
    // TC1 is due 24 Feb 2027, so 25 Feb is one day late.
    expect(bodyText(letterFor('friendly', TC1_INPUT, '2027-02-25'))).toContain(
      'the payment is 1 day past the due date.',
    );
    expect(bodyText(letterFor('final', TC1_INPUT, '2027-02-25'))).toContain(
      'due on 24 Feb 2027 and now 1 day overdue.',
    );
    expect(bodyText(letterFor('final'))).toContain('and now 35 days overdue.');
  });

  it('the interest multiplier comes from legal-config, not the template text', () => {
    const m = legalConfig.paymentRules.interestMultiplier;
    for (const tone of ['friendly', 'firm'] as const) {
      expect(TEMPLATES.en[tone]).not.toMatch(/three times/);
      expect(bodyText(letterFor(tone))).toContain(`at ${m} times the RBI bank rate`);
    }
  });
});

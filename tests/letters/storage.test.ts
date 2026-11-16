import { makeLetterSchema } from '../../src/letters/detailsSchema';
import {
  STORAGE_KEY,
  clearBusinessDetails,
  loadBusinessDetails,
  saveBusinessDetails,
} from '../../src/letters/storage';
import { waitlistUrl } from '../../src/letters/waitlist';
import { DETAILS } from './fixtures';

describe('remember my business details', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('saves only the business details, and loads them back', () => {
    expect(saveBusinessDetails(DETAILS)).toBe(true);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(Object.keys(stored).sort()).toEqual(
      [
        'gstin',
        'supplierAddress',
        'supplierEmail',
        'supplierName',
        'supplierPhone',
        'supplierSignatory',
        'udyamNumber',
      ].sort(),
    );
    expect(stored).not.toHaveProperty('buyerName');
    expect(stored).not.toHaveProperty('invoiceNumber');
    expect(loadBusinessDetails()).toMatchObject({ supplierName: 'Shakti Fabricators' });
  });

  it('clears them', () => {
    saveBusinessDetails(DETAILS);
    clearBusinessDetails();
    expect(loadBusinessDetails()).toBeNull();
  });

  it('survives broken or odd stored data', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadBusinessDetails()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ supplierName: 42, gstin: 'X' }));
    expect(loadBusinessDetails()).toMatchObject({ supplierName: '', gstin: 'X' });
    localStorage.setItem(STORAGE_KEY, '"a string"');
    expect(loadBusinessDetails()).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(loadBusinessDetails()).toBeNull();
    expect(saveBusinessDetails(DETAILS)).toBe(false);
    expect(() => clearBusinessDetails()).not.toThrow();
  });

  it('never throws when localStorage itself is inaccessible', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(loadBusinessDetails()).toBeNull();
    expect(saveBusinessDetails(DETAILS)).toBe(false);
    expect(() => clearBusinessDetails()).not.toThrow();
  });
});

describe('letter details schema', () => {
  const values = { ...DETAILS, udyamNumber: 'udyam-mh-26-0123456', gstin: ' 27abcde1234f1z5 ' };
  const issues = (schema: ReturnType<typeof makeLetterSchema>, v: Record<string, unknown>) => {
    const r = schema.safeParse(v);
    return r.success ? [] : r.error.issues.map((i) => [i.path.join('.'), i.message]);
  };

  it('normalises Udyam and GSTIN to capitals, and tidies addresses', () => {
    const r = makeLetterSchema('2027-03-31', 'required').parse({
      ...values,
      supplierAddress: '  Plot 12 \n\n\n  Pune  ',
    });
    expect(r.udyamNumber).toBe('UDYAM-MH-26-0123456');
    expect(r.gstin).toBe('27ABCDE1234F1Z5');
    expect(r.supplierAddress).toBe('Plot 12\nPune');
  });

  it('explains each problem with an i18n key', () => {
    const s = makeLetterSchema('2027-03-31', 'required');
    expect(
      issues(s, {
        ...values,
        supplierName: '  ',
        udyamNumber: 'UDYAM-123',
        gstin: '123',
        supplierPhone: '12345',
        supplierEmail: 'nope',
        invoiceDate: '2027-04-01',
      }),
    ).toEqual([
      ['supplierName', 'letterErrors.required'],
      ['udyamNumber', 'letterErrors.udyamFormat'],
      ['gstin', 'letterErrors.gstinFormat'],
      ['supplierPhone', 'letterErrors.phoneFormat'],
      ['supplierEmail', 'letterErrors.emailFormat'],
      ['invoiceDate', 'letterErrors.invoiceDateFuture'],
    ]);
    expect(issues(s, { ...values, udyamNumber: '', invoiceDate: '' })).toEqual([
      ['udyamNumber', 'letterErrors.required'],
      ['invoiceDate', 'letterErrors.invoiceDateRequired'],
    ]);
    expect(issues(s, { ...values, supplierName: 'x'.repeat(121) })).toEqual([
      ['supplierName', 'letterErrors.tooLong'],
    ]);
  });

  it('Udyam is optional for Medium and dropped when not registered', () => {
    expect(
      issues(makeLetterSchema('2027-03-31', 'optional'), { ...values, udyamNumber: '' }),
    ).toEqual([]);
    expect(makeLetterSchema('2027-03-31', 'hidden').parse(values).udyamNumber).toBe('');
  });
});

describe('waitlist URL', () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    ['', null],
    ['   ', null],
    ['not a url', null],
    ['javascript:alert(1)', null],
    ['http://forms.gle/abc', null],
    ['https://forms.gle/abc', 'https://forms.gle/abc'],
  ])('%j -> %j', (value, expected) => {
    vi.stubEnv('VITE_WAITLIST_URL', value);
    expect(waitlistUrl()).toBe(expected);
  });
});

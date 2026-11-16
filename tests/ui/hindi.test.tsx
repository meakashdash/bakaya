// The Hindi site at /hi: Hindi copy, Hindi links, the language switch, and a Hindi result.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { setLocale } from '../../src/i18n';

vi.mock('../../src/letters/pdf', () => ({
  renderLetterPdf: vi.fn(async () => new Blob(['%PDF-1.3'], { type: 'application/pdf' })),
}));

vi.setConfig({ testTimeout: 30_000 });

const goTo = (path: string) => window.history.replaceState(null, '', path);
afterEach(() => {
  goTo('/');
  setLocale('en');
});

const group = (name: RegExp) => screen.getByRole('group', { name });

async function calculateTC1InHindi(user: ReturnType<typeof userEvent.setup>) {
  goTo('/hi');
  render(<App />);
  await user.click(screen.getByRole('radio', { name: /सूक्ष्म/ }));
  await user.click(within(group(/सिर्फ़ सामान खरीदकर/)).getByRole('radio', { name: 'नहीं' }));
  await user.click(within(group(/सप्लाई से पहले/)).getByRole('radio', { name: 'हाँ' }));
  await user.type(screen.getByLabelText(/इनवॉइस की रकम/), '500000');
  fireEvent.change(screen.getByLabelText(/माल पहुँचाया/), { target: { value: '2025-01-10' } });
  await user.click(within(group(/लिखकर आपत्ति/)).getByRole('radio', { name: 'नहीं' }));
  await user.click(within(group(/लिखित समझौता/)).getByRole('radio', { name: 'हाँ' }));
  await user.type(screen.getByLabelText(/कितने दिन/), '45');
  await user.click(screen.getByRole('button', { name: 'देखें उन पर कितना बकाया है' }));
  await screen.findByRole('heading', { name: 'आपके खरीदार पर कितना बकाया है' });
}

describe('/hi', () => {
  it('shows the calculator in Hindi, with lang="hi-IN"', async () => {
    goTo('/hi');
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /कानून आपके साथ है/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'देखें उन पर कितना बकाया है' })).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.lang).toBe('hi-IN'));
    expect(screen.getByText(/^बीटा:/)).toBeInTheDocument();
  });

  it('keeps links inside the Hindi site', () => {
    goTo('/hi');
    render(<App />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'प्राइवेसी' })).toHaveAttribute(
      'href',
      '/hi/privacy',
    );
    expect(within(footer).getByRole('link', { name: 'कैलकुलेटर' })).toHaveAttribute('href', '/hi');
  });

  it('the language switch goes to the same page in the other language and back', async () => {
    const user = userEvent.setup({ delay: null });
    goTo('/privacy');
    render(<App />);
    const toHindi = screen.getByRole('link', { name: /Read this page in Hindi/ });
    expect(toHindi).toHaveAttribute('href', '/hi/privacy');
    expect(toHindi).toHaveAttribute('lang', 'hi');
    expect(toHindi).toHaveTextContent('हिंदी');
    await user.click(toHindi);
    expect(window.location.pathname).toBe('/hi/privacy');
    expect(await screen.findByRole('heading', { level: 1, name: 'प्राइवेसी' })).toBeInTheDocument();
    const toEnglish = screen.getByRole('link', { name: /Read this page in English/ });
    expect(toEnglish).toHaveAttribute('href', '/privacy');
    await user.click(toEnglish);
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument();
  });

  it('calculates TC1 in Hindi: Indian ₹ format, Hindi dates and Hindi legal labels', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1InHindi(user);
    expect(screen.getAllByText('24 फ़रवरी 2025').length).toBeGreaterThan(0);
    expect(screen.getByText('MSMED अधिनियम, 2006, धारा 16')).toBeInTheDocument();
    expect(screen.getByText(/कानूनी या टैक्स सलाह नहीं है/)).toBeInTheDocument();
    // The WhatsApp message is in Hindi and links back to the Hindi calculator.
    const share = screen.getByRole('link', { name: /WhatsApp पर भेजें/ });
    const text = decodeURIComponent(share.getAttribute('href')?.split('text=')[1] ?? '');
    expect(text).toContain('₹5,00,000');
    expect(text).toContain('धारा 16 के तहत');
    expect(text).toMatch(/\/hi पर हिसाब किया गया\)$/);
  });

  it('the letter starts in Hindi and can be switched to English', async () => {
    const user = userEvent.setup({ delay: null });
    await calculateTC1InHindi(user);
    await user.click(screen.getByRole('button', { name: 'विनम्र रिमाइंडर पत्र बनाएँ' }));
    await screen.findByRole(
      'heading',
      { level: 1, name: 'आपका रिमाइंडर पत्र' },
      { timeout: 10_000 },
    );
    const language = group(/पत्र की भाषा/);
    expect(within(language).getByRole('radio', { name: 'हिंदी' })).toBeChecked();

    const type = (label: RegExp, text: string) => user.type(screen.getByLabelText(label), text);
    await type(/^बिज़नेस का नाम/, 'Shakti Fabricators');
    await type(/^बिज़नेस का पता/, 'Plot 12, Pune');
    await type(/उद्यम रजिस्ट्रेशन नंबर/, 'UDYAM-MH-26-0123456');
    await type(/^आपका नाम/, 'Ramesh Patil');
    await type(/फ़ोन नंबर/, '9820012345');
    await type(/खरीदार की कंपनी का नाम/, 'Big Motors Ltd');
    await type(/संपर्क व्यक्ति/, 'Mr. Sharma');
    await type(/खरीदार का पता/, 'Chennai');
    await type(/इनवॉइस नंबर/, 'INV-104');
    fireEvent.change(screen.getByLabelText(/इनवॉइस की तारीख/), { target: { value: '2025-01-10' } });

    await user.click(screen.getByRole('button', { name: 'मेरा पत्र दिखाएँ' }));
    const preview = await screen.findByRole('article');
    expect(within(preview).getByText(/^विषय: विनम्र अनुस्मारक/)).toBeInTheDocument();

    await user.click(within(language).getByRole('radio', { name: 'अंग्रेज़ी (English)' }));
    await user.click(screen.getByRole('button', { name: 'मेरा पत्र दिखाएँ' }));
    await waitFor(() =>
      expect(
        within(screen.getByRole('article')).getByText(/^Subject: Friendly reminder/),
      ).toBeInTheDocument(),
    );
    // The page itself stays in Hindi.
    expect(screen.getByRole('button', { name: 'PDF डाउनलोड करें' })).toBeInTheDocument();
  });
});

// Contact email on Privacy, Terms and footer; beta banner while data is unverified.
import { render, screen, within } from '@testing-library/react';
import App from '../../src/App';
import Privacy from '../../src/pages/Privacy';
import Terms from '../../src/pages/Terms';
import { CONTACT_EMAIL, isBeta } from '../../src/site';

vi.setConfig({ testTimeout: 20_000 });

const mailto = `mailto:${CONTACT_EMAIL}`;

describe('contact email', () => {
  it.each([
    ['Privacy', Privacy],
    ['Terms', Terms],
  ])('%s has a Contact section with a mailto link', (_name, Page) => {
    render(<Page />);
    const heading = screen.getByRole('heading', { level: 2, name: 'Contact' });
    const section = heading.closest('section') ?? document.body;
    expect(within(section).getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute(
      'href',
      mailto,
    );
  });

  it('is in the footer', () => {
    render(<App />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute(
      'href',
      mailto,
    );
  });
});

describe('beta banner', () => {
  it('is on while any rate, source or CA review is unverified', () => {
    expect(isBeta).toBe(true);
    render(<App />);
    expect(screen.getByText(/^Beta: some rates and rules/)).toBeInTheDocument();
  });
});

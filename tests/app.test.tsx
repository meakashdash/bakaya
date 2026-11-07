import { render } from '@testing-library/react';
import App from '../src/App';

// Toolchain check only: proves Vitest + jsdom + Testing Library are wired up.
describe('App shell', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container.querySelector('main')).toBeInTheDocument();
  });
});

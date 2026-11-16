import type { ReactNode } from 'react';

/**
 * Extra words for screen readers only, e.g. "(opens in a new tab)". The space sits outside
 * the hidden span: a space inside it is dropped from the accessible name ("Learn moreabout").
 */
export function SrSuffix({ children }: { children: ReactNode }) {
  return (
    <>
      {' '}
      <span className="sr-only">{children}</span>
    </>
  );
}

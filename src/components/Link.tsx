// An ordinary link that navigates in-app; Ctrl/Cmd/Shift/middle-click still open new tabs.
// Paths are written in English form ('/privacy'); the link adds /hi on Hindi pages.
// Pass `locale` to link to a page in a specific language (the language switch does).
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { getLocale, type Locale } from '../i18n';
import { localePath, navigate } from '../router';

type LinkProps = { to: string; locale?: Locale } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
>;

export function Link({ to, locale, onClick, ...rest }: LinkProps) {
  const href = to.startsWith('/') ? localePath(to, locale ?? getLocale()) : to;
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handle} {...rest} />;
}

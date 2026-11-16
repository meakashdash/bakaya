// An ordinary link that navigates in-app; Ctrl/Cmd/Shift/middle-click still open new tabs.
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from '../router';

type LinkProps = { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}

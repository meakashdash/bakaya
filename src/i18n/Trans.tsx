import { Fragment, type ReactNode } from 'react';
import { t } from './index';

/**
 * Renders an en.json string, replacing {{name}} placeholders with React nodes,
 * so a number can be styled inside a translated sentence.
 */
export function Trans({ k, values }: { k: string; values: Record<string, ReactNode> }) {
  const parts = t(k).split(/(\{\{\w+\}\})/);
  return (
    <>
      {parts.map((part, i) => {
        const name = /^\{\{(\w+)\}\}$/.exec(part)?.[1];
        return (
          <Fragment key={i}>{name !== undefined && name in values ? values[name] : part}</Fragment>
        );
      })}
    </>
  );
}

import { CONTACT_EMAIL } from '../site';
import { Trans } from '../i18n/Trans';

export function EmailLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="font-semibold break-words text-green-800 underline underline-offset-2 hover:text-green-900"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

/** An i18n sentence with an {{email}} placeholder, rendered with a mailto link. */
export function WithEmail({ k }: { k: string }) {
  return <Trans k={k} values={{ email: <EmailLink /> }} />;
}

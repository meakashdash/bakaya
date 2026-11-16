import { bankRates } from '../data';
import { formatDisplayDate } from '../domain/dates';
import { t } from '../i18n';
import { WithEmail } from './Contact';
import { Link } from './Link';

const linkClass =
  'inline-flex min-h-12 items-center font-semibold text-green-800 underline underline-offset-2 hover:text-green-900';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-xl space-y-3 px-4 py-8 text-stone-700">
        <nav aria-label={t('nav.label')}>
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <Link to="/" className={linkClass}>
                {t('nav.calculator')}
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className={linkClass}>
                {t('nav.howItWorks')}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className={linkClass}>
                {t('nav.privacy')}
              </Link>
            </li>
            <li>
              <Link to="/terms" className={linkClass}>
                {t('nav.terms')}
              </Link>
            </li>
          </ul>
        </nav>
        <p>
          <Link
            to="/how-it-works#rates"
            className="underline underline-offset-2 hover:text-stone-900"
          >
            {t('footer.ratesReviewed', { date: formatDisplayDate(bankRates.lastReviewed) })}
          </Link>
        </p>
        <p>
          <WithEmail k="footer.contact" />
        </p>
        <p className="text-sm">{t('footer.info')}</p>
      </div>
    </footer>
  );
}

import { bankRates } from '../data';
import { formatDate, t } from '../i18n';
import { WithEmail } from './Contact';
import { LogoMark } from './icons';
import { Link } from './Link';

const navLink =
  'inline-flex min-h-11 items-center font-medium text-stone-200 underline-offset-4 hover:text-white hover:underline';

export function Footer() {
  return (
    <footer className="mt-8 bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
            <LogoMark className="size-7" />
            {t('app.name')}
          </p>
          <p className="max-w-sm">{t('footer.tagline')}</p>
          <p className="[&_a]:font-semibold [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2">
            <WithEmail k="footer.contact" />
          </p>
        </div>
        <nav aria-label={t('nav.label')}>
          <ul className="grid grid-cols-2 gap-x-6">
            <li>
              <Link to="/" className={navLink}>
                {t('nav.calculator')}
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className={navLink}>
                {t('nav.howItWorks')}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className={navLink}>
                {t('nav.privacy')}
              </Link>
            </li>
            <li>
              <Link to="/terms" className={navLink}>
                {t('nav.terms')}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t('footer.info')}</p>
          <p>
            <Link
              to="/how-it-works#rates"
              className="text-stone-300 underline underline-offset-2 hover:text-white"
            >
              {t('footer.ratesReviewed', { date: formatDate(bankRates.lastReviewed) })}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

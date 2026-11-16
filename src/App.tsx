import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { WithEmail } from './components/Contact';
import { Footer } from './components/Footer';
import { Link } from './components/Link';
import { setLocale, t } from './i18n';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import NotFound from './pages/NotFound';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import { localeFor, routeFor, useLocation } from './router';
import { pageMeta } from './seo/meta';
import { isBeta } from './site';

// The one place the app reads the clock: today's local calendar date, passed down as asOfDate.
const localToday = () => format(new Date(), 'yyyy-MM-dd');

export default function App() {
  const [asOfDate] = useState(localToday);
  const { pathname, hash } = useLocation();
  const route = routeFor(pathname);
  // The language comes from the URL (/hi/... is Hindi). Set it before any child renders,
  // so every t() call in this render uses it.
  const locale = localeFor(pathname);
  setLocale(locale);
  const otherLocale = locale === 'hi' ? 'en' : 'hi';
  const firstRender = useRef(true);

  // Title per page, and after in-app navigation move focus to the new page (or #section),
  // so keyboard and screen-reader users land at the start of what they asked for.
  useEffect(() => {
    document.documentElement.lang = `${locale}-IN`;
  }, [locale]);

  useEffect(() => {
    document.title = pageMeta(route).title;
    if (firstRender.current) {
      firstRender.current = false;
      if (!hash) return;
    }
    const target =
      (hash && document.getElementById(hash)) ||
      Array.from(document.querySelectorAll<HTMLElement>('main h1')).find(
        (h) => !h.closest('[hidden]'),
      );
    target?.focus();
  }, [route, hash, locale]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:font-semibold focus:text-green-800 focus:outline-3 focus:outline-green-800"
      >
        {t('app.skipToMain')}
      </a>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4">
          <Link
            to="/"
            aria-label={t('app.homeLink')}
            className="inline-flex min-h-12 items-center text-lg font-bold tracking-tight text-green-800"
          >
            {t('app.name')}
          </Link>
          <div className="flex items-center gap-x-4">
            <Link
              to="/how-it-works"
              className="inline-flex min-h-12 items-center font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
            >
              {t('nav.howItWorks')}
            </Link>
            {/* The same page in the other language. Named in that language, as is the convention. */}
            <Link
              to={`${pathname}${hash ? `#${hash}` : ''}`}
              locale={otherLocale}
              lang={otherLocale}
              hrefLang={otherLocale}
              aria-label={t('nav.switchLanguageLabel')}
              className="inline-flex min-h-12 items-center rounded-md border border-green-800 px-3 font-semibold text-green-800 hover:bg-green-50"
            >
              {t('nav.switchLanguage')}
            </Link>
          </div>
        </div>
      </header>
      {isBeta && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          <WithEmail k="app.beta" />
        </p>
      )}
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-xl px-4 py-8 focus:outline-none sm:py-12"
      >
        {/* Home stays mounted while other pages are open, so a result isn't lost. */}
        <div hidden={route !== 'home'}>
          <Home asOfDate={asOfDate} siteUrl={window.location.origin} />
        </div>
        {route === 'howItWorks' && <HowItWorks asOfDate={asOfDate} />}
        {route === 'privacy' && <Privacy />}
        {route === 'terms' && <Terms />}
        {route === 'notFound' && <NotFound />}
      </main>
      <Footer />
    </>
  );
}

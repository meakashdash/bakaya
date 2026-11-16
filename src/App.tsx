import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { WithEmail } from './components/Contact';
import { Footer } from './components/Footer';
import { Globe, LogoMark } from './components/icons';
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
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            aria-label={t('app.homeLink')}
            className="inline-flex min-h-14 shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight text-stone-900"
          >
            <LogoMark className="size-8" />
            {t('app.name')}
          </Link>
          <div className="flex items-center gap-x-1 sm:gap-x-3">
            <Link
              to="/how-it-works"
              className="inline-flex min-h-12 items-center rounded-lg px-2 text-[15px] leading-tight font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900 sm:px-3"
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
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-3.5 text-[15px] font-semibold text-green-800 ring-1 ring-green-800/25 transition-colors hover:bg-green-100"
            >
              <Globe className="size-4" />
              {t('nav.switchLanguage')}
            </Link>
          </div>
        </div>
      </header>
      {isBeta && (
        <p className="border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-center text-sm leading-snug text-amber-950">
          <WithEmail k="app.beta" />
        </p>
      )}
      {/* A soft green wash behind the hero. Decorative. */}
      {route === 'home' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(60rem_30rem_at_20%_-5%,var(--color-green-100),transparent_70%),radial-gradient(40rem_24rem_at_95%_10%,var(--color-emerald-50),transparent_70%)]"
        />
      )}
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 pt-6 pb-12 focus:outline-none sm:px-6 sm:pt-10"
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

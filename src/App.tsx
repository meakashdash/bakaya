import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { Footer } from './components/Footer';
import { Link } from './components/Link';
import { t } from './i18n';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import NotFound from './pages/NotFound';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import { routeFor, useLocation } from './router';
import { pageMeta } from './seo/meta';

// The one place the app reads the clock: today's local calendar date, passed down as asOfDate.
const localToday = () => format(new Date(), 'yyyy-MM-dd');

export default function App() {
  const [asOfDate] = useState(localToday);
  const { pathname, hash } = useLocation();
  const route = routeFor(pathname);
  const firstRender = useRef(true);

  // Title per page, and after in-app navigation move focus to the new page (or #section),
  // so keyboard and screen-reader users land at the start of what they asked for.
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
  }, [route, hash]);

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
          <Link
            to="/how-it-works"
            className="inline-flex min-h-12 items-center font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
          >
            {t('nav.howItWorks')}
          </Link>
        </div>
      </header>
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

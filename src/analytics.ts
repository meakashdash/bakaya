// Privacy-safe event counting (PRD "Non-functional").
//
// track() accepts ONLY an event name from the fixed list below: there is no parameter for
// properties, so form values (amounts, dates, names) cannot be sent, by construction.
//
// Transport: Cloudflare Web Analytics (page views) has no custom-events API. Events are sent
// through Cloudflare Zaraz (`zaraz.track`), which Cloudflare injects only when the site runs on
// a custom domain with Zaraz enabled. Until then track() does nothing. See DEPLOY.md.
export const ANALYTICS_EVENTS = [
  'calculate_clicked',
  'letter_opened',
  'letter_downloaded',
  'whatsapp_shared',
  'waitlist_clicked',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

type Zaraz = { track: (eventName: string) => unknown };

export function track(event: AnalyticsEvent): void {
  try {
    const zaraz = (window as unknown as { zaraz?: Zaraz }).zaraz;
    if (typeof zaraz?.track !== 'function') return;
    // Name only. Never pass a second argument here.
    Promise.resolve(zaraz.track(event)).catch(() => {});
  } catch {
    // Counting must never break the app.
  }
}

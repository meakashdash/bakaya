// Site-wide facts that are not legal values and not translated copy.
import { bankRates, legalConfig, taxRates } from './data';

export const CONTACT_EMAIL = 'bakayaai@gmail.com';

/**
 * Beta until a CA has signed off and every rate, tax rate, source and portal link in /data is
 * marked verified. Flip the flags in /data and the banner disappears on the next build.
 */
export const isBeta: boolean =
  !legalConfig.caReviewed ||
  !legalConfig.complaintPortal.urlVerified ||
  bankRates.rates.some((r) => !r.verified) ||
  taxRates.buyerTypes.some((b) => !b.verified) ||
  legalConfig.sources.some((s) => !s.verified);

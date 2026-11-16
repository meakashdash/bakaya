// Values the warning texts in en.json need. From /data, never hardcoded.
import { legalConfig } from '../../data';

export const WARNING_VARS = {
  maxDays: legalConfig.paymentRules.maxAgreedDays,
  /** The first tax year the late-payment tax rule applied to, e.g. '2023-24'. */
  fromTaxYear:
    [...legalConfig.taxSections].sort((a, b) => a.fromTaxYear.localeCompare(b.fromTaxYear))[0]
      ?.fromTaxYear ?? '',
};

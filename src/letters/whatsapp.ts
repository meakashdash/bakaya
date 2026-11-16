// WhatsApp share text (PRD §2). Built only from the result and the user's own input;
// it goes into a wa.me link that opens on the user's device. Nothing is sent anywhere by us.
import { legalConfig } from '../data';
import { formatDisplayDate } from '../domain/dates';
import { formatPaise, formatRupees } from '../domain/money';
import type { CalculationInput, CalculationResult } from '../domain/types';
import { t } from '../i18n';

export function buildWhatsAppText(
  input: Pick<CalculationInput, 'amountPaise' | 'deliveryDate'>,
  result: CalculationResult,
  siteUrl: string,
): string {
  const sentences = [
    t('share.intro', {
      amount: formatPaise(input.amountPaise),
      deliveryDate: formatDisplayDate(input.deliveryDate),
    }),
  ];

  // Medium enterprises: a plain reminder with no legal claims (LEGAL_RULES.md §1).
  if (result.covered) {
    const dueDate = formatDisplayDate(result.dueDate);
    sentences.push(t(result.isOverdue ? 'share.wasDue' : 'share.isDue', { dueDate }));
    if (result.interest.rupees > 0) {
      sentences.push(
        t('share.interest', {
          section: legalConfig.msmedSections.interest.short,
          interest: formatRupees(result.interest.rupees),
        }),
      );
    }
    if (result.tax?.status === 'at_risk') {
      sentences.push(t('share.tax', { yearEnd: formatDisplayDate(result.tax.yearEnd) }));
    }
  }
  sentences.push(t('share.closing'));

  return `${sentences.join(' ')}\n${t('share.calculatedOn', { url: siteUrl })}`;
}

export const whatsAppUrl = (text: string): string =>
  `https://wa.me/?text=${encodeURIComponent(text)}`;

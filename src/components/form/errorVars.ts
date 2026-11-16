// Values that some error messages need, e.g. "on or after {{date}}". From /data, not hardcoded.
// A function, not a constant, so the date is formatted in the current page language.
import { EARLIEST_SUPPORTED_DATE } from '../../domain/validation';
import { formatDate } from '../../i18n';

export const errorVars = () => ({ date: formatDate(EARLIEST_SUPPORTED_DATE) });

// Values that some error messages need, e.g. "on or after {{date}}". From /data, not hardcoded.
import { formatDisplayDate } from '../../domain/dates';
import { EARLIEST_SUPPORTED_DATE } from '../../domain/validation';

export const ERROR_VARS = { date: formatDisplayDate(EARLIEST_SUPPORTED_DATE) };

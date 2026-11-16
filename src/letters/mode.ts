// Which letter (if any) fits this result. Kept separate from buildLetter so the Result page
// can use it without pulling the templates into the first page load.
import type { CalculationInput, CalculationResult } from '../domain/types';
import type { UdyamField } from './detailsSchema';

/**
 * legal:       micro/small, overdue -> any tone, with citations.
 * general:     medium (not covered) or not on Udyam -> friendly letter without legal citations.
 * not_yet_due: covered but not overdue -> no letter yet (the templates say the payment is late).
 */
export type LetterMode = 'legal' | 'general' | 'not_yet_due';

export function letterMode(input: CalculationInput, result: CalculationResult): LetterMode {
  if (!result.covered || input.category === 'not_registered') return 'general';
  return result.isOverdue ? 'legal' : 'not_yet_due';
}

export function udyamFieldFor(category: CalculationInput['category']): UdyamField {
  if (category === 'not_registered') return 'hidden';
  return category === 'medium' ? 'optional' : 'required';
}

// Who is covered (LEGAL_RULES.md §1). The user picks their category from the Udyam
// certificate; v1 does not compute it from investment/turnover.
import type { CalculationInput, WarningCode } from './types';

export type Eligibility = { covered: boolean; warnings: WarningCode[] };

export function checkEligibility(
  input: Pick<CalculationInput, 'category' | 'isTrader' | 'registeredBeforeSupply'>,
): Eligibility {
  if (input.category === 'medium') {
    return { covered: false, warnings: ['medium_enterprise'] };
  }

  const warnings: WarningCode[] = [];

  // VERIFY: traders are generally not covered. Allow the calculation, with a warning.
  // The trader question is shown only for micro/small, so it's ignored otherwise.
  if (input.isTrader && (input.category === 'micro' || input.category === 'small')) {
    warnings.push('trader');
  }

  // VERIFY: courts have tied protection to Udyam registration at the time of the contract.
  // "Not registered", "registered after supply" and "not sure" all get the same warning.
  if (input.category === 'not_registered' || input.registeredBeforeSupply !== 'yes') {
    warnings.push('registration');
  }

  return { covered: true, warnings };
}

// Shared inputs for letter tests (TC1 by default).
import type { CalculationInput } from '../../src/domain/types';
import type { LetterDetails } from '../../src/letters/detailsSchema';

export const TC1_INPUT: CalculationInput = {
  category: 'micro',
  isTrader: false,
  registeredBeforeSupply: 'yes',
  amountPaise: 50_000_000,
  deliveryDate: '2027-01-10',
  objection: { raised: false },
  agreement: { hasAgreement: true, days: 45 },
  buyerType: 'not_sure',
};

export const DETAILS: LetterDetails = {
  tone: 'friendly',
  supplierName: 'Shakti Fabricators',
  supplierAddress: 'Plot 12, MIDC Bhosari\nPune 411026',
  udyamNumber: 'UDYAM-MH-26-0123456',
  gstin: '27ABCDE1234F1Z5',
  supplierSignatory: 'Ramesh Patil',
  supplierPhone: '+91 98200 12345',
  supplierEmail: 'accounts@shakti.example',
  buyerName: 'Big Motors Ltd',
  buyerContactPerson: 'Mr. Sharma',
  buyerAddress: '1 Industrial Area\nChennai 600032',
  invoiceNumber: 'INV-104',
  invoiceDate: '2027-01-10',
  remember: false,
};

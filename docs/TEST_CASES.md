# Test cases — expected results

Implement each case as a Vitest test against `calculate(input, asOfDate)`. Expected values were computed with an independent reference implementation of `docs/LEGAL_RULES.md` using the bank rates in `data/bank-rates.json`.

Rules used: due date = acceptance + N days (15 if no agreement, max 45); interest from the day after the due date through the as-of date inclusive; daily accrual at 3 × bank rate ÷ 365, compounded at each calendar month end; amounts rounded half-up to whole rupees for display.

Tax exposure columns: low = amount × 25.168%, high = amount × 34.944%.

| ID | Amount (₹) | Acceptance date | Agreement | As-of date | Due date | Interest from | Days overdue | Interest (₹) | Tax low (₹) | Tax high (₹) | Section | Year-end status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC1 | 5,00,000 | 2027-01-10 | 45 days | 2027-03-31 | 2027-02-24 | 2027-02-25 | 35 | 8,284 | 1,25,840 | 1,74,720 | 37(2)(g) | at_risk |
| TC2 | 2,00,000 | 2026-12-01 | none (15) | 2027-03-31 | 2026-12-16 | 2026-12-17 | 105 | 10,107 | 50,336 | 69,888 | 37(2)(g) | at_risk |
| TC3 | 3,00,000 | 2027-03-10 | 45 days | 2027-03-31 | 2027-04-24 | 2027-04-25 | 0 | 0 | 75,504 | 1,04,832 | 37(2)(g) | not_at_risk_this_year |
| TC4 | 1,00,000 | 2027-01-01 | 60 days → capped 45 | 2027-03-31 | 2027-02-15 | 2027-02-16 | 44 | 2,088 | 25,168 | 34,944 | 37(2)(g) | at_risk + warning "capped at 45" |
| TC6 | 1,50,000 | delivered 2027-01-05, objection resolved 2027-01-20 | 30 days | 2027-03-31 | 2027-02-19 | 2027-02-20 | 40 | 2,845 | 37,752 | 52,416 | 37(2)(g) | at_risk |
| TC7 | 4,00,000 | 2026-02-01 | 30 days | 2026-03-31 | 2026-03-03 | 2026-03-04 | 28 | 5,063 | 1,00,672 | 1,39,776 | 43B(h) | at_risk |
| TC8 | 10,00,000 | 2026-08-01 | none (15) | 2026-10-31 | 2026-08-16 | 2026-08-17 | 76 | 35,259 | 2,51,680 | 3,49,440 | 37(2)(g) | at_risk; lead with interest (seasonality); crosses rate change on 2026-10-07 |
| TC9 | 50,000 | 2028-02-15 | none (15) | 2028-03-31 | 2028-03-01 | 2028-03-02 | 30 | 709 | 12,584 | 17,472 | 37(2)(g) | at_risk; leap year (Feb 2028 has 29 days) |
| TC10 | 4,00,000 | 2026-02-01 | 30 days | 2026-04-15 | 2026-03-03 | 2026-03-04 | 43 | 7,810 | 1,00,672 | 1,39,776 | 43B(h) | deferred |

Note on TC3: the tax exposure is computed, but because the status is `not_at_risk_this_year`, the UI shows it only as "if they miss the 24 Apr deadline", not as a current risk.

## Eligibility and validation cases (no numbers)

| ID | Input | Expected |
| --- | --- | --- |
| TC5 | Category = Medium | `covered: false`; message "The 45-day rule protects only micro and small businesses"; no legal citations in letter |
| TC12 | Category = Small, trader = yes | `covered: true` with trader warning |
| TC13 | Udyam registered after supply date = yes | `covered: true` with registration warning |
| TC14 | Amount = 0 or negative | Validation error "Enter an amount above ₹0" |
| TC15 | Amount > ₹100 crore | Validation error "That's above what this tool supports" |
| TC16 | Acceptance date in the future | Validation error "Delivery date can't be in the future" |
| TC17 | Agreement days = 0 or blank with "Yes" selected | Validation error "Enter the agreed number of days" |
| TC18 | As-of before due date | days overdue = 0, interest = 0, status message "Not due yet. Your buyer has X days left." |

## Formatting cases

| Input | Expected display |
| --- | --- |
| 500000 rupees | ₹5,00,000 |
| 12500000 rupees | ₹1,25,00,000 |
| 2027-02-24 | 24 Feb 2027 |
| 8284.49 rupees | ₹8,284 |
| 8284.50 rupees | ₹8,285 |

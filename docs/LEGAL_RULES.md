# Legal rules engine — specification

This is the single source of truth for every calculation. Items marked **VERIFY** must be confirmed by a Chartered Accountant before public launch. Implement them as written and keep a `// VERIFY` comment in the code.

## 1. Who is covered

| Supplier type | Covered? | What the app does |
| --- | --- | --- |
| Micro enterprise | Yes | Full calculation |
| Small enterprise | Yes | Full calculation |
| Medium enterprise | No | Stop. Show "The 45-day rule protects only micro and small businesses." Offer the general reminder letter without legal citations |
| Pure trader (retail/wholesale only) | Generally no | Warn: "Traders are generally not covered by the delayed-payment rules. Check with your CA." Allow calculation with the warning on the result and letter. **VERIFY** |
| Not on Udyam, or registered after the supply date | Uncertain | Warn: "Your Udyam registration should exist before the supply date for these protections. Check with your CA." **VERIFY** (courts have tied protection to registration at the time of the contract) |

Classification limits (from 1 April 2025, both conditions must be met), stored in `data/legal-config.json`:

| Category | Investment up to | Turnover up to |
| --- | --- | --- |
| Micro | ₹2.5 crore | ₹10 crore |
| Small | ₹25 crore | ₹100 crore |
| Medium | ₹125 crore | ₹500 crore |

The app asks the user to pick their category from their Udyam certificate. It does not compute the category from investment/turnover in v1.

## 2. Day of acceptance

- Default: **day of acceptance = day of actual delivery** of goods or completion of services.
- If the buyer raised a written objection within 15 days of delivery: **day of acceptance = day the objection was resolved**. The form asks: "Did the buyer object in writing within 15 days?" If yes, ask for the resolution date.

## 3. Payment deadline (MSMED Act Section 15)

- **No written agreement:** due date = acceptance date + 15 days. Interest starts the next day (the "appointed day").
- **Written agreement for N days:** due date = acceptance date + min(N, 45) days. Interest starts the day after the due date.
- If N > 45: cap at 45 and add warning: "The law caps agreed payment periods at 45 days, so we used 45."

Day counting: due date = acceptance date plus N calendar days. Example: acceptance 10 Jan 2027, 45 days → due 24 Feb 2027; interest from 25 Feb 2027. **VERIFY** the off-by-one convention with a CA.

## 4. Interest (MSMED Act Section 16)

- Rate: **3 × RBI Bank Rate** in force on each day.
- Compound interest with **monthly rests**: accrue interest day by day within each calendar month at (balance × 3 × bank rate ÷ 100 ÷ 365). At the end of each calendar month, add that month's accrued interest to the balance.
- Interest accrues from the interest start date **through the as-of date, inclusive**. Accrued interest for a partial final month is added at the as-of date.
- Use the rate in force on each day, from `data/bank-rates.json` (rates change during a claim; courts have applied the rate in force at each rest).
- Contracts cannot reduce this interest (Section 16 overrides any agreement).
- This interest is not tax-deductible for the buyer (MSMED Act Section 23). Mention in the explainer, not in the calculation.
- v1 has no part payments. v2: apply each payment first to accrued interest, then principal, on the date received.

## 5. Tax exposure (Section 37(2)(g), Income-tax Act 2025; earlier Section 43B(h), Income-tax Act 1961)

**Which section to cite** (based on the tax year the expense falls in, i.e. the Indian financial year April–March containing the acceptance date):

| Tax year | Law | Section |
| --- | --- | --- |
| FY 2023-24 to FY 2025-26 | Income-tax Act, 1961 | Section 43B(h) |
| Tax year 2026-27 onward | Income-tax Act, 2025 | Section 37(2)(g) |

**Year-end status** for the tax year containing the acceptance date. Let `yearEnd` = 31 March of that tax year.

| Situation | Status | Message |
| --- | --- | --- |
| Due date is after `yearEnd` | `not_at_risk_this_year` | "The deadline falls after 31 March, so there's no tax hit this year if they pay on time." |
| Due date ≤ `yearEnd`, as-of date ≤ `yearEnd`, unpaid | `at_risk` | "If unpaid on 31 March, your buyer can't claim this expense this year. Days left: X." |
| Due date ≤ `yearEnd`, as-of date > `yearEnd`, unpaid | `deferred` | "Unpaid on 31 March, so your buyer couldn't claim this in tax year X. They can claim it only in the year they pay." |

**Exposure amount** = invoice amount × buyer's effective tax rate (from `data/tax-rates.json`):

| Buyer type option | Rate used |
| --- | --- |
| Company (concessional regime, most common) | 25.168% |
| Firm or LLP, income over ₹1 crore | 34.944% |
| Not sure | Show range 25.168% to 34.944% |

**VERIFY** all rates with a CA, including whether they are unchanged under the Income-tax Act 2025.

**Wording rule:** the deduction is **deferred**, not lost forever. Always say "can't claim it this year" or "pays more tax this year".

**Seasonality rule:** the tax argument is strongest from January to March. If the as-of date is between April and December and status is `at_risk`, lead the result with the interest figure and show the tax point second.

## 6. Where to complain

- New delayed-payment cases go to the **MSME ODR portal** (only route for new references since 15 October 2025). The old MSME Samadhaan portal keeps only older pending cases.
- The MSME Development (Amendment) Act 2026 adds stricter timelines and a 75% pre-deposit for buyers challenging awards, but its provisions apply only once notified by the government. Don't mention it in the app until notified. Keep a flag `amendment2026Notified: false` in `legal-config.json`.

## 7. Disclaimer (must appear on result page and every letter)

> This tool gives general information based on the MSMED Act, 2006 and the Income-tax Act. It is not legal or tax advice. Please confirm with your Chartered Accountant or lawyer before taking action.

## Sources

- MSMED Act Sections 15–17, interest at 3× bank rate with monthly rests: LiveLaw, SCC Online
- Section 37(2)(g) of the Income-tax Act 2025 replacing 43B(h): Accountune, Busy
- ODR portal as the only route since 15 Oct 2025: iPleaders
- Bank Rate 5.75% from 7 Oct 2026: RBI Governor's Statement, 7 Oct 2026
- MSME limits from 1 Apr 2025: Ministry of MSME notification S.O. 1364(E), 21 Mar 2025

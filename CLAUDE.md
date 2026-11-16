# CLAUDE.md — Bakaya (working name)

You are building **Bakaya**, a free web tool for Indian micro and small suppliers who are owed money by late-paying buyers. Read this file fully before writing any code. Then read `docs/PRD.md`, `docs/LEGAL_RULES.md` and `docs/TEST_CASES.md`.

## What we're building (one paragraph)

A supplier enters an invoice amount, the delivery date, and whether there's a written payment agreement. The page shows: the legal payment deadline, days overdue, the interest the buyer legally owes (MSMED Act Section 16), and the extra tax the buyer pays this year if the invoice is still unpaid on 31 March (Income-tax Act 2025 Section 37(2)(g), earlier 43B(h)). It then generates a polite, formal reminder letter as a PDF and a WhatsApp-ready message. Everything runs in the browser. No login. No data leaves the user's device.

## Hard constraints

1. **Zero running cost.** No paid services, no servers, no databases in v1. Static site only.
2. **Privacy by design.** All calculations and PDF generation happen client-side. Never send invoice data to any server. Analytics must be cookieless and must never capture form values.
3. **Legal accuracy over features.** Every number shown must come from the rules in `docs/LEGAL_RULES.md` and the data files in `/data`. Never hardcode a rate, section number or limit in components.
4. **Every calculation is unit-tested** against `docs/TEST_CASES.md` before any UI work depends on it.
5. **Mobile first.** Most users open links from WhatsApp on a phone. Design for 360px width first.
6. **Plain language.** UI copy is for a small factory owner, not a lawyer. Short sentences. No jargon without a one-line explanation.

## Tech stack (all free)

| Layer       | Choice                                                                    | Notes                                                                                                                         |
| ----------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Build       | Vite + React 18 + TypeScript (strict)                                     | Static output in `dist/`                                                                                                      |
| Styling     | Tailwind CSS                                                              | No component library needed for v1                                                                                            |
| Dates       | date-fns                                                                  | Use local calendar dates only; never `new Date()` arithmetic with timezones. Represent dates as `YYYY-MM-DD` strings in logic |
| Money       | Integer paise (`bigint` or number of paise)                               | Never use floating point for money. Round half-up to whole rupees only for display                                            |
| PDF         | @react-pdf/renderer with a bundled Noto Sans font                         | Standard PDF fonts can't render ₹. Bundle `NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` in `/public/fonts`                   |
| Validation  | zod                                                                       | One schema for form input                                                                                                     |
| Forms       | react-hook-form                                                           |                                                                                                                               |
| Tests       | Vitest + @testing-library/react; Playwright for one end-to-end smoke test |                                                                                                                               |
| Lint/format | ESLint + Prettier                                                         |                                                                                                                               |
| Hosting     | Cloudflare Pages (free tier allows commercial use; Vercel Hobby does not) | Use the free `*.pages.dev` subdomain until a domain is bought                                                                 |
| Analytics   | Cloudflare Web Analytics                                                  | Free, cookieless                                                                                                              |
| Waitlist    | A Google Form link                                                        | Free; no backend                                                                                                              |

## Project structure

```
src/
  domain/            # Pure functions only. No React. 100% test coverage.
    dates.ts         # acceptance date, due date, interest start, overdue days
    interest.ts      # Section 16 compound interest, monthly rests, rate per day
    tax.ts           # tax exposure range, which section applies, 31 March status
    eligibility.ts   # who is covered (micro/small, Udyam, trader, medium)
    money.ts         # paise helpers, Indian number formatting (₹5,00,000)
    calculate.ts     # one entry point: calculate(input, asOfDate) -> Result
  data/              # imports JSON from /data with types
  letters/           # letter text builders + PDF document components
  components/        # UI
  pages/             # Home (calculator), Result, About, Privacy, Terms
  i18n/              # en.json and hi.json (same keys). All UI strings go here
tests/
data/                # bank-rates.json, tax-rates.json, legal-config.json
docs/
```

## Conventions

- Domain functions are pure and take `asOfDate` as a parameter. Never read the current date inside domain code.
- Every result object carries a `citations` array (section names + source URLs from `legal-config.json`) so the UI and letter can show where each number comes from.
- Every result carries `warnings: string[]` for edge cases (agreement over 45 days, medium enterprise, trader, not registered before supply, due date after 31 March).
- All user-facing strings live in `src/i18n/en.json`.
- Indian number format everywhere: ₹5,00,000 not ₹500,000. Use `Intl.NumberFormat('en-IN')`.
- Dates shown as `24 Feb 2027`.
- Accessibility: labels on every input, visible focus, contrast AA, works with a screen reader.

## Commands

- `npm run dev` — local server
- `npm test` — unit tests (must pass before every commit)
- `npm run test:e2e` — Playwright smoke test
- `npm run build` — production build
- `npm run lint`

## Definition of done for any task

1. Tests written and passing, including the relevant cases in `docs/TEST_CASES.md`.
2. No hardcoded legal values outside `/data`.
3. Works at 360px width.
4. No console errors.
5. Copy is in `en.json`, in plain language.

## What NOT to do

- Don't add a backend, database, login or payment integration in v1. Payments are behind a feature flag `VITE_PAYMENTS_ENABLED=false` and come later.
- Don't call any external API with user data.
- Don't present output as legal advice. Every result page and letter shows the disclaimer from `legal-config.json`.
- Don't say the buyer "loses" the deduction forever. It is deferred to the year of payment. Use: "can't claim it this year".
- Don't guess legal rules. If something in `docs/LEGAL_RULES.md` is marked `VERIFY`, implement it as written and keep the `VERIFY` comment in code.

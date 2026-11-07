# Product requirements — Bakaya v1

## Goal of v1

Prove that small suppliers will use the calculator and send the letter. Success = 1,000 calculator users and 30 letters generated in the first month (see Metrics).

v1 is **free**. Payments come in v2 once demand is proven. The letter download is free, but asks for an optional email or WhatsApp number to join the early-access list (Google Form link, opens in a new tab, never required).

## Target user

Ramesh, 42, runs a small factory or service business. Udyam-registered as micro or small. Sells to bigger companies. Uses WhatsApp all day, a laptop rarely. Comfortable with UPI. Not comfortable with legal language. Afraid to upset a large buyer.

## Pages

1. **Home / Calculator** (`/`)
2. **Result** (same page, below the form, after Calculate; URL hash keeps no personal data)
3. **Letter preview** (modal or `/letter`)
4. **How it works** (`/how-it-works`): the law in plain language, with sources
5. **Privacy** (`/privacy`), **Terms** (`/terms`)

## 1. Home / Calculator

**Hero (above the fold on a phone):**
- Headline: "Owed money for more than 45 days? The law is on your side."
- Subline: "See what your late buyer owes you in interest, and how much extra tax they pay if they don't clear it by 31 March. Free. Nothing leaves your phone."

**Form fields (in this order):**

| # | Label | Type | Help text |
| --- | --- | --- | --- |
| 1 | What is your business type on Udyam? | Radio: Micro / Small / Medium / Not registered | "It's on your Udyam certificate." |
| 2 | Do you only trade goods (buy and resell)? | Yes / No | Shown only for Micro/Small |
| 3 | Was your Udyam registration done before this supply? | Yes / No / Not sure | |
| 4 | Invoice amount (₹) | Number with Indian comma formatting as you type | |
| 5 | Date you delivered the goods or finished the service | Date | |
| 6 | Did the buyer object in writing within 15 days? | Yes / No | If Yes: "Date the objection was sorted out" |
| 7 | Is there a written agreement on payment days? | Yes / No | If Yes: "How many days?" |
| 8 | What kind of business is the buyer? | Company / Firm or LLP / Not sure | Optional, default Not sure |

Button: **"Check what they owe"**

## 2. Result

Order of cards (mobile, stacked):

1. **Headline card** — one sentence in large text, e.g. "Your buyer is 35 days late. They now owe you ₹8,284 in interest."
2. **Tax card** (or interest first, per seasonality rule in LEGAL_RULES.md): "If they don't pay by 31 March 2027, they pay about ₹1,25,840 to ₹1,74,720 more tax this year." Plus a countdown: "X days left to 31 March." (Hide the countdown when the as-of date is 31 March or later.)
3. **Deadline card** — due date, interest start date, rate used ("17.25% a year, which is 3 × RBI bank rate of 5.75%").
4. **Why this is true** — 3 bullet citations with sections, each with a "Learn more" link.
5. **Actions:**
   - Primary: **"Create a polite reminder letter"** → letter preview
   - Secondary: **"Share on WhatsApp"** → `https://wa.me/?text=` with a prefilled message (see below)
   - Tertiary: "Calculate another invoice"
6. **Disclaimer** (from legal-config.json), always visible.

**WhatsApp share text (prefilled, editable by user):**
> Hi, a gentle reminder about invoice of ₹5,00,000 delivered on 10 Jan 2027. As per the MSMED Act, payment was due by 24 Feb 2027. Interest under Section 16 is now ₹8,284. If unpaid by 31 March 2027, it also can't be claimed as an expense this tax year. Please arrange payment. Thank you.
> (Calculated on [site URL])

## 3. Letter

- Three tones in v1, picked by the user: **Friendly reminder** (default), **Firm notice**, **Final notice before filing a complaint**. Templates in `/templates`.
- Extra fields shown only for the letter: supplier business name, address, GSTIN (optional), Udyam number, buyer company name, buyer address, invoice number(s), contact person.
- Output: PDF download (A4, letterhead style with supplier name at top), plus "Copy text" button.
- Fields saved only in the browser's memory for the session. Optional "Remember my business details on this device" checkbox uses localStorage (wrapped in try/catch).
- After download: show the early-access card: "Want us to send follow-ups for you automatically? Join the early list." → Google Form.

## Non-functional

- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on mobile.
- First load under 200 KB JS gzipped (lazy-load the PDF library only when the letter is opened).
- Works offline after first load is a nice-to-have, not required.
- No cookies. Cloudflare Web Analytics only. Track page views and these events via a tiny custom event (no form values): `calculate_clicked`, `letter_opened`, `letter_downloaded`, `whatsapp_shared`, `waitlist_clicked`.

## Metrics for month 1

| Metric | Target |
| --- | --- |
| Calculations | 1,000 |
| Letters downloaded | 30 (3%) |
| WhatsApp shares | 15% of calculations |
| Waitlist sign-ups | 50 |

## Out of scope for v1

Payments, accounts, automated follow-ups, invoice upload, Tally import, Hindi (v1.1), part payments (v2), multiple invoices in one letter (v1.1).

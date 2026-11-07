# START HERE — building Bakaya with Claude Code

"Bakaya" (बकाया, "dues") is a working name. Change it anytime by searching the repo.

## What this kit contains

| File                       | What it's for                                                            |
| -------------------------- | ------------------------------------------------------------------------ |
| `CLAUDE.md`                | Rules Claude Code reads automatically: stack, constraints, conventions   |
| `docs/PRD.md`              | What the product does, screen by screen, with exact copy                 |
| `docs/LEGAL_RULES.md`      | The calculation rules, with sources. Items marked VERIFY need a CA       |
| `docs/TEST_CASES.md`       | 17 test cases with exact expected answers                                |
| `data/*.json`              | Bank rates, tax rates, section numbers. The only place legal values live |
| `templates/*.md`           | Three reminder letters: friendly, firm, final                            |
| `docs/LAUNCH_CHECKLIST.md` | Everything to tick before sharing the link publicly                      |

## Cost

₹0 for infrastructure: Cloudflare Pages (free, commercial use allowed), GitHub (free), Cloudflare Web Analytics (free), Google Forms (free). The only cost is your existing Claude plan for Claude Code. A domain (about ₹700–1,000 a year) is optional; start with the free `*.pages.dev` address.

## One-time setup (15 minutes)

1. Install **Node.js 20 LTS** or newer from nodejs.org. Check: `node -v`
2. Install **Git**. Check: `git --version`
3. Install **Claude Code**: `npm install -g @anthropic-ai/claude-code`
4. Create free accounts: **GitHub**, **Cloudflare**.
5. Unzip this kit, then in a terminal:
   ```
   cd bakaya-starter
   git init
   claude
   ```

## Build it phase by phase

Paste one prompt at a time. Don't move to the next phase until the current one is done and you've checked it. After each phase, run the **review prompt** at the bottom.

### Phase 1 — Project setup

```
Read CLAUDE.md and every file in docs/ and data/. Then set up the project exactly as CLAUDE.md describes: Vite + React + TypeScript (strict), Tailwind, Vitest, Testing Library, Playwright, ESLint, Prettier, date-fns, zod, react-hook-form. Keep the existing docs/, data/ and templates/ folders. Create the folder structure from CLAUDE.md with empty placeholder files. Add npm scripts: dev, build, test, test:e2e, lint. Make a first commit. Don't build any features yet. When done, list what you created and anything you were unsure about.
```

### Phase 2 — The calculation engine (most important)

```
Build the domain layer in src/domain/ following docs/LEGAL_RULES.md exactly. Use integer paise for money and YYYY-MM-DD strings for dates. Read all legal values from data/*.json, never hardcode them. Expose one function: calculate(input, asOfDate) returning due date, interest start, days overdue, interest, tax exposure (low/high or single), tax section and act, year-end status, warnings and citations. Write a Vitest test for every case in docs/TEST_CASES.md first, then make them pass. Every expected number must match to the rupee. Also test Indian number and date formatting. Show me the test output when done. If any expected value doesn't match, stop and explain why instead of changing the test.
```

### Phase 3 — Calculator page and result

```
Build the Home page with the form from docs/PRD.md section 1 and the Result section from section 2, mobile first at 360px. Use react-hook-form with a zod schema and the validation messages from docs/TEST_CASES.md. Put every string in src/i18n/en.json. Apply the seasonality rule (interest card first from April to December). Add the WhatsApp share button with the prefilled text from the PRD, using wa.me. Show the disclaimer on the result. Design: clean, trustworthy, plenty of white space, one accent colour (deep green), large readable numbers, no stock illustrations. Check accessibility: labels, focus states, contrast.
```

### Phase 4 — Reminder letter and PDF

```
Build the letter flow from docs/PRD.md section 3. Use the three templates in templates/. Render the PDF with @react-pdf/renderer, lazy-loaded only when the letter opens, with Noto Sans bundled in public/fonts so the ₹ sign renders. A4, supplier name as letterhead, disclaimer in small text at the bottom. Add "Copy text". Add the optional "Remember my business details on this device" using localStorage wrapped in try/catch. For Medium enterprises, generate the friendly letter without any legal citations. After download, show the early-access card linking to a Google Form URL read from an env variable VITE_WAITLIST_URL.
```

### Phase 5 — Content pages and SEO

```
Build /how-it-works (the law in plain language using docs/LEGAL_RULES.md, with sources linked), /privacy (explain that nothing leaves the device, cookieless analytics only) and /terms (information only, not legal advice). Add meta titles and descriptions targeting searches like "MSME 45 days payment rule calculator" and "MSME delayed payment interest calculator". Add Open Graph tags and a simple 1200x630 OG image with the headline. Add sitemap.xml and robots.txt. Add a footer with "Rates last reviewed" pulled from data/bank-rates.json.
```

### Phase 6 — Analytics and deployment

```
Add Cloudflare Web Analytics using an env variable VITE_CF_ANALYTICS_TOKEN (skip if empty). Add the custom events listed in docs/PRD.md without ever sending form values. Then prepare deployment to Cloudflare Pages: build command, output folder, environment variables, and a _headers file with security headers (CSP, X-Frame-Options, Referrer-Policy). Write DEPLOY.md with step-by-step instructions for me to connect the GitHub repo to Cloudflare Pages.
```

### Phase 7 — Quality pass

```
Do a full quality pass. Run all unit tests and add the Playwright smoke test: fill the form with TC1, check the result numbers, open the letter, download the PDF. Run a Lighthouse audit on mobile and fix anything below the PRD targets. Check every page at 360px and 1280px. Check keyboard-only navigation. Then go through docs/LAUNCH_CHECKLIST.md and tell me which items are done and which need me.
```

### Review prompt (run after every phase)

```
Review what you just built against CLAUDE.md, the PRD and LEGAL_RULES.md as a strict senior reviewer. List: bugs, anything that contradicts the docs, hardcoded legal values, missing tests, accessibility issues, and copy that isn't plain language. Fix them, then summarise what changed.
```

## Tips for working with Claude Code

- Keep each session to one phase. Start a fresh session with `/clear` between phases.
- If something looks wrong in a calculation, don't let Claude "fix" the test. The test values were computed independently.
- Commit after each phase: ask Claude "commit this phase with a clear message".
- Before launch, a CA must check every item marked VERIFY.

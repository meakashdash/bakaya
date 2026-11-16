# Launch checklist

## Legal and accuracy (needs a CA)

- [ ] CA confirms the due-date day counting (acceptance + N days; interest from the next day)
- [ ] CA confirms tax rates in data/tax-rates.json under the Income-tax Act 2025
- [ ] CA confirms the trader and "registered before supply" warnings
- [ ] CA reviews all three letter templates
- [ ] A native Hindi speaker (ideally the CA) reviews src/i18n/hi.json and templates/hi/*.md
- [ ] All entries in data/bank-rates.json marked verified against RBI press releases
- [ ] Official MSME ODR portal URL added to data/legal-config.json
- [ ] Check whether the MSME Development (Amendment) Act 2026 has been notified; if yes, update LEGAL_RULES.md

## Product

- [ ] All test cases in TEST_CASES.md pass
- [ ] Playwright smoke test passes
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95
- [ ] Tested on a real Android phone via a WhatsApp link
- [ ] ₹ renders correctly in the PDF
- [ ] Disclaimer visible on result and every letter
- [ ] Privacy and Terms pages live
- [ ] No form values in analytics (check the network tab)

## Distribution (day 1)

- [ ] Google Form for the early-access list created and URL set in VITE_WAITLIST_URL
- [ ] Google Search Console set up and sitemap submitted
- [ ] 10 supplier interviews done; send them the link first
- [ ] Shared in 3 CA groups with a short note
- [ ] Day 1 build-in-public post on LinkedIn and X

## Ongoing

- [ ] After every RBI policy meeting: update data/bank-rates.json (next: decision due 4 Dec 2026)
- [ ] After every Union Budget: check section numbers and tax rates

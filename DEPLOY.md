# Deploying Bakaya to Cloudflare Pages

Cost: ₹0. Cloudflare Pages' free plan allows commercial use, gives you a free `*.pages.dev`
address, and rebuilds the site every time you push to GitHub.

You need: a GitHub account, a Cloudflare account, and this project committed in git.

---

## Settings at a glance

| Setting | Value |
| --- | --- |
| Framework preset | `None` (or `Vite`) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | leave empty (the repo root) |
| Node version | `24`, read automatically from the `.node-version` file |

Environment variables (set the same values for **Production** and **Preview**):

| Variable | Value | Required? |
| --- | --- | --- |
| `VITE_SITE_URL` | Your site's address, e.g. `https://bakaya.pages.dev` (no trailing slash) | Yes, after the first deploy (step 4) |
| `VITE_CF_ANALYTICS_TOKEN` | The token from Cloudflare Web Analytics (step 5). Leave empty to turn analytics off | Optional |
| `VITE_WAITLIST_URL` | Your Google Form link, starting with `https://`. Leave empty to hide the early-access card | Optional |
| `VITE_PAYMENTS_ENABLED` | `false` | Yes, keep `false` in v1 |

These values are built into the site's files, so they are public. Never put a secret in a
`VITE_` variable. After you change one, you must redeploy (step 4 shows how).

---

## Step 1. Put the code on GitHub

1. On github.com, click **New repository**. Name it `bakaya`. Choose **Private** if you like
   (Cloudflare can read private repos). Don't add a README, .gitignore or licence; the
   project already has them.
2. In a terminal in the project folder, run (replace `YOUR-NAME`):

   ```
   git remote add origin https://github.com/YOUR-NAME/bakaya.git
   git push -u origin main
   ```

3. Refresh the GitHub page. You should see the `src`, `docs` and `data` folders.

## Step 2. Create the Pages project

1. Log in to dash.cloudflare.com.
2. In the left menu, open **Workers & Pages** and click **Create**.
3. Choose the **Pages** tab, then **Connect to Git**.
4. Click **Connect GitHub**. When GitHub asks, allow Cloudflare to access **only the `bakaya`
   repository**.
5. Select `bakaya` and click **Begin setup**.

## Step 3. Build settings

1. **Project name:** `bakaya`. This becomes your address: `https://bakaya.pages.dev`. If the name
   is taken, Cloudflare will suggest another; note the address it shows.
2. **Production branch:** `main`.
3. **Framework preset:** `None`.
4. **Build command:** `npm run build`
5. **Build output directory:** `dist`
6. Open **Environment variables (advanced)** and add `VITE_PAYMENTS_ENABLED` = `false`. Add
   `VITE_WAITLIST_URL` now if your Google Form is ready.
7. Click **Save and Deploy**. The first build takes about 2 minutes. When it says **Success**,
   click the link to open your site.

## Step 4. Tell the site its own address

The search and link-preview tags (and `sitemap.xml`) need the site's real address.

1. In your Pages project, open **Settings → Variables and Secrets** (called **Environment
   variables** on some accounts).
2. Add `VITE_SITE_URL` with your address, e.g. `https://bakaya.pages.dev`. Add it for both
   **Production** and **Preview**.
3. Redeploy so the new value is used: open **Deployments**, click the **⋯** menu on the latest
   deployment and choose **Retry deployment**.

You need this redeploy every time you change a variable.

## Step 5. Turn on visitor counts (Cloudflare Web Analytics)

Cookieless page views. No form values are ever collected: the site never puts what you type in
the address bar, and the analytics script only sees the address.

1. In the Cloudflare dashboard, open **Analytics & Logs → Web Analytics** and click
   **Add a site**.
2. Enter your hostname, e.g. `bakaya.pages.dev`, and choose the option to add the JavaScript
   snippet yourself (**not** the automatic setup; automatic setup would add a second copy of
   the script and count every visit twice).
3. Cloudflare shows a snippet like
   `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "abc123..."}'>`.
   Copy only the token: the 32 letters and digits after `"token": "`.
4. Add it as `VITE_CF_ANALYTICS_TOKEN` (Production and Preview) and redeploy (step 4.3).
5. Open your site, then check **Web Analytics** after a few minutes. Visits appear there.

If the token is not exactly 32 letters and digits, the build fails on purpose with a clear
message, so a typo can't break the pages.

## Step 6. The five button events (needs a custom domain)

The PRD asks to count `calculate_clicked`, `letter_opened`, `letter_downloaded`,
`whatsapp_shared` and `waitlist_clicked`.

**Important:** Cloudflare Web Analytics only counts page views; it has no custom events. The
free Cloudflare tool that counts custom events, **Zaraz**, only works on a **custom domain**, not
on `*.pages.dev`. So these five events are not counted until you add a domain.

The code is ready: each event sends only its name (never what you typed) to Zaraz, and does
nothing when Zaraz isn't there. When you buy a domain (about ₹700–1,000 a year):

1. Add the domain to Cloudflare, then in your Pages project open **Custom domains** and add it.
2. Turn on **Zaraz** for that domain (in the dashboard, under the domain → **Zaraz**).
3. In Zaraz, add a tool or use Zaraz's monitoring to count the events. Create one trigger per
   event: Variable name **Event Name**, Match string = the event name (e.g. `letter_downloaded`).
4. Zaraz adds its own script to your pages, which the security policy in `public/_headers` will
   block at first. Open your site with the browser console open, read the "Refused to..." message,
   and update the `Content-Security-Policy` line as Cloudflare's Zaraz documentation describes.
   Run `npm run test:e2e` after any change to `_headers`.
5. Update `VITE_SITE_URL` to the new domain and redeploy.

Until then, you can still compare page views of `/` with your waitlist sign-ups in Google Forms.

## Step 7. Check the deployment

1. **Security headers.** In a terminal:

   ```
   curl -sI https://bakaya.pages.dev | findstr /i "content-security x-frame referrer"
   ```

   (On Mac or Linux use `grep -i` instead of `findstr /i`.) You should see all three headers.
2. **All pages load:** `/`, `/how-it-works`, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`.
3. **Link preview.** Send your site's link to yourself on WhatsApp. You should see the green
   card with "Owed money for more than 45 days? The law is on your side." WhatsApp caches previews,
   so if you change the image later, test with a new link such as `/?v=2`.
4. **On a real Android phone, inside WhatsApp:** run TC1 (₹5,00,000, delivered 10 Jan 2027,
   45 days) and download the PDF. Check that the ₹ sign shows in the PDF.
5. **Google Search Console:** add your site and submit `https://bakaya.pages.dev/sitemap.xml`.

---

## Everyday use

- **Publishing a change:** commit and `git push`. Cloudflare rebuilds and publishes in about
  2 minutes.
- **Preview before publishing:** push to any branch other than `main`. Cloudflare gives that branch
  its own preview address. Preview addresses are public but not indexed by search engines.
- **Undo a bad release:** **Deployments** → choose an earlier one → **⋯** → **Rollback to this
  deployment**.
- **After every RBI policy decision:** add the new rate to `data/bank-rates.json`, update
  `lastReviewed`, run `npm test`, then push. The footer's "Rates last reviewed" date updates by
  itself.
- **Before every push:** `npm test` (and `npm run test:e2e` if you changed pages or `_headers`).

## How this setup protects users

- **No server, no database.** Every calculation and every PDF is made in the user's browser.
- **`public/_headers` sends:**
  - A strict Content Security Policy. The page may only load code from itself and Cloudflare's
    analytics script, and may only send data to itself and Cloudflare's analytics endpoint.
  - `X-Frame-Options: DENY`, so other sites can't embed it.
  - `Referrer-Policy: strict-origin-when-cross-origin`, so links to sources share only your
    domain name.
  - HSTS, plus a few other hardening headers.
- **Two narrow allowances for the PDF library:** `'wasm-unsafe-eval'` and `data:` in
  `connect-src`. Its layout engine is WebAssembly bundled inside the app. These allow compiling
  that WebAssembly; they do not allow JavaScript `eval`.
- **The tests enforce it.** The end-to-end tests apply these exact headers, so a policy change
  that breaks the calculator or the PDF fails `npm run test:e2e`. They also fail if the page ever
  contacts any address other than itself.

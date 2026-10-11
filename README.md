# JobPilot AI

An installable (PWA) AI job-search assistant sold as a subscription SaaS to customers worldwide. It keeps a target niche, a tracker, resume tools, outreach drafts, and interview practice in one place. Drafts stay drafts: nothing is sent to LinkedIn or email for you.

Plans: 7-day Pro trial (no card) → Free tier, or **Pro Monthly $40/month** / **Pro Annual $400/year** via Stripe.

The product name lives in `src/lib/brand.ts`.

## Demo desk

No API keys are required. With `LLM_API_KEY` empty, every writing feature uses the built-in mock. The demo user is only created when `SEED_DEMO=1` (opt-in; leave it unset in production) and its credentials are only pre-filled on the sign-in page in that case.

| | |
| --- | --- |
| Email | `demo@jobpilot.local` |
| Password | `pilot-demo` |

The demo profile is a senior cloud and DevOps leader in Bengaluru open to remote work, priced in INR, to show that non-USD markets work. New accounts default to USD and UTC. Registering creates an empty desk for someone else.

## Run locally

Postgres is the only database. Local and production use the same migration files. A laptop runs Postgres in Docker so `prisma migrate deploy` matches what Vercel runs against Neon.

```bash
docker compose up -d
npm install
npm run dev
```

`npm run dev` creates `.env` from `.env.example` if needed, starts Docker Postgres when the port is closed and Docker is available, applies migrations, and seeds the demo user when `SEED_DEMO=1`. The app listens on [http://127.0.0.1:41731](http://127.0.0.1:41731).

```bash
npm test          # unit tests
npm run build     # migrate, optional seed, then next build
npm start         # production server, same port
npm run test:e2e  # Playwright smoke test (starts the production server)
npm run db:reset  # wipe Postgres and reseed when SEED_DEMO=1
```

## Environment

Every variable is listed again under [Deploy to Vercel](#deploy-to-vercel), with required and optional called out. Locally, copy `.env.example`.

Live model calls are a single `POST {LLM_BASE_URL}/chat/completions` from `src/lib/ai/index.ts`. Job-board calls live in `src/lib/jobs/providers.ts`. Search always includes an original sample market so the desk works with no board keys.

## What the desk includes

- **Home** is a six-step journey: resume, niche, job match, referral note, pitch, then negotiation. One card shows the next step.
- **Assistant** is a floating chat. It routes a request and suggests the next step. On a saved role: cover letter, fit, ATS check, tailor, practice interview.
- **More tools** holds strategy, SWOT, companies, analytics, templates, presence, and the rest.
- **Strategy** for one or more niches, suggestions, fit scores, a skill map, SWOT, and Challenge-Action-Result notes that can become a master resume.
- **Resumes** from PDF, DOCX, or pasted text. Three templates (Executive, Atlas, Ledger), a rule-based score, ATS keyword match, per-job tailoring, and print-to-PDF.
- **Cover letters** from a role plus a resume, then edit and print.
- **Search** with title, location, work mode, minimum years, and keywords. Manual add by pasting a description or one URL. No site crawling.
- **Tracker** kanban: Saved, Applied, Screening, Interviewing, Offer, Rejected. Notes, keywords, contacts, and stage drafts (referral, follow-up, thank-you, offer accept or decline).
- **Companies** board and **funnel** counts.
- **Network** contacts and a four-step sequence (pitch, two follow-ups, final) with editable templates. Copy only.
- **Pitch** decks as editable HTML slides, revisable by prompt, printable to PDF.
- **Presence** for three post drafts a week, plus headline and About suggestions from pasted profile text.
- **Interview studio** from a question bank, generated questions, or your own. Type or use the browser speech API. Scores content, filler words, and pace.
- **Negotiation** script plus a text role-play and a scored report.
- **Reminders** with Web Push where the browser allows it, and an in-app list otherwise.

Out of scope, with a place to attach them later (`src/lib/extensions.ts`): a browser extension (`POST /api/extensions/jobs` returns 501), LinkedIn sending, camera analysis, and human coaching.

## Install as an app

The production build serves a web manifest and a service worker.

- Android and desktop: open the production site in Chrome or Edge and use Install.
- iOS: Safari → Share → Add to Home Screen.

The service worker caches the app shell and the last dashboard snapshot for offline reading. In `npm run dev` a network-only worker is registered so hot reload stays usable. Installability is meant to be checked against `npm start`.

PDF export is the browser print dialog (`/print/resume`, `/print/letter`, `/print/deck`). Nothing renders PDFs on the server, so there is no headless browser in the Vercel function. Resume uploads are parsed in memory (PDF, DOCX, or text, 4 MB) and the original bytes are stored in Postgres, or in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set. The offline cache is the browser Cache API, not the server disk.

## Docker

```bash
docker compose up -d
docker build -t jobpilot .
docker run --rm -p 41731:41731 \
  -e DATABASE_URL="postgresql://jobpilot:jobpilot@host.docker.internal:5432/jobpilot?schema=public" \
  -e DIRECT_URL="postgresql://jobpilot:jobpilot@host.docker.internal:5432/jobpilot?schema=public" \
  -e SEED_DEMO=1 \
  -e AUTH_SECRET="replace-me" \
  -e AUTH_TRUST_HOST=true \
  jobpilot
```

The container runs `prisma migrate deploy` on startup, then seeds only when `SEED_DEMO=1`. On Linux, add `--add-host=host.docker.internal:host-gateway` so the container can see the Compose database.

## Deploy to Vercel

The hosted app is Postgres on Neon, deployed from the GitHub repo `sudeepsingh080579/jobpilot-ai` (or the Origin mirror `sudeep-singh/jobpilot-ai`).

`vercel.json` sets the build command so each deploy migrates before it builds:

```bash
prisma generate && prisma migrate deploy && node scripts/seed-if-enabled.mjs && next build
```

The seed script inserts the demo user only when `SEED_DEMO` is `1` or `true`.

### What you do in the Vercel dashboard

1. In Vercel, create a project and import `sudeepsingh080579/jobpilot-ai` from GitHub. Leave the framework as Next.js.
2. Open the project **Storage** tab and add **Neon** (Vercel Postgres is Neon in the marketplace). Create a database and connect it to this project. Neon will add its own variables, often `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_PRISMA_URL`, and `POSTGRES_URL_NON_POOLING`.
3. Open **Settings → Environment Variables**. Add the variables in the table below for the **Production** environment. Include **Preview** as well if you want preview deploys to boot.
4. Map the database URLs:
   - `DATABASE_URL`: the pooled Neon URL. If you see `POSTGRES_PRISMA_URL`, copy that value. The host contains `-pooler`, and the query string should include `pgbouncer=true` and `connection_limit=1`. Add those two parameters if they are missing.
   - `DIRECT_URL`: the unpooled URL (`DATABASE_URL_UNPOOLED` or `POSTGRES_URL_NON_POOLING`). The host must not contain `-pooler`. Migrations use this URL.
   - If you have a single non-pooled URL, paste it into both `DATABASE_URL` and `DIRECT_URL`.
5. Do **not** mark `DATABASE_URL`, `DIRECT_URL`, or `NEXT_PUBLIC_VAPID_PUBLIC_KEY` as Sensitive. Sensitive variables are hidden from the build, and the build is what runs migrations and inlines the public push key.
6. Deploy. The first build applies `prisma/migrations`. Later deploys apply only new migrations.
7. After the deploy is green, open the production URL Vercel shows, sign in, and install the app from that https URL.

### Environment variables

| Variable | Required on Vercel | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Postgres URL for the running app. |
| `DIRECT_URL` | Yes | Unpooled Postgres URL for `prisma migrate deploy`. Same as `DATABASE_URL` when you are not using a pooler. |
| `AUTH_SECRET` | Yes | Signs the session cookie. Generate a new one. Do not reuse the value in `.env.example`. |
| `AUTH_URL` | Yes | Canonical site URL, `https://<your-project>.vercel.app`. Cookies are marked Secure when this starts with `https://`. |
| `AUTH_TRUST_HOST` | Yes | Set to `true` so Auth.js accepts the host Vercel forwards. |
| `SEED_DEMO` | No | Set to `1` only if the production database should contain the demo desk (`demo@jobpilot.local` / `pilot-demo`). Leave it unset for a private desk. |
| `LLM_API_KEY` | No | Empty keeps mock mode. |
| `LLM_BASE_URL` | No | OpenAI-compatible base. Default `https://api.openai.com/v1`. |
| `LLM_MODEL` | No | Model name. Default `gpt-4o-mini`. |
| `LLM_MOCK` | No | Set to `1` to force mock replies even when a key is set. |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` | No | Live Adzuna search. The sample market works without them. |
| `JSEARCH_API_KEY`, `JSEARCH_API_HOST` | No | Live JSearch. Host default `jsearch.p.rapidapi.com`. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | No | Web Push. Without them, reminders stay in the app. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | Same public key as `VAPID_PUBLIC_KEY`. The browser bundle reads this, so it must be present at build time. Redeploy after you change it. |
| `APP_URL` | Recommended | Canonical public URL (your custom domain). Used for Stripe redirects, email links, sitemap and OG tags. Falls back to `AUTH_URL`. |
| `STRIPE_SECRET_KEY` | For payments | `sk_live_...` (or `sk_test_...` on Preview). Without it billing shows "Payments are not configured". Mark Sensitive. |
| `STRIPE_WEBHOOK_SECRET` | For payments | `whsec_...` from the webhook endpoint you create in Stripe. Mark Sensitive. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For payments | `pk_live_...`. Public. |
| `STRIPE_PRICE_MONTHLY` | For payments | Price id for USD 40/month, printed by `npm run stripe:setup`. |
| `STRIPE_PRICE_YEARLY` | For payments | Price id for USD 400/year, printed by `npm run stripe:setup`. |
| `STRIPE_PORTAL_CONFIGURATION` | No | A specific Customer Portal configuration id; default portal settings otherwise. |
| `RESEND_API_KEY` or `SMTP_URL` | Strongly recommended | Sends verification, password-reset and failed-payment emails. Without either, emails are only written to the server log. |
| `EMAIL_FROM` | With email | e.g. `JobPilot AI <no-reply@your-domain.com>`; the domain must be verified with your provider. |
| `SUPPORT_EMAIL`, `LEGAL_ENTITY_NAME` | Recommended | Shown in the footer and the legal pages. |
| `ADMIN_EMAILS` | No | Comma-separated emails that can open `/admin` (users, plans, MRR). |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Recommended | Shared rate limits across serverless instances. Without them limits are per instance (in memory). |
| `ERROR_WEBHOOK_URL` | No | Receives a JSON POST for each server error (Slack/Discord webhook or log collector). |
| `BLOB_READ_WRITE_TOKEN` | No | When set, original resume files go to Vercel Blob. Otherwise they are stored in Postgres. Create a Blob store from the Vercel Storage tab and connect it. The token is created for you. Blob URLs are unlisted but public; the app does not show them. Leave this unset if the file must stay only in the database. |

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Generate production Web Push keys with:

```bash
npx web-push generate-vapid-keys
```

Put the public key in both `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Put the private key in `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to a mailto you control, for example `mailto:you@yourdomain.com`. The keys in `.env.example` are for local demo only.

## Plans, billing and limits

- **Trial decision:** every new account gets **7 days of Pro with no card**, then drops to a **Free tier** instead of being locked out. A no-card trial converts better for a consumer job-search tool (people decide in the first week, while they are actively applying), and falling back to Free keeps their data and tracker usable so they come back to upgrade instead of churning. AI cost is bounded because trial and Free have small monthly AI allowances.
- **Allowances (AI actions per UTC month):** Free 15, Trial 100, Pro 600. Pro-only features: pitch decks, mock interviews, negotiation practice, LinkedIn drafts, outreach and stage drafts. Change them in `src/lib/billing/plans.ts`.
- **Enforcement is server side:** every AI server action calls `aiGate()` (plan feature + monthly quota + 20/min burst limit) and `meteredAi()` (counts usage) in `src/server/billing.ts`. The client shows an upgrade prompt when a gate says no.
- **Stripe:** Checkout in subscription mode with Stripe Tax (`automatic_tax`), promotion codes and tax-id collection (`/api/stripe/checkout`); Customer Portal for plan changes, cancellation, cards and invoices (`/api/stripe/portal`); signature-verified, idempotent webhook (`/api/stripe/webhook`) handling `checkout.session.completed`, `customer.subscription.created|updated|deleted` and `invoice.payment_failed`. Subscription state lives in the `Subscription` table and is only written by the webhook.
- Prices are USD. Stripe Checkout can show local currencies automatically if you enable Adaptive Pricing in the Stripe Dashboard (optional).

## Launch checklist

**Stripe** (do it in test mode first, then repeat in live mode)
1. Create/activate the Stripe account for your company; finish business verification and payouts.
2. `STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup` → copy the printed `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY`.
3. Dashboard → **Tax**: turn on Stripe Tax, set your origin address, and add registrations for the places where you must collect tax (US states, EU OSS, UK, etc.). Checkout uses `automatic_tax`, so it fails until Tax is set up.
4. Dashboard → **Settings → Billing → Customer portal**: enable cancel (at period end), switching between the two Pro prices, payment-method updates and invoice history. Add your Terms and Privacy URLs.
5. Dashboard → **Developers → Webhooks → Add endpoint**: URL `https://<your-domain>/api/stripe/webhook`, events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Optional: **Coupons/Promotion codes** for launch discounts; **Settings → Emails**: turn on receipts and failed-payment emails; enable Smart Retries.
7. Test: card `4242 4242 4242 4242`, then check `/settings/billing` shows Pro and `/admin` shows MRR. `stripe trigger invoice.payment_failed` with the Stripe CLI to test dunning.

**Vercel**
1. Import the GitHub repo, add Neon Postgres (Storage tab).
2. Add the environment variables in the table above. Required for launch: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `APP_URL`, the five `STRIPE_*` values, `RESEND_API_KEY` (or `SMTP_URL`) + `EMAIL_FROM`, `SUPPORT_EMAIL`, `LEGAL_ENTITY_NAME`, `ADMIN_EMAILS`, `LLM_API_KEY`. Leave `SEED_DEMO` unset.
3. Deploy, then open `/api/health`: it should say `"payments":"configured"`, `"webhook":true` and your email mode.

**Domain**
1. Vercel → Settings → Domains → add your domain, set the DNS records, wait for HTTPS.
2. Set `AUTH_URL` and `APP_URL` to `https://<your-domain>` and redeploy; update the Stripe webhook URL and portal links to the domain.
3. Verify the sending domain with Resend (SPF/DKIM) so verification emails do not land in spam.

**Legal and compliance**
1. `/terms`, `/privacy` and `/refund` are **templates marked for legal review**. Have a lawyer adapt them (governing law, refund window, EU withdrawal rights, AI provider, processors list) and remove the template banner in `src/components/marketing/legal-page.tsx`.
2. Sign DPAs with Vercel, Neon, Stripe, your email provider and your AI provider; list them in the Privacy Policy.
3. If you add analytics or ads cookies, replace the essential-only cookie notice with a consent banner.
4. Data rights are self-serve: Settings → **Download my data** (JSON export) and **Delete account** (cancels Stripe, deletes all rows).

**Before announcing**
- Set `LLM_API_KEY` and confirm AI usage limits match your model costs (`src/lib/billing/plans.ts`).
- Set `UPSTASH_REDIS_*` for shared rate limits and `ERROR_WEBHOOK_URL` for alerts.
- Create your own account, verify email, buy Pro in live mode, refund yourself from the Stripe Dashboard.

## Tests

Unit tests cover mock mode, fit scoring, resume score bands, ATS keywords, the weekly plan, intent routing, interview fillers, negotiation scoring, catalog filters, and the draft-only outreach sequence.

Billing tests cover entitlements, quotas and the webhook handler with mocked Stripe events plus a real signature check (`src/lib/billing/*.test.ts`). `src/lib/tenancy.test.ts` statically audits every Prisma query for user scoping. `src/server/tenancy.db.test.ts` runs cross-tenant attacks against a real Postgres when `DATABASE_URL` is set (skipped otherwise).

The Playwright smoke test signs in as the demo user and walks the journey, assistant, tools, tracker and billing page, and checks the public pages and security headers.

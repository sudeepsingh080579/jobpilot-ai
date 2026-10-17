# JobPilot AI — Architecture, gap analysis and status

Branch `india-saas-phase1-2` (from `main` 5ccbf22). Updated 2026-10-13.
Spec: `docs/SPEC.md` (note: sections 4–24 of the original prompt were truncated in transit and must be pasted in by the owner; sections below marked *(interpreted)* follow the summarised requirements).

## Stack
Next.js App Router (PWA: manifest + service worker), TypeScript, Tailwind, Prisma 6 / Postgres (Neon in prod: pooled `DATABASE_URL`, unpooled `DIRECT_URL`), Auth.js credentials, Vercel hosting.

## Billing design (phase 2)
- `src/lib/billing/pricing.ts` — ₹1,999 GST-inclusive total in paise; taxable value ₹1,694.07 and GST ₹304.93 (18%, `GST_RATE_BPS`) derived once; shown before checkout (`GET /api/billing/checkout`, pricing page, billing settings).
- `src/lib/billing/state-machine.ts` — pure state machine: none → trialing → trial_expired → pending_payment → active ⇄ past_due → halted / cancel_scheduled → cancelled. `accessFor()` is the single server-side access decision. One trial per account; duplicate payment ids ignored; non-extending payments rejected; no second concurrent subscription; nothing auto-charges after the trial.
- `src/lib/billing/providers/*` — `BillingProvider` interface; Razorpay adapter (default) and Stripe adapter (`BILLING_PROVIDER=stripe`).
- `src/server/billing-store.ts` — only writer of `BillingAccount`, serializable transaction + optimistic version; `processWebhookEvent` dedupes on `BillingEventLog` id `provider:eventId` and audits from/to state.
- Routes: `POST /api/billing/checkout` (creates Razorpay subscription, returns Checkout.js params), `POST /api/billing/webhook/razorpay` (HMAC over raw body), `POST /api/billing/verify` (checkout signature check only — access is granted solely by the signed webhook).
- Razorpay plan note: Razorpay subscriptions charge the plan amount, so create the plan at ₹1,999 (GST-inclusive) or configure GST via invoices per your CA's advice.

## Onboarding (phase 2)
`/onboarding` 7 steps: Resume → Target roles → Locations → Work style → Experience & pay → Skills & industries → Review. Draft saved on every step (`savePreferences`), completion validated server-side (`src/lib/onboarding/preferences.ts`). Locations: ordered chips, max 10, reorder/remove buttons, remote words rejected as cities; Remote-India and Remote-International are separate flags. Work arrangement and employment type are multi-select checkboxes. New registrations start the trial and land on `/onboarding`.

## Resume storage
Original file stored in Postgres (`Resume.fileData`) by default, downloadable only by its owner via `GET /api/resumes/[id]/file` (`Cache-Control: private, no-store`). Blob storage now needs explicit `RESUME_STORAGE=blob`. Parsing: PDF (unpdf), DOCX (mammoth), TXT → `parseResumeText` heuristics (no AI needed).

## Data model added (migration `india_billing_onboarding`)
`JobPreferences`, `BillingAccount`, `BillingEventLog`, `ConsentRecord`, `User.onboardingStep/onboardingCompletedAt`.

## Status checklist
Legend: ✅ implemented + tested · 🔑 implemented, awaiting credentials · 🟡 partial · ❌ not implemented

| Area | Status | Notes |
|---|---|---|
| Register / login / logout, email verify, password reset | ✅ | existing; e2e in `e2e/` |
| 7-day no-card trial (state machine + DB) | ✅ | unit + Postgres tests |
| ₹1,999 incl. GST price display | ✅ | pricing page, billing settings, API |
| Subscription state machine, server-side access | ✅ | `accessFor`; legacy `getEntitlement` still drives AI gating — switch-over in phase 5 🟡 |
| Razorpay checkout / webhook / signature verify | 🔑 | adapter + routes tested with fakes; needs keys, plan id, webhook secret; Checkout.js button UI not yet wired (phase 5) |
| Idempotent webhook processing | ✅ | concurrent duplicate test against Postgres |
| Stripe provider | 🔑 | existing USD integration, kept as alternate |
| Prisma migrations | ✅ | applied to local Postgres 17 |
| Private resume storage + owner-only download | ✅ | route added; tenancy audit passes |
| Resume parsing (PDF/DOCX/TXT) | ✅ | existing heuristics |
| 7-step onboarding wizard | 🟡 | built, typechecked, validation unit-tested; no e2e browser test yet |
| Locations ≤10 reorderable chips, remote separate | ✅ | logic tested; UI built |
| Multi-select work arrangement / employment type | ✅ | checkboxes |
| DPDP consent ledger | 🟡 | table only; notice/withdraw UI in phase 6 |
| Real job providers (Adzuna, JSearch) | 🔑 | existing adapters; need API keys. Built-in sample catalogue must be labelled demo (phase 3 audit) |
| Explainable match scores | 🟡 | existing scoring; India prefs not yet used (phase 3) |
| Resume studio, career assistant, networking CRM, LinkedIn optimizer, interview prep, salary tool, tracker, analytics, alerts | 🟡 | earlier global build exists; India alignment phases 3–4. Salary tool must not invent figures |
| Admin portal with RBAC + audit log | 🟡 | ADMIN_EMAILS gate only; RBAC phase 6 |
| AI provider | 🔑 | `LLM_API_KEY`; mock mode otherwise |
| Deployment docs | 🟡 | README + launch checklist; Vercel env still missing `DIRECT_URL` |

## Gap analysis → next phases
3. Jobs & matching against `JobPreferences`; label/remove sample jobs. 4. Career tools India alignment. 5. Razorpay UI (Checkout.js), cancel/manage, swap AI gating to `accessFor`, cron reconcile, invoices/GST. 6. RBAC admin, audit, DPDP notices/consent/withdrawal/grievance officer, production readiness.

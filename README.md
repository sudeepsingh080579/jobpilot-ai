# JobPilot AI

A private, installable desk for a mid-career or senior job search. It keeps a niche, a tracker, resume tools, outreach drafts, and interview practice in one place. Drafts stay drafts: nothing is sent to LinkedIn or email for you.

The product name lives in `src/lib/brand.ts`.

## Demo desk

No API keys are required. With `LLM_API_KEY` empty, every writing feature uses the built-in mock.

| | |
| --- | --- |
| Email | `demo@jobpilot.local` |
| Password | `pilot-demo` |

The demo profile is a senior cloud and DevOps leader based in Bengaluru and open to US remote work. Registering creates an empty desk for someone else.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` creates `.env` from `.env.example` if needed, applies the SQLite migration, and seeds the demo user when the database is empty. The app listens on [http://127.0.0.1:41731](http://127.0.0.1:41731).

```bash
npm test          # unit tests
npm run build
npm start         # production server, same port
npm run test:e2e  # Playwright smoke test (starts the production server)
npm run db:reset  # wipe SQLite and reseed
```

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite by default: `file:./dev.db`. See Postgres below. |
| `AUTH_SECRET` | Auth.js signing secret. The example value is for local demo only. |
| `LLM_API_KEY` | Empty means mock mode. Any non-empty key switches to live calls. |
| `LLM_BASE_URL` | OpenAI-compatible base, default `https://api.openai.com/v1`. |
| `LLM_MODEL` | Model name sent as `model`, default `gpt-4o-mini`. |
| `LLM_MOCK` | Set to `1` to force mock replies even when a key is set. |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` | Optional Adzuna job search. |
| `JSEARCH_API_KEY`, `JSEARCH_API_HOST` | Optional JSearch (RapidAPI) job search. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push. Dev keys ship in `.env.example`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same public key, exposed to the browser. |

Live model calls are a single `POST {LLM_BASE_URL}/chat/completions` from `src/lib/ai/index.ts`. Job-board calls live in `src/lib/jobs/providers.ts`. Search always includes an original sample market so the desk works with no board keys.

Generate fresh push keys with `npx web-push generate-vapid-keys` before any shared deployment.

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

Out of scope, with a place to attach them later (`src/lib/extensions.ts`): payments, a browser extension (`POST /api/extensions/jobs` returns 501), LinkedIn sending, camera analysis, and human coaching.

## Install as an app

The production build serves a web manifest and a service worker.

- Android and desktop: open the production site in Chrome or Edge and use Install.
- iOS: Safari → Share → Add to Home Screen.

The service worker caches the app shell and the last dashboard snapshot for offline reading. In `npm run dev` a network-only worker is registered so hot reload stays usable. Installability is meant to be checked against `npm start`.

## Postgres

The Prisma schema uses portable types. The committed migration is SQLite SQL.

1. Change `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`.
2. Point `DATABASE_URL` at the database.
3. Remove `prisma/migrations` and run `npx prisma migrate dev --name init` once against Postgres.
4. Deploy with `npx prisma migrate deploy`.

## Deploy

### Docker

```bash
docker build -t jobpilot .
docker run --rm -p 41731:41731 -v jobpilot-data:/app/data jobpilot
```

The image uses SQLite under `/app/data`. Mount that path if the desk should survive a restart. For a hosted database, switch the schema to Postgres as above and set `DATABASE_URL` at runtime. Replace `AUTH_SECRET` and the VAPID keys.

### Vercel

SQLite on serverless disk will not persist. Use Postgres (Neon or similar), follow the provider switch above, and set the env vars from `.env.example`. Build command:

```bash
prisma generate && prisma migrate deploy && next build
```

`AUTH_SECRET` must be a new value. Leave `LLM_API_KEY` empty to stay in mock mode.

## Tests

Unit tests cover mock mode, fit scoring, resume score bands, ATS keywords, the weekly plan, intent routing, interview fillers, negotiation scoring, catalog filters, and the draft-only outreach sequence.

The Playwright smoke test signs in as the demo user and walks the dashboard, tracker, resume, and assistant.

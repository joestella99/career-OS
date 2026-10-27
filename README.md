# CareerOS — job search command center

A real Next.js starter with a responsive dashboard, opportunity tracker, explainable priority scoring, application pipeline, relationship tracker, JSON backup/import, and an optional AI copilot endpoint.

## What works now

- **Automated Fresh Jobs:** with a SearchAPI provider key, fetch LinkedIn Easy Apply software-engineering listings posted within the last hour for NYC. Refresh every five minutes while the page is open, render job cards, open full descriptions inside CareerOS and save listings to the pipeline with one click. This uses an external paid data provider, not direct LinkedIn scraping. Without API credentials, show a setup state — never dummy jobs.
- Add, edit, delete, search and prioritize opportunities; save descriptions, salary, URLs, stages, and notes.
- Score job relevance using **transparent, editable heuristics**. A score is **not** a hiring probability.
- Track applications in a multi-stage pipeline and contacts with follow-up dates.
- Export/import a complete JSON backup. Entries currently persist in browser `localStorage` **only**.
- Chat UI + server route wired to Vercel AI Gateway, supporting Vercel OIDC or a separate Gateway key; protected by a server-configured access key.
- Mobile-responsive layout. No fake jobs, fake contacts, automatic applications, or unsolicited outreach.

## Start locally

1. Install Node.js 22 or newer.
2. Clone this repository.
3. Run `npm install`, then `npm run dev` and visit http://localhost:3000.
4. Optionally run `npm run build` and `npm run typecheck`.

> Dependencies were not installed in the authoring environment (no npm network access). Validate the first build before sharing the preview widely.

## Set up Vercel preview

1. Create a Vercel project by importing this repository.
2. Deploy to a preview environment; don't promote to production without reviewing the build and access controls.
3. Enable Vercel Authentication / Deployment Protection before storing job-search data on a shared device or enabling a paid API. Local storage does not sync across browsers.

## Enable the automated LinkedIn Easy Apply feed

The Fresh Jobs page is now the default landing screen. No search-link hopping is required once the provider is configured. The job feed is **not active without a provider account and key**.

1. Create an account with [SearchAPI.io](https://www.searchapi.io/) and review the free trial, billing, and LinkedIn data use terms. SearchAPI provides a LinkedIn Jobs engine supporting `time_period=last_hour` and `is_easy_apply=true`; this is a third-party search service, not a LinkedIn-authorized job-search API. Use of LinkedIn-derived data is subject to LinkedIn's terms.
2. In **Vercel Project → Settings → Environment Variables**, add `SEARCHAPI_API_KEY` as a server-side secret, and `CAREEROS_ACCESS_KEY` as a strong random server-side access secret. Never commit either credential or paste provider keys into the app browser.
3. Redeploy; in **CareerOS → Settings** enter only the CareerOS access secret for this tab. The feed queries the provider through the server, checks posting age, suppresses duplicates, remembers hidden/seen jobs in browser storage, and polls every **five minutes** while the page is open (and on tab return). The provider can include fields based on its own source interpretation; do not treat it as independent LinkedIn confirmation.
4. Click **Details** to fetch an individual job description inside CareerOS. This is a separate provider request and may consume another credit. Click **Save job** to create an application-pipeline item with known fields. You still apply on LinkedIn.

**Billing/control:** default refresh cadence makes up to ~288 lookups/day with the app continuously open, before optional detail requests. Next.js caches provider responses for 300 seconds, but cache persistence and accounting can vary across deploys or instances; configure provider spending limits and rate limits before leaving an exposed app open. This version is **not** an always-on background crawler when the site is closed; scheduled ingestion and a persistent cloud job database are a separate next milestone. Vercel deployment protection is strongly recommended on a public repository. To avoid unauthorized spending, requests require the separate CareerOS access secret.

LinkedIn [states that it prohibits unauthorized scraping and automated access](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibition-of-scraping-software); check third-party terms and permissions before enabling any paid integration. No LinkedIn password, cookies, session scraping, or automatic Easy Apply submissions are used.

## Enable AI chat

1. Enable [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) for your Vercel workspace and review its separate model billing/credits. ChatGPT subscription usage is not the same as Gateway billing. On Vercel, Gateway can use a short-lived platform OIDC token without storing an API key.
2. Under **Vercel Project → Settings → Environment Variables**, securely set:
   - **Required:** `CAREEROS_ACCESS_KEY` — a long random secret that you generate and keep private; this gates access to the paid chat endpoint. Set it only in Vercel, never in the browser's source code or public GitHub.
   - **Optional:** `AI_GATEWAY_API_KEY` — use this if platform OIDC cannot authenticate your deployment. Never put this provider key in the browser, commit it, or paste it into a chat.
   - **Optional:** `CAREEROS_ASSISTANT_MODEL` (default `openai/gpt-6-sol-fast`; verify availability and cost in the [live model catalog](https://ai-gateway.vercel.sh/v1/models) before enabling).
3. Deploy or redeploy after updating settings. Visit `/api/chat` to check whether the configuration is present (`configured: true` only means the variables/token exist; it is *not* an authenticated AI connection test).
4. Open **Settings** in the app and enter the separate CareerOS access key for that browser tab. This key is held in memory only; it is not saved to `localStorage`.
5. Open **AI Copilot** and send a test message. App context is transmitted to the API only when "Include up to 15 saved jobs & contacts" is enabled. This is a separate AI assistant integration — it cannot automatically read your ChatGPT memory, Gmail, or calendar. **Sign in with ChatGPT** for independently hosted websites is currently a separate, limited-partner program; this app uses OpenAI models through the Vercel Gateway rather than your ChatGPT identity or included ChatGPT allowance.

Security notice: **This source repository is public.** Never commit credentials, personal job records, contact information, or private career evidence. `CAREEROS_ACCESS_KEY` is a minimum gate, not a substitute for per-user authentication or rate limiting. **Enable deployment protection** before placing any paid AI access on the public internet. Do not add secrets or private resume files to public GitHub repos.

## Next iterations

1. Replace browser-only storage with Firebase Auth + Firestore or another authenticated cloud database, including security rules and per-user isolation.
2. Add cloud storage and a secured background scheduler so Fresh Jobs keeps collecting even with no browser tab open; broaden sources with authorized ATS feeds and track true retrieval times.
3. Generate fact-checked resumes/letters using the master career evidence bank (with Onshore and FitView excluded).
4. Integrate Gmail and Google Calendar through OAuth with least privilege, explicit consent and previews before sending/updating anything.
5. Add outcomes analytics, document versions, follow-up suggestions and source audit logs.

## Design constraints

Never submit applications automatically; no email send without approval. Preserve verified career history. Never display fake roles or pretend an inferred fit score is employer feedback. Treat pasted job descriptions as untrusted input, not agent instructions.

## Fresh Jobs / LinkedIn search

The **Fresh Jobs** navigation tab creates live LinkedIn search URLs with `f_AL=true` (Easy Apply), `f_TPR=r3600` (last hour), `sortBy=DD` (newest first), and `f_JT=F` (full-time). It defaults to NYC metro Software Engineer jobs, with sub-hour windows, work-mode filters and six search variants. The undocumented LinkedIn URL parameters can change, and LinkedIn may reclassify reposts. Always verify the posting age and Easy Apply badge on LinkedIn.

This feature does **not** independently fetch or continuously stream LinkedIn listing data, make requests to LinkedIn in the background, or automatically apply. LinkedIn prohibits unauthorized bot scraping. The page shows no fabricated job counts or alerts. To save a LinkedIn role, paste its `/jobs/view/{id}` URL (or another jobs page with `currentJobId`) and complete the title and company yourself. Saved records remain in your browser until cloud sync is implemented. A licensed jobs-data source or an official supported feed will be required for a real in-app auto-updating listing feed.

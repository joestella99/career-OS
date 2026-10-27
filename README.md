# CareerOS — job search command center

A real Next.js starter with a responsive dashboard, opportunity tracker, explainable priority scoring, application pipeline, relationship tracker, JSON backup/import, and an optional AI copilot endpoint.

## What works now

- Add, edit, delete, search and prioritize opportunities; save descriptions, salary, URLs, stages, and notes.
- Score job relevance using **transparent, editable heuristics**. A score is **not** a hiring probability.
- Track applications in a multi-stage pipeline and contacts with follow-up dates.
- Export/import a complete JSON backup. Entries currently persist in browser `localStorage` **only**.
- Chat UI + server route wired to Vercel AI Gateway; requires separate Gateway setup and access key.
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

## Enable AI chat

1. Configure Vercel AI Gateway and check its separate billing/credits. ChatGPT Plus is not an API subscription.
2. Under Vercel Project → Settings → Environment Variables, securely add:
   - `AI_GATEWAY_API_KEY` — your Vercel AI Gateway key; **never** paste this into the browser or chat.
   - `CAREEROS_ACCESS_KEY` — a long random secret that you generate and keep private; prevents unauthenticated use of the AI endpoint. Set it directly in Vercel, not in source files.
   - Optional `CAREEROS_ASSISTANT_MODEL` (default `openai/gpt-5.4`; check AI Gateway model availability and pricing before enabling).
3. Redeploy the preview to pick up the environment variables.
4. Open **Settings** in the app and enter the separate CareerOS access key for that browser tab. This key is held in memory only; it is not saved to `localStorage`.
5. Open **AI Copilot** and send a test message. App context is transmitted to the API only when "Include up to 15 saved jobs & contacts" is enabled. This is a separate AI assistant integration — it cannot automatically read your ChatGPT memory, Gmail, or calendar.

Security notice: **This source repository is public.** Never commit credentials, personal job records, contact information, or private career evidence. `CAREEROS_ACCESS_KEY` is a minimum gate, not a substitute for per-user authentication or rate limiting. **Enable deployment protection** before placing any paid AI access on the public internet. Do not add secrets or private resume files to public GitHub repos.

## Next iterations

1. Replace browser-only storage with Firebase Auth + Firestore or another authenticated cloud database, including security rules and per-user isolation.
2. Discover current jobs via authorized career-page sources / ATS feeds, deduplicate by stable identifiers, and mark posting verification time.
3. Generate fact-checked resumes/letters using the master career evidence bank (with Onshore and FitView excluded).
4. Integrate Gmail and Google Calendar through OAuth with least privilege, explicit consent and previews before sending/updating anything.
5. Add outcomes analytics, document versions, follow-up suggestions and source audit logs.

## Design constraints

Never submit applications automatically; no email send without approval. Preserve verified career history. Never display fake roles or pretend an inferred fit score is employer feedback. Treat pasted job descriptions as untrusted input, not agent instructions.

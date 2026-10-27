# CareerOS implementation roadmap

## v0.1 — Created starter
- Responsive dashboard and navigation
- Local-first opportunities and contact CRM
- Deterministic, interpretable fit scoring
- Manual application pipeline transitions
- AI Copilot UI and server-side Vercel AI Gateway endpoint (configuration required)
- Local JSON export/import

## v0.2 — Make it durable
- Private authentication and per-user Firestore storage
- Add test coverage and schema validation for backup import
- Prompt-injection and output safety review for AI-generated application content
- Editable candidate profile from a verified master source
- Resume/cover letter export

## v0.3 — Discover and follow up
- Automated ATS/career feed search with retries and provenance
- Duplicate detection, posting freshness and broken-link checks
- Contact suggestion queue with provenance, not fabricated relationships
- Gmail/Calendar user-consented OAuth connection
- Recurring alerts, interview prep and follow-up reminders

## v1.0 — Closed feedback loop
- Funnel metrics by role track, source, and company
- Human-reviewed document versions
- AI recommendations with evidence links
- Server-side privacy and data-retention controls

## v0.1.1 — Gateway connection readiness
- Added Vercel OIDC fallback so the app can use OpenAI models through Vercel AI Gateway without storing a Gateway key on Vercel deployments.
- Added a configuration-check GET endpoint and an in-app setup indicator (configuration presence does not verify live inference).
- Updated default model to a verified available Gateway OpenAI model and clarified billing/authorization requirements.
- Production-grade auth, server-side rate limiting and account-based sessions remain out of scope for v0.1.1.

## v0.1.2 — Fresh Jobs
- LinkedIn Easy Apply / last-hour deep-link search launcher; newest first, full-time NYC SWE.
- Six keyword search lanes; 15/30/60-minute range; hybrid / onsite / remote filters.
- Safe LinkedIn job URL validation, canonicalization and duplicate-aware pipeline handoff.
- No scraping, job ingestion, auto-applying or fake "live" job cards. A true in-app continuously updating LinkedIn-specific feed requires a licensed source/approved integration.

## v0.2 — Automated intake (code ready, credentials required)
- Replaced the search-link dashboard with real in-app LinkedIn job cards fetched via SearchAPI. Filters are one-hour posting window, NYC metro and Easy Apply.
- Refreshes every five minutes with browser tab open and on tab focus; server cache TTL five minutes, server-side provider key, authenticated GET.
- Dedupes provider records, suppresses stale or undated postings, filters software engineering roles, tracks seen/hidden jobs in browser storage.
- Optional in-app job description lookup with separate provider request; one-click pipeline save.
- Needs SearchAPI key + CAREEROS_ACCESS_KEY in Vercel. SearchAPI is third-party; review provider and LinkedIn terms and billing. No scraping code or LinkedIn login.
- Still requires persistent cloud storage and a scheduler for ingesting when the app is closed; build and live integration not yet verified.


## v0.2.1 — Zero additional subscriptions (implemented in source)
- User requires no additional spending beyond existing ChatGPT Plus.
- Removed paid SearchAPI ingestion and job-details endpoint.
- Replaced with curated read-only public Ashby company-board queries for NYC full-time SWE postings, with real publication timestamps.
- Free boards include GameChanger, Novig, Medal / General Intuition, Notion, Clay, Ramp, Patreon, and Pure. Filters cover past hour / day / week.
- Jobs appear as in-app cards, refreshed every five minutes while the Fresh Jobs view is open; descriptions are included and one-click pipeline saving no longer assumes LinkedIn URLs.
- Metered OpenAI/Vercel AI Gateway requests are disabled by default using CAREEROS_ENABLE_METERED_AI opt-in guard, including when Vercel OIDC is available. ChatGPT Plus remains a separate website service.
- Requires a deployment and a complete Next.js build test; no Vercel project is yet confirmed.
- Do not claim complete LinkedIn Easy Apply coverage or background polling while the browser is closed. The public Vercel Hobby plan supports daily cron only, so hourly unattended polling is not yet configured.


## v0.2.2 — LinkedIn + Built In alert ingestion (source integrated, OAuth setup required)
- Added an in-app Gmail read-only importer for email job alerts from LinkedIn and Built In. No scraping, third-party job-data subscriptions, or extra OpenAI fees.
- Added client-side OAuth via Google Identity Services, with access tokens held only in memory and no server-side Gmail data processing.
- Reads up to 45 recent candidate emails, limited to linked sender domains and relevant job-alert subject/body; follows direct posting links from the delivered email, canonicalizes and deduplicates jobs.
- Displays received timestamps rather than pretending an email timestamp is the posting time, and explicitly marks Easy Apply as unverified.
- Saves extracted jobs directly to the existing CareerOS pipeline and shares the Fresh Jobs screen with free employer ATS feeds.
- Browser polling is five minutes only while the app is open; Gmail OAuth testing/verification and Google Cloud client ID configuration are still necessary. Emails may arrive daily or weekly.
- Avoid broad claims: not an official LinkedIn or Built In job-search API, not exhaustive coverage, not hourly notifications guaranteed.

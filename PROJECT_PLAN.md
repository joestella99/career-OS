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

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

## v0.1.1 — OpenAI model connection readiness
- Added Vercel-issued OIDC credential fallback to the existing AI Gateway route, keeping API keys off the public repository.
- Added a GET configuration check and a setup indicator in the Copilot UI; the indicator does not attest to successful model inference.
- Updated the verified model default and deployment/credential guidance.
- Live AI tests are pending a Vercel project and securely configured access control; the complete Next.js build has not been verified.

# CareerOS 2.0 — rebuild decisions

**Date:** October 27, 2026.

## Product principle
The user asked for a powerful, **free, search-first job engine**, not an application dashboard. The primary output is a ranked queue of actual open jobs and evidence-backed reasons to apply.

## Boundaries
- Focus: NYC metro onsite/hybrid and US-eligible remote.
- Role tracks: software engineering, solutions/implementation engineering and associate product roles.
- Sector interest: sports/fitness is a soft preference, not a license to rank unqualified jobs higher.
- Default: exclude significant seniority, minimum tenure and location mismatches.
- No invented interview probabilities. Fit priority uses published job requirements and verified career facts.
- No additional paid data subscriptions or new OpenAI API costs.
- No unauthorized LinkedIn or Built In scraping. Public ATS data is the primary job inventory.
- No private career files, personal contact details, Onshore or FitView in the public app.

## Rebuilt components
- `lib/engine/profile.ts`: public non-sensitive verified candidate evidence and types.
- `lib/engine/rank.ts`: explainable fit analysis and hard eligibility ceilings.
- `lib/engine/sources.ts`: public Ashby/Greenhouse/Lever/Himalayas source aggregators.
- `app/api/search/route.ts`: server endpoint that reports source availability and real jobs.
- `app/page.tsx`, `app/globals.css`: search first, role chips, criteria, results, match explanations, shortlist, mobile UI.
- `tests/ranking.test.cjs`: deterministic career-fit regression tests.
- `scripts/probe-discovery.cjs`: actual end-to-end live search verification.
- `.github/workflows/verify.yml`: CI gates.

## Success conditions
1. GitHub Actions typecheck, deterministic tests and production build pass.
2. The end-to-end live test returns actual normalized jobs and HTTPS apply links.
3. Senior and 5+ year roles do not score as strong interview targets.
4. The UI never claims a statistical interview probability.
5. No paid-key setup screens or application-dashboard front page.
6. Vercel Hobby deployment is separately verified before calling it live.

## Deliberate limitations
- The catalog is not exhaustive and can lose individual employer boards.
- Free sources refresh on different cadences.
- No unattended 24/7 collection, login, cross-device sync or LinkedIn Easy Apply automation.
- Saved shortlist is local-only, not a cloud database.

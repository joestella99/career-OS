# CareerOS — a search engine for jobs worth applying to

**Search first, not an application dashboard.** CareerOS is a free, responsive Next.js job-search experience tailored to a verified early-career NYC developer with client/implementation and product-building experience. It retrieves real openings, explains why each is a plausible interview target, and lets you shortlist roles immediately.

## Product

- **Unified live search:** server fetches read-only public Greenhouse and Ashby employer ATS feeds plus [Himalayas](https://himalayas.app/docs/remote-jobs-api) remote job search. No paid keys, subscriptions, web scraping, LinkedIn sessions, or fake postings. A curated catalog of **19 verified employer feeds plus three remote queries** is attempted; some board identifiers may change or return no jobs.
- **Three career tracks:** software engineering, solutions/implementation engineering, and associate product/APM. NYC and US-eligible remote jobs are prioritized. Roles can be filtered by track, geography, 3/7/30 days or any date, source, and a search phrase.
- **Evidence-based interview-fit score, not an interview probability.** A transparent, deterministic 0–100 heuristic weighs relevance to actual FIDx automation/tooling, client requirements and demos, Our Money App / BatOracle projects, technologies, graduation-era experience, location, and realistic seniority. Lists reasons to pursue and gaps to verify. Strong/Groundwork/Stretch tags are not employer judgments. A measurable hiring-probability model would require sufficient application/interview outcomes and a calibration/holdout evaluation.
- **Search-results-first experience:** ranking and filters dominate. Expanded details include full source description, salary if exposed, time attribution and verified original apply link.
- **Shortlist:** save or unsave jobs without leaving the search screen. Stored in browser localStorage only; no accounts or cloud syncing yet.
- **No paid OpenAI integration.** ChatGPT Plus is separate from OpenAI's metered APIs. A previous metered AI endpoint was removed entirely.

## What the October 27 integration tests proved

GitHub Actions now tests public-source connectivity **and executes the real discovery/ranking pipeline**, not just the Next.js build. In the last full clean run, 22/22 active source requests succeeded and 269 qualifying jobs were returned from Ashby, Greenhouse and Himalayas. Live results vary as employers change listings.

The tests also caught and fixed an important scoring defect: senior positions such as "Senior Software Engineer I" and non-engineering enablement roles had incorrectly surfaced as exceptional matches. Senior-title jobs and listings requiring five or more years are now always capped as stretch fits, and non-NYC regional remote sales territories are flagged. These scores remain transparent heuristics, never hiring probabilities.

If your website is not deploying, check the Vercel project separately: **passing GitHub Actions does not prove a Vercel deployment exists or is accessible**.

## Data coverage and freshness

- **Ashby:** official public postings with `publishedAt` = most recent publication time, description and optional compensation. API documentation: https://developers.ashbyhq.com/docs/public-job-posting-api
- **Greenhouse:** official public employer listings with `updated_at` = update time, not necessarily the original posting time. Listing and description require no authentication: https://docs.greenhouse.io/job-board.html
- **Himalayas:** free remote job search, no API key required. API data refreshes **daily**, so don't treat it as a minute-by-minute live stream. CareerOS displays required Himalayas source credit and retains their original `applicationLink`. https://himalayas.app/docs/remote-jobs-api

Employer feeds are refreshed on a best-effort basis using a 15-minute server data cache. The browser requests results on opening, at 15-minute intervals while the app is open, and when you return to the tab. **This is not unattended 24/7 ingestion, exhaustive NYC hiring coverage, or a LinkedIn Easy Apply feed.** Some sources may be unavailable. The UI marks partial coverage rather than inventing counts.

A previous experimental LinkedIn / Built In Gmail alert importer remains in the repository as an **unused optional module**, pending Google OAuth setup and appropriate privacy review. It is intentionally excluded from fit rankings because email arrival time, posting age, Easy Apply status and complete requirements often cannot be verified.

## Career evidence / privacy

The ranking model uses verified career facts, not artificial personal metrics: FIDx application development, test automation leadership, client requirements/demos, a Temple CS bachelor's degree, full-stack skills and independently built products. It does not represent Onshore or FitView as job history or projects. No phone number, email, home address or private resume files are included in the search source.

Jobs are never submitted automatically, and the app does not impersonate the user or collect private ATS credentials.

## Run and test

Requirements: Node.js 22+.

```bash
npm install
npm run typecheck
node tests/ranking.test.cjs
npm run build
npm run dev
```

GitHub Actions runs a type check, ranking regression tests, and a production build on every push to main. A successful CI build does **not** verify all external employer APIs at runtime; source coverage is reported during use.

## Deploy free on Vercel

Import `https://github.com/joestella99/career-OS` as a Next.js app into your **personal Vercel Hobby** workspace. No environment variables or payment integrations are necessary. The authenticated Vercel connector previously did not have permission to create this project; verify that your Vercel dashboard actually shows it before claiming the website is live.

The GitHub repository is public. Do not commit credentials, private career documents, or personal information. Vercel Hobby usage limits apply, and its cron scheduler does not support every-minute/hourly scheduled jobs. The browser-initiated search works without cron.

## Roadmap that matters

1. Expand and verify employer ATS catalog; use reliable direct-source availability checks, retries, and incremental cache.
2. Add salary-range extraction and user-adjustable weights, but keep qualifications as the dominant priority.
3. Add voluntary outcomes ("applied", "screen", "interview") with local export and **calibrate only after there is enough data**, showing uncertainty honestly.
4. Add optional LinkedIn/Built In email signals after privacy review, keeping them separate from verified employer postings.
5. Evaluate zero-additional-fee cloud storage / scheduling within free quotas without compromising source rate limits or privacy.

## Source terms

Employer and remote-feed data should be attributed and read under their published terms. No automatic job applications, unauthorized LinkedIn scraping or paid SearchAPI services are used.

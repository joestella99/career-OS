# CareerOS 2.0 — the free job-search engine

**Completely rebuilt on October 27, 2026.** CareerOS is no longer an application-management dashboard. Open the app and search actual NYC-metro and US-eligible remote jobs, ordered by **realistic qualification fit** to the candidate's career evidence. No extra AI subscription, paid job-data account, or API key is necessary.

## What it does

- **One search surface:** fast text search across real jobs; software engineering, solutions/implementation and associate product career lanes. Source descriptions are readable directly in the app.
- **Personalized match intelligence:** rule-based qualification checks use the supplied career-evidence master. They distinguish professional work from personal projects and penalize senior roles, unrealistic minimum tenure, unclear locations, and non-NYC sales territories.
- **Transparent score, not made-up interview odds:** every score has explicit strengths and cautions. There is *no statistical probability of receiving an interview* until a sufficient number of actual applications/outcomes can be calibrated.
- **Direct applications:** original employer or Himalayas-provided application URL. Jobs are never auto-applied to.
- **Instant search controls:** role lane, full-text search, NYC/hybrid or US remote, published or updated date, only-realistic targets, sorting by fit/newest/sports, and saved jobs.
- **Saved jobs:** browser-local shortlist. No cloud database, signup, user accounts, or tracking of your personal contacts. Browser storage may not follow you to another device.
- **Honest source coverage:** show exactly how many free feeds responded; failed feeds never become fabricated postings. Refresh every 10 minutes while open and upon tab return.

### Candidate evidence that powers ranking

B.S. Computer Science from Temple University (December 2024); FIDx full-stack application development, company-wide automation initiative, client discovery/requirements and demos, mentoring; verified TypeScript/Python/Java/C#/SQL and related projects; Our Money App, BatOracle and sports-domain work. No other employment is invented. The profile source has no private phone, home address, personal email or resume attachments.

## Search infrastructure and costs

**No metered subscriptions.** Server-side read-only calls to:

- [Ashby public postings API](https://developers.ashbyhq.com/docs/public-job-posting-api) for selected employers, including GameChanger, Novig, Notion, Clay and Ramp
- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html) for selected employers, including SeatGeek, Figma, Datadog and Robinhood
- [Lever Postings API](https://github.com/lever/postings-api) for Palantir, ION/Lab49 and Canary Technologies (board availability can change)
- [Himalayas Remote Jobs API](https://himalayas.app/docs/remote-jobs-api) for several remote categories. **Visible Himalayas attribution is provided**, and every Himalayas application retains its original `applicationLink`. Its results refresh daily at the provider.

Employer job postings are from current public feeds. Ashby's `publishedAt` and Lever's `createdAt` are labeled as publication dates. Greenhouse uses `first_published` when present, otherwise `updated_at` is labeled **updated**. Himalayas `pubDate` means updated. We do not claim minute-by-minute new jobs if the source only refreshes daily.

**LinkedIn and Built In are not direct feeds here.** There is no legitimate general-purpose free public API from those services that meets this specification. The old Gmail importer and link-launcher have been removed from the live product. Listings also posted on those services can still appear when the employer exposes them through the ATS providers above. No unauthorized scraping, account cookies, paid scraping proxy, or misleading "LinkedIn Easy Apply" badge is used.

The source catalog is curated and not exhaustive. A role may close between checks. Server/platform usage remains subject to the included limits of your hosting provider; no billing or upgrade is enabled in source code.

## Running locally

Requires Node.js 22.

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Open http://localhost:3000. No `.env` file is required. Node API fetches use HTTPS and incremental caching.

## Release and validation

GitHub Actions verifies TypeScript, the regression suite, the Next.js production build, and a **real end-to-end search against the public feeds** on every push to `main`. External providers occasionally fail; check the source breakdown rather than assuming a TypeScript build proves they are returning jobs.

- Source: https://github.com/joestella99/career-OS
- CI: https://github.com/joestella99/career-OS/actions

### Deploy to free Vercel Hobby

Import the repo into a personal Vercel Hobby project at https://vercel.com/new. Framework: Next.js, Root: `./`, Node: 22. No environment variables or API key required. The Vercel connector previously had no permission to create the project automatically; GitHub CI success does not imply a working Vercel site.

## Safety and privacy

The repo is public. Do not commit personal resumes, contact data, private client materials or keys. Saved jobs are stored locally. No external LLM requests. Match scores are simple, explainable *application priorities*—not guaranteed interviews or trained predictions.

## Next steps after verifying the live app

Expand **verified** employers and free ATS sources; improve minimum-qualification extraction using real labels; implement optional outreach signals without inventing relationships; collect voluntary application/interview outcomes to *eventually* calibrate a predictive model. Do not turn this back into a pipeline dashboard.

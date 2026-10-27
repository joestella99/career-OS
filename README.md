# CareerOS — free job-search command center

CareerOS is a Next.js personal job search app. The **Fresh Jobs** screen automatically reads current software engineering openings from selected employers' publicly accessible career-board endpoints. It does not require an additional job-data subscription, AI API key, or LinkedIn sign-in.

## What's included

- **Free Fresh Jobs:** automatically checks 8 public Ashby employer job boards (GameChanger, Novig, Medal / General Intuition, Notion, Clay, Ramp, Patreon, Pure).
- Shows real NYC-area full-time engineering jobs with employer-provided last-published timestamps, title, location, compensation when available, description, and a direct application link.
- Filters by last **hour** (default), **24 hours**, or **7 days**. Checks again every five minutes while the Fresh Jobs screen is open and when the browser tab becomes visible. No paid provider calls or fake job cards.
- Save a posting directly into the application pipeline; mark as seen, dismiss, search, and exclude senior roles.
- Track opportunities, stages, people, and follow-ups with local browser storage and JSON backup/export.
- Match scoring is a **heuristic**, not a hiring probability.

**Important:** The free feed is **not LinkedIn Easy Apply** and does **not** cover all of LinkedIn or all NYC employers. Job publication time is the date most recently published by the employer's ATS; employers may republish existing jobs. This is the best honest zero-additional-fee automated version—not a claim to capture every last-hour LinkedIn opening.

The public Ashby API documentation is at https://developers.ashbyhq.com/docs/public-job-posting-api . Respect source availability and published job-board terms.

## Keeping cost at zero

- **No SearchAPI subscription:** its integration and extra chargeable job-details route have been removed.
- **AI is disabled by default:** `/api/chat` refuses metered requests unless an explicit environment opt-in is enabled. Your ChatGPT Plus subscription does **not** cover OpenAI API or Vercel Gateway charges in this independently hosted web app. Use ChatGPT separately for free within your existing plan.
- **Hosting:** Vercel Hobby is a free personal-project option, subject to its included usage and terms. Choose the Hobby plan if you don't want a paid Vercel plan. No payment integrations are configured by this source.
- **No extra credentials:** public job-board reads work without API keys. `.env.example` contains no credentials.

## Local development

1. Install Node.js 22 or newer.
2. Run `npm install`, then `npm run dev`; open http://localhost:3000 .
3. Run `npm run build` and `npm run typecheck`.

**Validation note:** The editing environment could not install npm packages; a complete Next.js production build remains unverified until a deployment or local install. Source changes require that check.

## Deploying on Vercel Hobby

1. Import https://github.com/joestella99/career-OS into Vercel's **Hobby** workspace as a Next.js project.
2. No job-data environment variables are needed. Do **not** enable any paid AI integration. Leave `CAREEROS_ENABLE_METERED_AI` unset or set to `false`.
3. Deploy and open **Fresh Jobs**. If you see no last-hour jobs, expand the time window to 24 hours or 7 days.
4. Test saving a job and exporting your pipeline data in Settings. Entries are **browser-only** until we add authenticated cloud sync.

## Limitations

- Refresh happens only while this app's Fresh Jobs view is open; it is **not** a server-side always-on crawler, and no cloud job database is configured.
- On Vercel Hobby, Cron Jobs cannot run more often than once a day. Building reliable all-day ingestion every few minutes while the site is closed would require a different free scheduler/storage architecture or higher-tier hosting; no such service is enabled.
- A direct employer application may take you to the employer's ATS. Applications aren't submitted automatically.
- Some public boards may be temporarily unavailable. Partial sources are shown transparently; no placeholder results are invented.
- The GitHub repository is public. Never commit resumes, private notes, credentials, or any other personal records.
- The AI Copilot navigation remains available as a placeholder, but paid requests are **explicitly disabled** by default to avoid spending more.

## Future work with no extra subscriptions

- Broaden coverage to additional public ATS feeds with source-level timestamps and rate-limited reads.
- Add secure Firebase Auth and Firestore only after reviewing usage and free quotas.
- Evaluate a free scheduled collection method with documented rate limits, without requiring upgrades or paid API plans.
- Keep ChatGPT workflows available through your existing ChatGPT account instead of silently activating metered model traffic.

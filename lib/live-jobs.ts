/** SearchAPI's LinkedIn engine supplies the listing and Easy Apply filters.
 * We never scrape LinkedIn directly or invent jobs when the provider is unavailable.
 */
export type LiveJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  postedLabel: string;
  postedMinutes: number | null;
  url: string;
  collectedAt: string;
  easyApply: true;
  source: 'SearchAPI / LinkedIn';
};

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const ROLE = /\b(software|full[ -]?stack|front[ -]?end|back[ -]?end|web|application|react|typescript|python|java|\.net)\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(software|full[ -]?stack|front[ -]?end|back[ -]?end|web|application|react|typescript|python|java|\.net)\b/i;

export function minutesSincePosted(label: string): number | null {
  const v = label.toLowerCase().trim();
  if (/^(just now|now|moments? ago|less than a minute ago)$/.test(v)) return 0;
  const min = v.match(/(\d+)\s*(min(?:ute)?s?|m)\s*ago\b/);
  if(min) return Number(min[1]);
  const hour = v.match(/(\d+)\s*(hours?|hrs?|h)\s*ago\b/);
  if(hour) return Number(hour[1])*60;
  if (/^(an|a) hour ago$/.test(v)) return 60;
  return null; // date-only and unknown relative timestamps are not evidence of <1 hour
}

export function normalizeLiveJobs(input: unknown, collectedAt: string): LiveJob[] {
  if (!input || typeof input !== 'object' || !('jobs' in input)) return [];
  const rows = (input as {jobs?:unknown}).jobs;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const found:LiveJob[] = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const id = String(raw.job_id ?? '');
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const company = typeof raw.company_name === 'string' ? raw.company_name.trim() : '';
    const location = typeof raw.location === 'string' ? raw.location.trim() : '';
    const postedLabel = typeof raw.posted_at === 'string' ? raw.posted_at.trim() : '';
    const postedMinutes = minutesSincePosted(postedLabel);
    // Strictly avoid putting stale or unverified entries into a "past hour" feed.
    if (!/^\d{7,}$/.test(id) || !title || !company || !ROLE.test(title) || seen.has(id)) continue;
    if (postedMinutes === null || postedMinutes > 60) continue;
    if (raw.is_easy_apply === false) continue;
    const url = `https://www.linkedin.com/jobs/view/${id}/`;
    seen.add(id);
    found.push({id,title:title.slice(0,180),company:company.slice(0,140),location:location.slice(0,160),postedLabel,postedMinutes,url,collectedAt,easyApply:true,source:'SearchAPI / LinkedIn'});
  }
  return found.sort((a,b)=>(a.postedMinutes??60)-(b.postedMinutes??60));
}

export function buildSearchApiUrl(): string {
  const url=new URL('https://www.searchapi.io/api/v1/search');
  url.searchParams.set('engine','linkedin_jobs');
  url.searchParams.set('q','software engineer');
  url.searchParams.set('location','New York City Metropolitan Area');
  url.searchParams.set('time_period','last_hour');
  url.searchParams.set('is_easy_apply','true');
  url.searchParams.set('page','1');
  return url.toString();
}

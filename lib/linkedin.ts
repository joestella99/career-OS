/** LinkedIn job-search URL helpers. Never fetches, crawls or automates LinkedIn. */
export const LINKEDIN_PRESETS = [
  { label: "Software Engineer", keyword: "Software Engineer", detail: "General software engineering" },
  { label: "Junior / Entry SWE", keyword: "Junior Software Engineer", detail: "Early-career openings" },
  { label: "Full Stack Engineer", keyword: "Full Stack Engineer", detail: "Product and web development" },
  { label: "Backend Engineer", keyword: "Backend Engineer", detail: "APIs, Python and services" },
  { label: "Frontend Engineer", keyword: "Frontend Engineer", detail: "TypeScript and React work" },
  { label: "Software Developer", keyword: "Software Developer", detail: "Alternative employer job titles" },
] as const;

export type LinkedInWorkMode = "all" | "hybrid" | "onsite" | "remote";
export type LinkedInTimeWindow = 900 | 1800 | 3600;
export type LinkedInSearchOptions = {
  keywords: string;
  location: string;
  timeSeconds: LinkedInTimeWindow;
  workMode: LinkedInWorkMode;
  earlyCareer: boolean;
};

export function buildLinkedInSearchUrl(options: LinkedInSearchOptions): string {
  const params = new URLSearchParams();
  params.set("keywords", options.keywords.trim() || "Software Engineer");
  params.set("location", options.location.trim() || "New York City Metropolitan Area");
  params.set("f_AL", "true"); // Easy Apply (undocumented LinkedIn filter; may change)
  params.set("f_TPR", `r${options.timeSeconds}`);
  params.set("sortBy", "DD"); // most recent first
  params.set("f_JT", "F"); // full-time
  if (options.workMode !== "all") {
    params.set("f_WT", {hybrid:"3", onsite:"1", remote:"2"}[options.workMode]);
  }
  if (options.earlyCareer) params.set("f_E", "2,3"); // entry-level and associate
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

/** Accept only recognizable LinkedIn job links; never open untrusted domains. */
export function canonicalLinkedInJobUrl(raw: string): string | null {
  try {
    const value = new URL(raw.trim());
    if (value.protocol !== "https:" || !["linkedin.com", "www.linkedin.com"].includes(value.hostname.toLowerCase())) return null;
    if (!value.pathname.startsWith("/jobs/")) return null;
    const idFromPath = value.pathname.match(/\/jobs\/view\/(?:[^/?#]*?-)?(\d{7,})\/?$/)?.[1];
    const idFromQuery = value.searchParams.get("currentJobId") || value.searchParams.get("jobId");
    const id = idFromPath || (idFromQuery && /^\d{7,}$/.test(idFromQuery) ? idFromQuery : null);
    return id ? `https://www.linkedin.com/jobs/view/${id}/` : null;
  } catch { return null; }
}

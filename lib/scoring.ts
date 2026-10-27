import type {Job} from "./types";

// Explainable heuristic, NOT a hiring probability, ATS score, or employer prediction.
export type FitResult = { score: number; reasons: string[]; flags: string[]; focus: string };
const has = (s: string, words: string[]) => words.some(w => s.includes(w));

export function scoreJob(job: Job): FitResult {
  const body = `${job.title} ${job.description}`.toLowerCase();
  const location = `${job.location} ${job.workMode}`.toLowerCase();
  let score = 30;
  const reasons: string[] = [];
  const flags: string[] = [];
  const isSports = has(body + " " + job.company.toLowerCase(), ["sports", "athlete", "fitness", "baseball", "football", "league", "nba", "nfl", "mlb", "fan engagement", "wearable", "training"]);
  if (isSports) { score += 18; reasons.push("Sports / fitness domain alignment"); }
  if (has(body, ["solutions engineer", "implementation engineer", "technical account", "sales engineer", "customer engineer"])) {
    score += 20; reasons.push("Connects technical delivery with client collaboration");
  } else if (has(body, ["associate product", "product manager", "technical product", "product owner"])) {
    score += 18; reasons.push("Aligned with product ownership and discovery");
  } else if (has(body, ["software engineer", "software developer", "full stack", "full-stack", "application developer"])) {
    score += 16; reasons.push("Matches hands-on software engineering background");
  }
  if (has(body, ["typescript", "python", "react", "sql", "c#", ".net", "rest api", "playwright", "selenium", "automation"])) {
    score += 14; reasons.push("Mentions technologies in verified experience");
  }
  if (has(body, ["stakeholder", "customer", "client", "cross-functional", "requirements", "collaborat", "onboarding"])) {
    score += 10; reasons.push("Values client-facing and cross-team work");
  }
  if (has(location, ["new york", "nyc", "manhattan", "brooklyn", "jersey city", "hoboken"])) {
    score += 8; reasons.push("NYC-area location");
  } else if (job.workMode === "Remote") { score += 4; reasons.push("Remote arrangement; NYC eligibility should be verified"); }
  if (job.workMode === "On-site" || job.workMode === "Hybrid") { score += 5; reasons.push("Preferred collaborative work arrangement"); }
  if (has(body, ["director", "vice president", "vp of", "principal", "staff engineer", "head of", "10+ years", "8+ years", "7+ years"])) {
    score -= 26; flags.push("May target substantially more senior experience");
  } else if (has(body, ["5+ years", "6+ years"])) { score -= 9; flags.push("Experience requirement deserves review"); }
  if (!job.description.trim()) flags.push("Add the full job description for a more useful assessment");
  return {score: Math.min(96, Math.max(12, score)), reasons, flags,
    focus: reasons[0] ?? "Needs a full role description for meaningful matching"};
}

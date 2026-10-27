/** Free, publicly published Ashby company job boards. No subscriptions or provider keys. */
export type LiveJob = {
  id:string;
  title:string;
  company:string;
  location:string;
  postedAt:string;
  postedLabel:string;
  postedMinutes:number;
  url:string;
  applyUrl:string;
  description:string;
  salary:string;
  workMode:"On-site"|"Hybrid"|"Remote"|"Unknown";
  collectedAt:string;
  easyApply:false;
  source:"Ashby public job board";
};
export const REFRESH_INTERVAL_MS=5*60*1000;
export const FREE_BOARDS=[
  {company:"GameChanger",board:"gamechanger",category:"Sports technology"},
  {company:"Novig",board:"novig",category:"Sports technology"},
  {company:"Medal / General Intuition",board:"generalintuition-medal",category:"Gaming technology"},
  {company:"Notion",board:"notion",category:"Software"},
  {company:"Clay",board:"claylabs",category:"Software"},
  {company:"Ramp",board:"ramp",category:"Fintech"},
  {company:"Patreon",board:"patreon",category:"Media technology"},
  {company:"Pure",board:"pureapp",category:"Consumer technology"}
] as const;

type AshbyJob={
  id?:unknown; title?:unknown; location?:unknown; secondaryLocations?:unknown;
  employmentType?:unknown; publishedAt?:unknown; isListed?:unknown;
  workplaceType?:unknown; isRemote?:unknown; jobUrl?:unknown; applyUrl?:unknown;
  descriptionPlain?:unknown; compensation?:unknown;
};
const ENGINEERING=/(software|full[ -]?stack|front[ -]?end|back[ -]?end|platform|web|application|product|mobile|ios|android|react|typescript|python|developer|devops|site reliability|infrastructure|solutions)\s*(engineer|developer)|\b(engineer|developer)\b.*\b(software|full[ -]?stack|front[ -]?end|back[ -]?end|platform|web|application|product|mobile|ios|android|react|typescript|python|solutions)\b|\bsoftware engineering\b/i;
const NYC=/new york|\bnyc\b|manhattan|brooklyn|queens|jersey city|hoboken|\bny\b/i;
const REMOTE_US=/remote.*(united states|\bus\b|\bu\.s\.|usa)|\b(us|usa) remote\b/i;
const FULL_TIME=new Set(["FullTime","Full Time","full-time"]);
const MAX_AGE_MS=7*24*3600*1000;

function safeJobLink(value:unknown):string|null{
  if(typeof value!=="string")return null;
  try {
    const u=new URL(value);
    return u.protocol==="https:"&&u.hostname==="jobs.ashbyhq.com"?u.toString():null;
  }catch{return null;}
}

export function normalizeAshbyBoard(
  input:unknown,company:string,board:string,now:string
):LiveJob[]{
  if(!input||typeof input!=="object"||!Array.isArray((input as {jobs?:unknown}).jobs))return [];
  const timestamp=Date.parse(now);
  const seen=new Set<string>();
  const results:LiveJob[]=[];
  for(const row of (input as {jobs:unknown[]}).jobs){
    if(!row||typeof row!=="object")continue;
    const j=row as AshbyJob;
    const title=typeof j.title==="string"?j.title.trim():"";
    const id=typeof j.id==="string"?j.id:"";
    const location=typeof j.location==="string"?j.location:"";
    const secondary=Array.isArray(j.secondaryLocations)?j.secondaryLocations.filter(x=>x&&typeof x==="object").map(x=>String((x as {location?:unknown}).location||"")).join("; "):"";
    const region=[location,secondary].join("; ");
    const published=typeof j.publishedAt==="string"?Date.parse(j.publishedAt):NaN;
    const age=timestamp-published;
    if(!j.isListed || !FULL_TIME.has(String(j.employmentType||"")) || !ENGINEERING.test(title))continue;
    if(!NYC.test(region) && !(j.isRemote && REMOTE_US.test(region)))continue;
    if(!Number.isFinite(published) || age<0 || age>MAX_AGE_MS)continue;
    const url=safeJobLink(j.jobUrl);
    if(!id||!url||seen.has(id))continue;
    seen.add(id);
    const applyUrl=safeJobLink(j.applyUrl)||url;
    const workMode=j.workplaceType==="Hybrid"?"Hybrid":j.workplaceType==="Remote"?"Remote":j.workplaceType==="OnSite"?"On-site":"Unknown";
    const compensation=j.compensation && typeof j.compensation==="object"?j.compensation as {scrapeableCompensationSalarySummary?:unknown;compensationTierSummary?:unknown}:null;
    const salary=String(compensation?.scrapeableCompensationSalarySummary||compensation?.compensationTierSummary||"").slice(0,240);
    const minutes=Math.floor(age/60000);
    results.push({
      id:`ashby:${board}:${id}`,title:title.slice(0,180),company,location:region.slice(0,180),
      postedAt:new Date(published).toISOString(),postedMinutes:minutes,
      postedLabel:minutes<60?`${minutes}m ago`:minutes<1440?`${Math.floor(minutes/60)}h ago`:`${Math.floor(minutes/1440)}d ago`,
      url,applyUrl,description:String(j.descriptionPlain||"").slice(0,10000),salary,workMode,collectedAt:now,
      easyApply:false,source:"Ashby public job board"
    });
  }
  return results;
}

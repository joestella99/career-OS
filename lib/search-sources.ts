import {classifyTrack,inferWorkMode,isNYC,isUSRemote,type SearchJob,type WorkMode} from "@/lib/job-search";

// Curated public ATS board IDs; individual boards may change or become unavailable.
// Failures are disclosed, never filled with invented roles.
const ASHBY=[
  ["GameChanger","gamechanger","Sports technology"],
  ["Novig","novig","Sports technology"],
  ["Medal / General Intuition","generalintuition-medal","Gaming"],
  ["Notion","notion","Software"],
  ["Clay","claylabs","Software"],
  ["Ramp","ramp","Fintech"],
  ["Patreon","patreon","Media"],
  ["Pure","pureapp","Consumer technology"]
] as const;
const GREENHOUSE=[
  ["SeatGeek","seatgeek","Sports & live events"],
  ["Fanatics","fanatics","Sports & commerce"],
  ["DraftKings","draftkings","Sports & gaming"],
  ["Figma","figma","Software"],
  ["MongoDB","mongodb","Software"],
  ["Datadog","datadog","Software"],
  ["Robinhood","robinhood","Fintech"],
  ["Plaid","plaid","Fintech"],
  ["The Athletic","theathletic","Sports media"],
  ["Duolingo","duolingo","Education"],
  ["Samsara","samsara","Software"],
  ["Chime","chime","Fintech"],
  ["Squarespace","squarespace","Software"],
  ["Braze","braze","Software"],
  ["Greenhouse","greenhouse","Software"],
  ["Vimeo","vimeo","Media"]
] as const;
const HIMALAYAS_QUERIES=["software engineer","solutions engineer","associate product manager"];
type SourceResult={name:string;ok:boolean;jobs:SearchJob[]};
const MAX_DESCRIPTION=8500;
function asObj(v:unknown):Record<string,unknown>|null{
 return v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
}
function string(v:unknown):string{return typeof v==="string"?v:"";}
function asArray(v:unknown):unknown[]{return Array.isArray(v)?v:[];}
function iso(v:unknown):string|null{
  if(typeof v!=="string"&&typeof v!=="number")return null;
  const n=typeof v==="number"?new Date(v*1000):new Date(v);
  return Number.isFinite(n.valueOf())?n.toISOString():null;
}
function externalUrl(v:unknown,domains?:RegExp):string|null{
  if(typeof v!=="string")return null;
  try{
    const u=new URL(v);
    return u.protocol==="https:"&&(!domains||domains.test(u.hostname))?u.toString():null;
  }catch{return null;}
}
function plain(html:string):string{
  return html.replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&amp;/gi,"&")
    .replace(/&#39;/g,"'").replace(/&quot;/gi,'"')
    .replace(/<\/?(?:p|div|br|li|h[1-6]|ul|ol|section)[^>]*>/gi,"\n")
    .replace(/<[^>]*>/g," ").replace(/[\t\r ]{2,}/g," ")
    .replace(/\n{3,}/g,"\n\n").trim().slice(0,MAX_DESCRIPTION);
}
function eligibleLocation(location:string,mode:WorkMode,eligibility:"US"|"worldwide"|"unknown"){
  return isNYC(location) || (mode==="Remote"&&eligibility!=="unknown");
}
function salaryText(earnings:unknown):string{
 const o=asObj(earnings);if(!o)return "";
 return string(o.scrapeableCompensationSalarySummary||o.compensationTierSummary).slice(0,150);
}
async function jsonFrom(url:string):Promise<unknown>{
 const response=await fetch(url,{next:{revalidate:900},headers:{Accept:"application/json"},signal:AbortSignal.timeout(9500)});
 if(!response.ok)throw Error("provider unavailable");
 return response.json() as Promise<unknown>;
}
async function ashby([company,board,sector]:typeof ASHBY[number],now:string):Promise<SourceResult>{
 const result:SourceResult={name:"Ashby / "+company,ok:false,jobs:[]};
 try{
  const data=asObj(await jsonFrom(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`));
  if(!Array.isArray(data?.jobs))return result;
  result.ok=true;
  for(const item of data.jobs){
   const j=asObj(item);if(!j||j.isListed===false)continue;
   const title=string(j.title).trim(),track=classifyTrack(title);
   if(!track)continue;
   if(j.employmentType && !/full\s*time/i.test(string(j.employmentType)))continue;
   const location=[string(j.location),...asArray(j.secondaryLocations).map(x=>string(asObj(x)?.location))].filter(Boolean).join(" · ");
   const mode=inferWorkMode(location,"",string(j.workplaceType));
   const eligibility=isUSRemote(location)?"US":/worldwide|global/i.test(location)?"worldwide":"unknown";
   if(!eligibleLocation(location,mode,eligibility))continue;
   const jobUrl=externalUrl(j.jobUrl,/\.ashbyhq\.com$/i);
   if(!jobUrl)continue;
   const date=iso(j.publishedAt);
   result.jobs.push({
     id:`ashby:${board}:${string(j.id)||jobUrl}`,
     title,company,location,workMode:mode,track,
     description:string(j.descriptionPlain).slice(0,MAX_DESCRIPTION),
     salary:salaryText(j.compensation),url:jobUrl,
     applyUrl:externalUrl(j.applyUrl,/\.ashbyhq\.com$/i)||jobUrl,
     source:"Ashby",sourceUrl:`https://jobs.ashbyhq.com/${board}`,sector,
     date,dateKind:date?"published":"unknown",retrievedAt:now,remoteEligibility:eligibility
   });
  }
 }catch{}
 return result;
}
async function greenhouse([company,board,sector]:typeof GREENHOUSE[number],now:string):Promise<SourceResult>{
 const result:SourceResult={name:"Greenhouse / "+company,ok:false,jobs:[]};
 try{
  const data=asObj(await jsonFrom(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`));
  if(!Array.isArray(data?.jobs))return result;
  result.ok=true;
  for(const item of data.jobs){
   const j=asObj(item);if(!j)continue;
   const title=string(j.title).trim(),track=classifyTrack(title);
   if(!track)continue;
   const location=string(asObj(j.location)?.name);
   const description=plain(string(j.content));
   const mode=inferWorkMode(location,"");
   const eligibility=isUSRemote(location)?"US":/worldwide|global/i.test(location)?"worldwide":"unknown";
   if(!eligibleLocation(location,mode,eligibility))continue;
   // Greenhouse listing API exposes updated_at, not necessarily the original posting date.
   const date=iso(j.updated_at);
   const jobUrl=externalUrl(j.absolute_url);
   if(!jobUrl)continue;
   if(/\b(internship|intern)\b/i.test(title))continue;
   result.jobs.push({
     id:`greenhouse:${board}:${String(j.id||jobUrl)}`,title,company,location,workMode:mode,
     track,description,salary:"",url:jobUrl,applyUrl:jobUrl,
     source:"Greenhouse",sourceUrl:`https://job-boards.greenhouse.io/${board}`,sector,
     date,dateKind:date?"updated":"unknown",retrievedAt:now,remoteEligibility:eligibility
   });
  }
 }catch{}
 return result;
}
async function himalayas(query:string,now:string):Promise<SourceResult>{
 const result:SourceResult={name:"Himalayas / "+query,ok:false,jobs:[]};
 try{
  const u=new URL("https://himalayas.app/jobs/api/search");
  u.searchParams.set("q",query);u.searchParams.set("country","US");
  u.searchParams.set("sort","recent");u.searchParams.set("page","1");
  const data=asObj(await jsonFrom(u.toString()));
  if(!Array.isArray(data?.jobs))return result;
  result.ok=true;
  for(const item of data.jobs){
   const j=asObj(item);if(!j)continue;
   const title=string(j.title),track=classifyTrack(title);
   if(!track)continue;
   if(j.employmentType && !/full\s*time/i.test(string(j.employmentType)))continue;
   const locationRestrictions=asArray(j.locationRestrictions).map(v=>asObj(v)).filter(Boolean) as Record<string,unknown>[];
   const US=locationRestrictions.length===0 || locationRestrictions.some(v=>/^(US|USA)$/i.test(string(v.alpha2))||/united states/i.test(string(v.name)));
   if(!US)continue;
   // Himalayas terms require the applicationLink unchanged (which may point to another HTTPS host).
   const url=externalUrl(j.applicationLink);
   if(!url)continue;
   const desc=plain(string(j.description)||string(j.excerpt));
   const mins=typeof j.minSalary==="number"?j.minSalary:null;
   const maxs=typeof j.maxSalary==="number"?j.maxSalary:null;
   const salary=[mins,maxs].some(x=>x!==null)?`${string(j.currency)||"USD"} ${mins===null?"?":mins.toLocaleString("en-US")}${maxs===null?"":`–${maxs.toLocaleString("en-US")}`} / ${string(j.salaryPeriod)||"year"}`:"";
   const date=iso(j.pubDate);
   const company=string(j.companyName)||"Employer";
   result.jobs.push({
     id:`himalayas:${string(j.guid)||url}`,title,company,location:"Remote · US eligible",
     workMode:"Remote",track,description:desc,salary,url,applyUrl:url,
     source:"Himalayas",sourceUrl:"https://himalayas.app",sector:"Remote-first",
     date,dateKind:date?"updated":"unknown",retrievedAt:now,
     remoteEligibility:locationRestrictions.length?"US":"worldwide"
   });
  }
 }catch{}
 return result;
}
function key(job:SearchJob):string{
 // Avoid exact duplicates across boards and Himalayas while preserving different roles at same employer.
 return (job.company+"|"+job.title+"|"+job.location).toLowerCase().replace(/[^a-z0-9|]+/g,"").slice(0,190);
}
export async function discoverJobs(){
 const now=new Date().toISOString();
 const runs=await Promise.all([
  ...ASHBY.map(v=>ashby(v,now)),
  ...GREENHOUSE.map(v=>greenhouse(v,now)),
  ...HIMALAYAS_QUERIES.map(v=>himalayas(v,now))
 ]);
 const rankedSources:[number,number]=[runs.length,runs.filter(v=>v.ok).length];
 const jobs=new Map<string,SearchJob>();
 for(const r of runs.filter(x=>x.ok))for(const job of r.jobs){
  const k=key(job),current=jobs.get(k);
  // Prefer direct ATS description over the third-party remote directory when duplicates collide.
  if(!current||(current.source==="Himalayas"&&job.source!=="Himalayas"))jobs.set(k,job);
 }
 return {
  jobs:[...jobs.values()].slice(0,500),
  sources:rankedSources,
  status:rankedSources[1]===0?"unavailable":rankedSources[1]<rankedSources[0]?"partial":"ok",
  checkedAt:now,
  sourceStatus:runs.map(r=>({name:r.name,ok:r.ok,count:r.jobs.length}))
 };
}

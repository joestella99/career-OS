/**
 * CareerOS search contracts and evidence-based relevance scoring.
 * A fit score is NOT an interview probability: employer screening data is unavailable.
 * Career facts: verified career master, 2026-10-26. No Onshore or FitView.
 */
export type Track="engineering"|"solutions"|"product";
export type WorkMode="On-site"|"Hybrid"|"Remote"|"Unknown";
export type JobSource="Ashby"|"Greenhouse"|"Himalayas";
export type SearchJob={
  id:string;title:string;company:string;location:string;workMode:WorkMode;
  track:Track;description:string;salary:string;url:string;applyUrl:string;
  source:JobSource;sourceUrl:string;sector:string;
  date:string|null;dateKind:"published"|"updated"|"unknown";
  retrievedAt:string;remoteEligibility:"US"|"worldwide"|"unknown";
};
export type FitResult={
  score:number;tier:"Strong match"|"Good match"|"Explore"|"Stretch";
  evidence:string[];gaps:string[];role:Track;requiredYears:number|null;
  tags:string[];
};
export type SearchFilters={
  text:string;track:Track|"all";mode:"all"|"onsite-hybrid"|"remote";
  maxDays:number;sort:"fit"|"recent";hideStretch:boolean;
  sources:JobSource|"all";
};
export const CORE_SKILLS=[
  {name:"TypeScript",regex:/\btypescript\b/i},
  {name:"JavaScript",regex:/\bjavascript\b/i},
  {name:"React",regex:/\breact(?:js|\.js)?\b/i},
  {name:"Python",regex:/\bpython\b/i},
  {name:"SQL",regex:/\b(?:sql|postgres(?:ql)?|sql server)\b/i},
  {name:"C# / .NET",regex:/\b(?:c#|csharp|\.net|dotnet)\b/i},
  {name:"Java",regex:/\bjava\b(?!script)/i},
  {name:"Angular",regex:/\bangular\b/i},
  {name:"Playwright / Selenium",regex:/\b(?:playwright|selenium)\b/i},
  {name:"CI/CD",regex:/\b(?:ci\/cd|continuous integration|github actions)\b/i},
  {name:"API integrations",regex:/\b(?:rest(?:ful)? api|api integration|integrations?|webhooks?)\b/i},
  {name:"Firebase",regex:/\b(?:firebase|firestore)\b/i},
  {name:"Machine learning",regex:/\b(?:machine learning|scikit.learn|xgboost)\b/i},
  {name:"Azure",regex:/\bazure\b/i},
  {name:"Automation / testing",regex:/\b(?:test automation|automated testing|quality assurance|test framework)\b/i}
] as const;
const DIFFICULT_SKILLS=[
 ["AWS",/\baws\b|\bamazon web services\b/i],
 ["Go",/\bgolang\b|\bgo programming\b/i],
 ["Rust",/\brust\b/i],
 ["Kubernetes",/\bkubernetes\b|\bk8s\b/i],
 ["Swift",/\bswift\b/i],
 ["Ruby",/\bruby\b|\brails\b/i],
 ["Scala",/\bscala\b/i],
 ["Salesforce",/\bsalesforce\b/i]
] as const;

const SENIOR=/\b(senior|staff|principal|director|vp|head of|lead (?:engineer|developer|product)|engineering manager|architect)\b|\bsr\.?\s/i;
const ENTRY=/\b(junior|associate|entry.level|new grad|early career|graduate|engineer i\b|software engineer i\b|swe i\b)/i;
const SPORTS=/\b(sport|fitness|athletic|baseball|football|basketball|soccer|fan experience|wellness|performance analytics|gaming)\b/i;
const HARD_REQUIREMENT=/\b(must have|required|minimum|at least|qualifications?|requirements?)\b/i;
const YEARS=/(?:at least|minimum of|\bmin\.?\s*)?\b(\d{1,2})\s*\+?\s*(?:years|yrs)\s*(?:of)?\s*(?:professional|relevant|industry|work|hands.on|software|experience)/gi;
// Prioritize current, open feed entries over a narrow publish-date window: older open jobs may be strong matches.
const DEFAULT_PREFS:SearchFilters={text:"",track:"all",mode:"all",maxDays:3650,sort:"fit",hideStretch:true,sources:"all"};
export {DEFAULT_PREFS};
export function classifyTrack(title:string):Track|null{
  if(/\b(associate product manager|product manager|product owner|apm|product analyst|technical product manager|product operations)\b/i.test(title))return "product";
  if(/\b(solutions? engineer|implementation (?:engineer|consultant|specialist)|technical (?:solutions?|consultant|customer success|support engineer|account manager)|sales engineer|integration (?:engineer|specialist)|customer engineer)\b/i.test(title))return "solutions";
  if(/\b(software|full[ -]?stack|front[ -]?end|back[ -]?end|platform|web|application|react|typescript|python|java|\.net|mobile|ios|android|qa|test automation|developer|engineer)\b/i.test(title) &&
    /\b(engineer|developer|swe|programmer|automation|development)\b/i.test(title))return "engineering";
  return null;
}
export function inferWorkMode(location:string,description:string,raw?:string):WorkMode{
  if(/remote/i.test(raw||"") && !/hybrid/i.test(raw||""))return "Remote";
  if(/hybrid/i.test(raw||""))return "Hybrid";
  if(/on.?site|in.?office/i.test(raw||""))return "On-site";
  if(/\bremote\b/i.test(location))return "Remote";
  if(/\bhybrid\b/i.test(location))return "Hybrid";
  if(/\bon.?site\b/i.test(location))return "On-site";
  // Descriptions can mention remote policy unrelated to the job; avoid false claims.
  void description;
  return "Unknown";
}
export function isNYC(location:string):boolean{
  // NY state alone is not sufficient: Albany and Buffalo are not NYC metro.
  return /\b(new york|nyc|manhattan|brooklyn|queens|bronx|hoboken|jersey city|stamford|white plains|long island|newark)\b/i.test(location);
}
export function isUSRemote(location:string):boolean{
  return /\b(us|usa|u\.s\.|united states|north america|worldwide|anywhere)\b/i.test(location);
}
export function likelyEligible(job:SearchJob):boolean{
  if(isNYC(job.location))return true;
  return job.workMode==="Remote" && job.remoteEligibility!=="unknown";
}
export function jobAgeDays(job:SearchJob,now=Date.now()):number|null{
  if(!job.date)return null;
  const n=Date.parse(job.date);return Number.isFinite(n)?Math.max(0,(now-n)/86400000):null;
}
function experienceYears(description:string):number|null{
  const inContext=description.slice(0,12000);
  const vals=[...inContext.matchAll(YEARS)].map(m=>Number(m[1])).filter(n=>n>=1&&n<=20);
  return vals.length?Math.max(...vals):null;
}
const fitCache=new WeakMap<SearchJob,FitResult>();
export function rankJob(job:SearchJob):FitResult{
  const cached=fitCache.get(job);if(cached)return cached;
  const title=job.title,desc=job.description.slice(0,16000);
  const text=`${title}\n${desc}`;
  const role=classifyTrack(title)??job.track;
  let score=53;
  const evidence:string[]=[],gaps:string[]=[],tags:string[]=[];
  if(ENTRY.test(title)){score+=16;evidence.push("Entry/associate-level title fits your experience");}
  else if(SENIOR.test(title)){score-=34;gaps.push("Senior/lead title is likely beyond your current tenure");}
  else {score+=4;tags.push("Seniority unconfirmed");}
  const years=experienceYears(desc);
  if(years!==null){
    if(years<=2){score+=13;evidence.push(`Minimum experience stated: ${years} year${years===1?"":"s"}`);}
    else if(years===3){score+=3;gaps.push("Lists 3 years; you have about two years of post-graduation experience");}
    else if(years===4){score-=12;gaps.push("Lists 4 years of experience");}
    else {score-=Math.min(34,12+(years-4)*4);gaps.push(`Lists ${years}+ years of experience`);}
  }else tags.push("Required tenure not clearly stated");
  if(role==="solutions"){
    score+=13;evidence.push("FIDx client requirements, demos, and implementation experience");
    if(/customer|stakeholder|client|discovery|implementation/i.test(text)){score+=5;evidence.push("Client-facing responsibilities match your verified work");}
  }else if(role==="engineering"){
    score+=10;evidence.push("FIDx application development and company-wide test automation");
  }else{
    score+=1;evidence.push("Internal tooling, product iteration, and stakeholder discovery");
    if(!/\b(associate|junior|apm)\b/i.test(title)){score-=7;gaps.push("No verified formal product-management title");}
  }
  const matches=CORE_SKILLS.filter(skill=>skill.regex.test(text)).map(x=>x.name);
  score+=Math.min(15,matches.length*4);
  if(matches.length)evidence.push(`Relevant experience: ${matches.slice(0,4).join(", ")}`);
  else gaps.push("Specific technical stack not established from the posting");
  const hard=HARD_REQUIREMENT.test(desc);
  const missing=DIFFICULT_SKILLS.filter(([_,rx])=>rx.test(desc)).map(([name])=>name);
  if(missing.length && hard){score-=Math.min(12,missing.length*5);gaps.push(`Check requirements for ${missing.slice(0,3).join(", ")}; not verified in your background`);}
  if(isNYC(job.location)){
    score+=9;evidence.push("NYC metro location");
    if(job.workMode==="Hybrid"||job.workMode==="On-site"){score+=3;tags.push("Preferred work arrangement");}
  }else if(job.workMode==="Remote"&&job.remoteEligibility!=="unknown"){score+=2;tags.push("US-eligible remote");}
  else{score-=12;gaps.push("Location or US work eligibility needs confirmation");}
  if(SPORTS.test(job.company+" "+job.sector)){score+=5;tags.push("Sports/fitness interest");}
  const age=jobAgeDays(job);
  if(age!==null&&age<=3){score+=3;tags.push(job.dateKind==="published"?"Recently published":"Recently updated");}
  if(job.description.length<120){score-=6;gaps.push("Limited requirements available to assess");}
  score=Math.min(99,Math.max(4,Math.round(score)));
  const tier=score>=82?"Strong match":score>=68?"Good match":score>=52?"Explore":"Stretch";
  const result:FitResult={score,tier,evidence:evidence.slice(0,4),gaps:gaps.slice(0,3),role,requiredYears:years,tags};
  fitCache.set(job,result);
  return result;
}
export function matchText(job:SearchJob,query:string):boolean{
 const parts=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 if(!parts.length)return true;
 const haystack=`${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase();
 return parts.every(part=>haystack.includes(part));
}
export function filterAndSort(jobs:SearchJob[],filters:SearchFilters,now=Date.now()){
 return jobs.filter(job=>{
   const score=rankJob(job);
   if(filters.track!=="all"&&score.role!==filters.track)return false;
   if(filters.sources!=="all"&&job.source!==filters.sources)return false;
   if(filters.mode==="remote"&&job.workMode!=="Remote")return false;
   if(filters.mode==="onsite-hybrid"&&job.workMode==="Remote")return false;
   if(filters.hideStretch&&score.score<52)return false;
   const age=jobAgeDays(job,now);
   if(age!==null&&age>filters.maxDays)return false;
   if(!matchText(job,filters.text))return false;
   return true;
 }).sort((a,b)=>{
   const difference=rankJob(b).score-rankJob(a).score;
   if(filters.sort==="fit"&&difference!==0)return difference;
   const ageA=jobAgeDays(a,now),ageB=jobAgeDays(b,now);
   const fresh=(ageA??10000)-(ageB??10000);
   return filters.sort==="recent"?fresh||difference:difference||fresh;
 });
}

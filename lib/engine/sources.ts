import type {Job,Source} from "./profile";
import {classifyTitle,isNycArea,permitsUSRemote,normalizedTitle,fitJob} from "./rank";

/** Curated, publicly available employer job-board slugs. Can change as firms migrate ATSs. */
const ASHBY=[
  ["GameChanger","gamechanger","Sports technology"],
  ["Novig","novig","Sports technology"],
  ["Medal / General Intuition","generalintuition-medal","Gaming"],
  ["Notion","notion","Software"],
  ["Clay","claylabs","Software"],
  ["Ramp","ramp","Fintech"],
  ["Patreon","patreon","Media technology"],
  ["Pure","pureapp","Consumer technology"]
] as const;
const GREENHOUSE=[
  ["SeatGeek","seatgeek","Sports & live events"],
  ["Figma","figma","Design software"],
  ["MongoDB","mongodb","Data infrastructure"],
  ["Datadog","datadog","Developer software"],
  ["Robinhood","robinhood","Fintech"],
  ["Duolingo","duolingo","Education technology"],
  ["Samsara","samsara","Industrial technology"],
  ["Chime","chime","Fintech"],
  ["Squarespace","squarespace","Web software"],
  ["Braze","braze","Customer engagement"],
  ["Greenhouse","greenhouse","HR technology"]
] as const;
const LEVER=[
  ["Palantir","palantir","Enterprise software"],
  ["ION / Lab49","ion","Fintech & consulting"],
  ["Canary Technologies","canarytechnologies","Hospitality technology"]
] as const;
const REMOTE_QUERIES=["software engineer","solutions engineer","associate product manager","implementation engineer","technical account manager"] as const;

type ObjectValue=Record<string,unknown>;
type SourceResult={name:string;success:boolean;total:number;jobs:Job[];error?:string};
const obj=(v:unknown):ObjectValue|null=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as ObjectValue:null;
const str=(v:unknown)=>typeof v==="string"?v:"";
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const iso=(v:unknown,seconds=false):string|null=>{
  if(typeof v!=="number"&&typeof v!=="string")return null;
  const t=seconds&&typeof v==="number"?v*1000:v;
  const d=new Date(t);return Number.isFinite(d.valueOf())?d.toISOString():null;
};
function https(value:unknown):string|null{
  if(typeof value!=="string")return null;
  try{const u=new URL(value);return u.protocol==="https:"?u.toString():null;}catch{return null;}
}
const decode=(s:string)=>s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<")
  .replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(1114111,Number(n))));
function plain(v:unknown):string{
  if(typeof v!=="string")return "";
  return decode(v.replace(/<\/?(?:p|div|br|li|h[1-6]|section|ul|ol)[^>]*>/gi,"\n")
    .replace(/<[^>]*>/g," ")).replace(/\r/g,"").replace(/[ \t]{2,}/g," ")
    .replace(/\n{3,}/g,"\n\n").trim().slice(0,9000);
}
function work(location:string,raw:string,remoteFlag?:boolean):Job["workplace"]{
  if(/\bhybrid\b/i.test(location+" "+raw))return "Hybrid";
  if(remoteFlag || /\bremote\b/i.test(location+" "+raw))return "Remote";
  if(/\b(?:on[- ]?site|onsite|in[- ]?office)\b/i.test(location+" "+raw))return "On-site";
  return "Unspecified";
}
function allowed(location:string,mode:Job["workplace"],worldwide=false){
  return isNycArea(location) || (mode==="Remote"&&(worldwide||permitsUSRemote(location)));
}
async function request(url:string,ttl=900):Promise<unknown>{
  const response=await fetch(url,{
    headers:{Accept:"application/json","User-Agent":"CareerOS/2.0 (personal job-search interface)"},
    next:{revalidate:ttl},signal:AbortSignal.timeout(11000),
  });
  if(!response.ok)throw new Error("HTTP "+response.status);
  return response.json();
}
function salarySummary(v:unknown):string|null{
  const d=obj(v);
  const raw=str(d?.scrapeableCompensationSalarySummary)||str(d?.compensationTierSummary);
  return raw?raw.slice(0,180):null;
}
async function ashby(board:typeof ASHBY[number],receivedAt:string):Promise<SourceResult>{
  const [company,slug,sector]=board,name="Ashby / "+company;
  try{
    const raw=obj(await request("https://api.ashbyhq.com/posting-api/job-board/"+encodeURIComponent(slug)+"?includeCompensation=true"));
    if(!Array.isArray(raw?.jobs))throw new Error("Missing jobs array");
    const jobs:Job[]=[];
    for(const value of raw.jobs){
      const p=obj(value);if(!p||p.isListed===false)continue;
      const title=str(p.title),track=classifyTitle(title);if(!track)continue;
      if(p.employmentType&&!/full\s*time/i.test(str(p.employmentType)))continue;
      if(/\bintern(?:ship)?\b/i.test(title))continue;
      const location=[str(p.location),...arr(p.secondaryLocations).map(x=>str(obj(x)?.location))].filter(Boolean).join(" / ");
      const workplace=work(location,str(p.workplaceType),p.isRemote===true);
      if(!allowed(location,workplace))continue;
      const url=https(p.jobUrl);if(!url)continue;
      const published=iso(p.publishedAt);
      jobs.push({
        id:"ashby:"+slug+":"+(str(p.id)||url),title,company,location,
        track,workplace,eligibleLocation:true,source:"Ashby",sourceBoard:slug,sector,
        url,applyUrl:https(p.applyUrl)||url,description:plain(p.descriptionPlain||p.descriptionHtml),
        salary:salarySummary(p.compensation),date:published,dateType:published?"published":"unknown",receivedAt,
      });
    }
    return {name,success:true,total:raw.jobs.length,jobs};
  }catch(err){return {name,success:false,total:0,jobs:[],error:String(err).slice(0,100)};}
}
async function greenhouse(board:typeof GREENHOUSE[number],receivedAt:string):Promise<SourceResult>{
  const [company,slug,sector]=board,name="Greenhouse / "+company;
  try{
    const data=obj(await request("https://boards-api.greenhouse.io/v1/boards/"+encodeURIComponent(slug)+"/jobs?content=true"));
    if(!Array.isArray(data?.jobs))throw new Error("Missing jobs array");
    const jobs:Job[]=[];
    for(const value of data.jobs){
      const p=obj(value);if(!p)continue;
      const title=str(p.title),track=classifyTitle(title);if(!track)continue;
      if(/\bintern(?:ship)?\b/i.test(title))continue;
      const location=str(obj(p.location)?.name);
      const workplace=work(location,"");
      if(!allowed(location,workplace))continue;
      const url=https(p.absolute_url);if(!url)continue;
      // Greenhouse boards may supply first_published; don't confuse updated_at with creation.
      const published=iso(p.first_published),updated=iso(p.updated_at);
      const date=published||updated;
      jobs.push({
        id:"greenhouse:"+slug+":"+String(p.id||url),title,company,location,track,workplace,
        eligibleLocation:true,source:"Greenhouse",sourceBoard:slug,sector,url,applyUrl:url,
        description:plain(p.content),salary:null,date,dateType:published?"published":updated?"updated":"unknown",receivedAt,
      });
    }
    return {name,success:true,total:data.jobs.length,jobs};
  }catch(err){return {name,success:false,total:0,jobs:[],error:String(err).slice(0,100)};}
}
async function lever(board:typeof LEVER[number],receivedAt:string):Promise<SourceResult>{
  const [company,slug,sector]=board,name="Lever / "+company;
  try{
    const response=await request("https://api.lever.co/v0/postings/"+encodeURIComponent(slug)+"?mode=json&limit=300");
    if(!Array.isArray(response))throw new Error("Missing postings array");
    const jobs:Job[]=[];
    for(const item of response){
      const p=obj(item);if(!p)continue;
      const title=str(p.text),track=classifyTitle(title);if(!track)continue;
      if(/\bintern(?:ship)?\b/i.test(title))continue;
      const cats=obj(p.categories);
      const jobType=str(cats?.commitment);
      if(jobType&&!/full[ -]?time/i.test(jobType))continue;
      const location=str(cats?.location);
      const workplace=work(location,str(p.workplaceType));
      if(!allowed(location,workplace))continue;
      const url=https(p.hostedUrl);if(!url)continue;
      const lists=arr(p.lists).map(x=>{
        const l=obj(x);return str(l?.text)+"\n"+plain(l?.content);
      }).join("\n");
      const description=plain(str(p.descriptionPlain)||str(p.description))+"\n"+plain(lists);
      const date=iso(p.createdAt);
      const range=obj(p.salaryRange);
      const salary=range&&range.min&&range.max
        ?String(range.currency||"USD")+" "+Number(range.min).toLocaleString("en-US")+" – "+Number(range.max).toLocaleString("en-US")
        :null;
      jobs.push({
        id:"lever:"+slug+":"+str(p.id),title,company,location,track,workplace,eligibleLocation:true,
        source:"Lever",sourceBoard:slug,sector,url,applyUrl:https(p.applyUrl)||url,
        description:description.slice(0,9000),salary,
        date,dateType:date?"published":"unknown",receivedAt
      });
    }
    return {name,success:true,total:response.length,jobs};
  }catch(err){return {name,success:false,total:0,jobs:[],error:String(err).slice(0,100)};}
}

async function himalayas(q:string,receivedAt:string):Promise<SourceResult>{
  const name="Himalayas / "+q;
  try{
    const u=new URL("https://himalayas.app/jobs/api/search");
    u.searchParams.set("q",q);u.searchParams.set("country","US");
    u.searchParams.set("employment_type","Full Time");u.searchParams.set("sort","recent");u.searchParams.set("page","1");
    // Official API data refreshes daily; no benefit to 5-minute polling.
    const data=obj(await request(u.toString(),86400));
    if(!Array.isArray(data?.jobs))throw new Error("Missing jobs array");
    const jobs:Job[]=[];
    for(const value of data.jobs){
      const p=obj(value);if(!p)continue;
      const title=str(p.title),track=classifyTitle(title);if(!track)continue;
      const restrictions=arr(p.locationRestrictions).map(obj).filter((x):x is ObjectValue=>Boolean(x));
      const remoteUS=restrictions.length===0||restrictions.some(r=>/^(?:US|USA)$/i.test(str(r.alpha2))||/united states/i.test(str(r.name)));
      if(!remoteUS)continue;
      const expiry=iso(p.expiryDate,true);
      if(expiry&&Date.parse(expiry)<Date.parse(receivedAt))continue;
      const applyUrl=https(p.applicationLink);if(!applyUrl)continue;
      const min=typeof p.minSalary==="number"?p.minSalary:null;
      const max=typeof p.maxSalary==="number"?p.maxSalary:null;
      const salary=min!==null||max!==null?(str(p.currency)||"USD")+" "+(min?.toLocaleString("en-US")||"?")+(max!==null?" – "+max.toLocaleString("en-US"):"")+" / "+(str(p.salaryPeriod)||"annual"):null;
      const date=iso(p.pubDate,true),company=str(p.companyName)||"Unknown employer";
      jobs.push({
        id:"himalayas:"+(str(p.guid)||applyUrl),title,company,
        location:restrictions.length?"Remote · United States":"Remote · Worldwide",
        track,workplace:"Remote",eligibleLocation:true,source:"Himalayas",sourceBoard:q,sector:"Remote",
        // Himalayas terms: preserve original applicationLink unchanged and show attribution.
        url:applyUrl,applyUrl,description:plain(p.description)||plain(p.excerpt),salary,
        date,dateType:date?"updated":"unknown",receivedAt
      });
    }
    return {name,success:true,total:data.jobs.length,jobs};
  }catch(err){return {name,success:false,total:0,jobs:[],error:String(err).slice(0,100)};}
}
function dedupeKey(j:Job){
  return (j.company+"|"+normalizedTitle(j.title)+"|"+(j.workplace==="Remote"?"remote":j.location))
    .toLowerCase().replace(/[^a-z0-9|]+/g,"");
}
function selectedChoice(a:Job,b:Job):Job{
  if(a.source==="Himalayas"&&b.source!=="Himalayas")return b;
  if(b.source==="Himalayas"&&a.source!=="Himalayas")return a;
  return (a.description.length>=b.description.length)?a:b;
}
export type Discovery={
  jobs:Job[];
  checkedAt:string;
  sourceCount:{ok:number;total:number};
  failedSources:string[];
  sourceSummary:{name:string;ok:boolean;matches:number;total:number}[];
  status:"ok"|"partial"|"unavailable";
};
export async function discover():Promise<Discovery>{
  const checkedAt=new Date().toISOString();
  const groups=await Promise.all([
    ...ASHBY.map(x=>ashby(x,checkedAt)),
    ...GREENHOUSE.map(x=>greenhouse(x,checkedAt)),
    ...LEVER.map(x=>lever(x,checkedAt)),
    ...REMOTE_QUERIES.map(x=>himalayas(x,checkedAt))
  ]);
  const map=new Map<string,Job>();
  for(const group of groups){
    for(const job of group.jobs){
      const key=dedupeKey(job),existing=map.get(key);
      map.set(key,existing?selectedChoice(existing,job):job);
    }
  }
  const scored=[...map.values()].sort((a,b)=>fitJob(b).score-fitJob(a).score);
  // Keep different job tracks visible even when one large employer publishes many jobs.
  const limits={engineering:250,solutions:140,product:85},counts={engineering:0,solutions:0,product:0};
  const balanced=scored.filter(job=>{
    if(counts[job.track]>=limits[job.track])return false;
    counts[job.track]++;return true;
  }).slice(0,450);
  const ok=groups.filter(g=>g.success).length;
  return {jobs:balanced,checkedAt,sourceCount:{ok,total:groups.length},
    failedSources:groups.filter(x=>!x.success).map(x=>x.name),
    sourceSummary:groups.map(x=>({name:x.name,ok:x.success,matches:x.jobs.length,total:x.total})),
    status:ok===groups.length?"ok":ok?"partial":"unavailable"};
}

import {CANDIDATE,type Job,type Track,type Fit} from "./profile";

const SENIOR_TITLE=/\b(?:senior|sr\.?|staff|principal|director|vice president|vp|head of|chief|architect|lead (?:software|solutions|sales|platform|product|engineer|developer)|engineering manager|product manager iii|engineer iv|engineer v)\b/i;
const ENTRY_TITLE=/\b(?:junior|associate|entry[ -]?level|early career|new grad|graduate|apm|engineer i(?:\b|$)|developer i(?:\b|$)|swe i(?:\b|$))\b/i;
const AREA_TERRITORY=/\b(?:midwest|mid-west|southeast|southwest|tola|west coast|pacific northwest|west region|central region)\b/i;
const SPORTS=/\b(?:sport|fitness|athlet|baseball|basketball|football|soccer|gaming|wellness|fan experience)\b/i;
const UNKNOWN_TECH=[
  ["AWS",/\baws\b/i],["Kubernetes",/\bkubernetes\b|\bk8s\b/i],
  ["Go",/\bgolang\b|\bgo\s+(?:language|programming)\b/i],
  ["Rust",/\brust\b/i],["Ruby",/\bruby\b|\brails\b/i],
  ["Swift",/\bswift\b/i],["Salesforce",/\bsalesforce\b/i],
  ["Scala",/\bscala\b/i]
] as const;

export function classifyTitle(title:string):Track|null{
  if(/\b(?:associate product manager|product manager|technical product manager|product owner|product analyst|associate pm|product operations analyst)\b/i.test(title))return "product";
  if(/\b(?:solutions? engineer|solutions? consultant|sales engineer|implementation (?:engineer|consultant|specialist)|integrations? engineer|technical account manager|customer engineer|customer success engineer|technical solutions engineer|field applications engineer)\b/i.test(title))return "solutions";
  if(/\b(?:software engineer|software developer|full[ -]?stack (?:engineer|developer)|front[ -]?end (?:engineer|developer)|back[ -]?end (?:engineer|developer)|frontend (?:engineer|developer)|backend (?:engineer|developer)|web (?:engineer|developer)|application (?:engineer|developer)|mobile (?:engineer|developer)|ios (?:engineer|developer)|android (?:engineer|developer)|platform engineer|test automation engineer|qa automation engineer|quality assurance engineer|sdet|software development engineer|machine learning engineer|python developer|java developer|react developer|data engineer)\b/i.test(title))return "engineering";
  return null;
}

/** Never treat an incidental "senior" near a team name as an entry-level title. */
export function titleSeniority(title:string):"entry"|"mid"|"senior"{
  if(SENIOR_TITLE.test(title))return "senior";
  if(ENTRY_TITLE.test(title))return "entry";
  return "mid";
}

/** Only detect years when a sentence/line describes a qualification or work experience. */
export function requiredYears(description:string):number|null{
  const segments=description.slice(0,14000).split(/[\n.!?;]+/).map(x=>x.trim());
  const found:number[]=[];
  for(const part of segments){
    if(!part||part.length>360)continue;
    if(/\b(?:founded|company has|in business|serving customers for|years ago|since \d{4}|history of)\b/i.test(part))continue;
    const contextual=/\b(?:required|must have|at least|minimum|qualifications?|experience|you have|you bring|years of)\b/i.test(part);
    if(!contextual)continue;
    for(const m of part.matchAll(/\b(\d{1,2})\s*\+?\s*(?:years|yrs)\s+(?:of\s+)?(?:(?:professional|relevant|hands-on|work|industry|commercial|software|engineering|technical|related)\s+)?(?:experience|development|engineering|software|coding|building|working)/gi)){
      const n=Number(m[1]);if(n>=1&&n<=20)found.push(n);
    }
    for(const m of part.matchAll(/\b(?:at least|minimum of|require(?:d|s)?)\s+(\d{1,2})\s*\+?\s*(?:years|yrs)\b/gi)){
      const n=Number(m[1]);if(n>=1&&n<=20)found.push(n);
    }
  }
  // Don't infer 10+ years from an unrelated executive qualification at the very bottom.
  return found.length?Math.max(...found):null;
}
export function fitJob(job:Job):Fit{
  const positives:string[]=[],cautions:string[]=[];
  const sen=titleSeniority(job.title);
  const years=requiredYears(job.description);
  const context=job.title+"\n"+job.description;
  const known=CANDIDATE.technologies.filter(k=>k.rx.test(context)).map(k=>k.name);
  const unknown=UNKNOWN_TECH.filter(([_,rx])=>rx.test(job.description)).map(([name])=>name);
  let score=44;
  if(job.track==="engineering"){
    score+=12;positives.push(CANDIDATE.evidence.engineering);
  }else if(job.track==="solutions"){
    score+=14;positives.push(CANDIDATE.evidence.solutions);
  }else{
    score+=3;positives.push(CANDIDATE.evidence.product);
  }

  if(sen==="entry"){score+=18;positives.push("Entry/associate title fits your current career stage.");}
  else if(sen==="mid"){score+=6;}
  else{score-=35;cautions.push("Senior leadership or tenure indicated by the title.");}

  if(years===null)cautions.push("Minimum professional experience is unclear; check the full qualifications.");
  else if(years<=2){score+=9;positives.push("Stated experience requirement is within your current range.");}
  else if(years===3){score-=3;cautions.push("Requires approximately 3 years; your professional tenure is shorter.");}
  else if(years===4){score-=16;cautions.push("Requires 4 years of experience.");}
  else{score-=32;cautions.push("Requires "+years+" years of experience—significant tenure mismatch.");}

  if(known.length){score+=Math.min(12,known.length*3);positives.push("Technology overlap: "+known.slice(0,4).join(", ")+".");}
  else cautions.push("Posting provides little verifiable overlap with your technical skills.");
  if(unknown.length>0 && /required|must have|minimum|qualification/i.test(job.description)){
    score-=Math.min(9,unknown.length*3);
    cautions.push("Verify required experience with "+unknown.slice(0,3).join(", ")+".");
  }
  if(job.eligibleLocation){
    score+=7;
    positives.push(job.workplace==="Hybrid"||job.workplace==="On-site"?"NYC and collaborative office preference align.":"Location appears compatible with NYC.");
  }else{score-=20;cautions.push("NYC/US work location eligibility is not verified.");}
  if(SPORTS.test(job.sector+" "+job.company)){score+=4;positives.push(CANDIDATE.evidence.sports);}
  if(job.track==="product" && !/associate|apm|junior|analyst/i.test(job.title)){
    score-=11;cautions.push("Formal product-management experience is not in your verified work history.");
  }
  const regionalTerritory=job.workplace==="Remote"&&AREA_TERRITORY.test(job.title);
  if(regionalTerritory){score-=13;cautions.push("Remote role specifies a different territory; verify NYC eligibility.");}
  if(job.description.trim().length<140){score-=10;cautions.push("Not enough job-description evidence for a confident fit assessment.");}

  // Hard ceilings: a keyword-rich job cannot outrank a credible junior opportunity if infeasible.
  if(sen==="senior")score=Math.min(score,41);
  if(years!==null && years>=5)score=Math.min(score,41);
  if(years===4)score=Math.min(score,59);
  if(regionalTerritory)score=Math.min(score,48);
  if(!job.eligibleLocation)score=Math.min(score,48);
  if(job.track==="product" && !/associate|apm|junior|analyst/i.test(job.title))score=Math.min(score,62);
  score=Math.max(5,Math.min(94,Math.round(score)));
  const hard=sen==="senior"||(years!==null&&years>=5)||!job.eligibleLocation;
  const eligibility=hard?"Likely mismatch":years!==null&&years>=4||regionalTerritory?"Check requirements":"Good";
  const grade=score>=80?"Strong target":score>=66?"Good target":score>=49?"Consider":"Long shot";
  // No invented "chance of interview". Use a transparent prioritization metric only.
  return {score,grade,eligibility,positives:positives.slice(0,4),cautions:cautions.slice(0,4),
    skills:known,yearsRequired:years,seniority:sen,sortPriority:score};
}
export function normalizedTitle(title:string):string{
  return title.toLowerCase().replace(/[^\da-z]/g," ").replace(/\s+/g," ").trim();
}
export function isNycArea(location:string):boolean{
  // New York state alone is insufficient to assume a NYC commute.
  return /\b(new york city|new york,\s*ny|nyc|manhattan|brooklyn|queens|bronx|jersey city|hoboken|newark|white plains|stamford|long island|new york metropolitan)\b/i.test(location);
}
export function permitsUSRemote(location:string):boolean{
  return /\b(?:united states|usa|u\.s\.|us remote|remote[- ,]*us|north america|worldwide|anywhere)\b/i.test(location);
}
export function ageDays(date:string|null,now=Date.now()):number|null{
  if(!date)return null;const stamp=Date.parse(date);
  return Number.isFinite(stamp)?Math.max(0,(now-stamp)/86400000):null;
}

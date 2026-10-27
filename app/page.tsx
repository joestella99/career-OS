"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {
  ArrowDownUp,ArrowRight,ArrowUpRight,Bookmark,BookmarkCheck,Check,
  CheckCircle2,ChevronDown,Clock3,Compass,ExternalLink,Filter,
  Heart,MapPin,RefreshCw,Search,ShieldCheck,SlidersHorizontal,
  Sparkles,Target,X,Zap
} from "lucide-react";
import type {Job,Fit,Track} from "@/lib/engine/profile";
import {CANDIDATE} from "@/lib/engine/profile";
import {ageDays,fitJob} from "@/lib/engine/rank";

type Feed={
  jobs:Job[];checkedAt:string;status:"ok"|"partial"|"unavailable";
  sourceCount:{ok:number;total:number};failedSources:string[];
  sourceSummary:{name:string;ok:boolean;matches:number;total:number}[];
  rankingNotice?:string;message?:string;
};
type Mode="all"|"nyc"|"remote";
type Scope="discover"|"saved";
type Order="best"|"newest"|"sports";
const KEY="careeros_v3_search_state";
const FETCH_EVERY=10*60*1000;
const TRACKS:{key:Track|"all";label:string}[]=[
  {key:"all",label:"Best matches"},{key:"engineering",label:"Software engineering"},
  {key:"solutions",label:"Solutions & implementation"},{key:"product",label:"Product / APM"}
];
const isSports=(j:Job)=>/sports?|fitness|athlet|gaming|baseball|soccer|live events|fan experience/i.test(j.sector+" "+j.company);
const domainSafe=(s:string)=>{try{return new URL(s).protocol==="https:";}catch{return false;}};
const normal=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
const freshLabel=(j:Job,now:number)=>{
  if(!j.date)return "Date unknown";
  const days=ageDays(j.date,now);
  if(days===null)return "Date unknown";
  const elapsed=days<1/24?"<1h":days<1?Math.max(1,Math.floor(days*24))+"h":Math.floor(days)+"d";
  return (j.dateType==="published"?"Published":j.dateType==="updated"?"Updated":"Dated")+" "+elapsed+" ago";
};
function saveData(saved:Job[],hidden:string[]){
  try{localStorage.setItem(KEY,JSON.stringify({saved:saved.slice(0,150),hidden:hidden.slice(0,1500)}));}catch{}
}
function initialData():{saved:Job[];hidden:string[]}{
  try{
    const obj=JSON.parse(localStorage.getItem(KEY)||"null");
    return {
      saved:Array.isArray(obj?.saved)?obj.saved.filter((j:Job)=>j&&typeof j.url==="string"&&domainSafe(j.url)).slice(0,150):[],
      hidden:Array.isArray(obj?.hidden)?obj.hidden.filter((x:unknown)=>typeof x==="string").slice(0,1500):[]
    };
  }catch{return {saved:[],hidden:[]};}
}
function Evidence({fit}:{fit:Fit}){
  return <div className="evidence-columns">
    <section><h3><CheckCircle2 size={16}/> Why you're a fit</h3>
      {fit.positives.length?fit.positives.map((s,i)=><p key={i}>{s}</p>):<p>Not enough corroborated evidence yet.</p>}
    </section>
    <section><h3><SlidersHorizontal size={16}/> What to check</h3>
      {fit.cautions.length?fit.cautions.map((s,i)=><p key={i}>{s}</p>):<p>Review the posting for any unlisted qualifications and location restrictions.</p>}
    </section>
  </div>;
}
function Explain({job,onClose,onSave,isSaved}:{job:Job;onClose:()=>void;onSave:()=>void;isSaved:boolean}){
 const fit=fitJob(job);
 const pitch=job.track==="solutions"
  ?"Show your FIDx client requirement sessions, product demos and implementation meetings. Pair those examples with technical ownership."
  :job.track==="product"
    ?"Use Our Money App to explain how you identified a need, shipped a product and iterated. Tie it to FIDx discovery work; don't claim a formal PM role."
    :"Lead with FIDx's cross-team automation rollout and internal tooling. Pick a project with the tech stack closest to this job.";
 return <div className="detail-inner">
   <div className="detail-eyebrow"><span>ROLE INTELLIGENCE</span><button type="button" aria-label="Close job details" onClick={onClose}><X size={18}/></button></div>
   <div className="detail-company">{job.company}</div>
   <h2>{job.title}</h2>
   <div className="detail-location"><MapPin size={14}/>{job.location||"Location unknown"}</div>
   <div className="detail-hero-fit">
     <div className="detail-score">{fit.score}<small>/100</small></div>
     <div><strong>{fit.grade}</strong><span>{fit.eligibility==="Good"?"Qualifications appear plausible":fit.eligibility==="Check requirements"?"Review requirements carefully":"Substantial qualification mismatch"}</span><small>Prioritization score · not interview odds</small></div>
   </div>
   <Evidence fit={fit}/>
   <div className="pitch-box"><span><Sparkles size={16}/> YOUR APPLICATION ANGLE</span><p>{pitch}</p></div>
   {job.salary&&<div className="detail-pay"><span>Pay listed</span><strong>{job.salary}</strong></div>}
   <details className="description" open><summary>Job description <ChevronDown size={15}/></summary>
     <div className="description-body">{job.description||"This source did not provide the complete description. Verify requirements on the original posting."}</div>
   </details>
   <div className="detail-actions">
     <button type="button" className={isSaved?"save-button saved":"save-button"} onClick={onSave}>
       {isSaved?<BookmarkCheck size={18}/>:<Bookmark size={18}/>} {isSaved?"Saved — remove":"Save this job"}
     </button>
     <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="apply-button">Open application <ArrowUpRight size={18}/></a>
   </div>
   <p className="detail-disclosure">Source: {job.source}{job.source==="Himalayas"?" — job data provided by Himalayas":""}.
     {job.dateType==="published"?" Publication date is supplied by the job board.":job.dateType==="updated"?" Date indicates last update, not original publication.":" Publication date was not supplied."}
     {" "}Listings may close after retrieval.
   </p>
 </div>;
}
function Card({job,selected,saved,onChoose,onSave,onHide,now}:{job:Job;selected:boolean;saved:boolean;onChoose:()=>void;onSave:()=>void;onHide:()=>void;now:number}){
 const fit=fitJob(job);
 return <article className={"job-card"+(selected?" selected":"")}>
   <button type="button" className="job-main" onClick={onChoose} aria-label={"Show match details for "+job.title+" at "+job.company}>
     <div className="company-symbol">{job.company.charAt(0).toUpperCase()}</div>
     <div className="job-text">
       <div className="job-company">{job.company} <span>· {job.source}{job.source==="Himalayas"?" (remote)":""}</span></div>
       <h3>{job.title}</h3>
       <div className="job-location"><span><MapPin size={13}/>{job.location||"Location not supplied"}</span><span><Clock3 size={13}/>{freshLabel(job,now)}</span></div>
       <div className="job-tags"><span className={"level level-"+fit.grade.toLowerCase().replaceAll(" ","-")}>{fit.grade}</span>
          <span>{job.workplace}</span>{isSports(job)&&<span className="sports-tag">Sports / fitness</span>}</div>
     </div>
     <div className="score-stack"><strong>{fit.score}</strong><small>FIT</small></div>
   </button>
   <div className="job-actions"><span className="job-proof">{fit.positives.find(x=>x.startsWith("Technology overlap:"))||fit.positives[0]||"Read verified match details"}</span>
     <button type="button" onClick={onSave} className="icon-action" aria-label={saved?"Remove from saved jobs":"Save job"} title={saved?"Unsave":"Save"}>{saved?<BookmarkCheck size={17}/>:<Bookmark size={17}/>}</button>
     <button type="button" onClick={onHide} className="icon-action" aria-label="Hide this job" title="Hide"><X size={17}/></button>
     <a target="_blank" rel="noopener noreferrer" href={job.applyUrl} className="icon-action apply" title="Open application" aria-label="Open application"><ArrowUpRight size={17}/></a>
   </div>
 </article>;
}
export default function Home(){
 const [feed,setFeed]=useState<Feed|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 const [track,setTrack]=useState<Track|"all">("all");
 const [mode,setMode]=useState<Mode>("all");
 const [order,setOrder]=useState<Order>("best");
 const [freshDays,setFreshDays]=useState(3650);
 const [hideLongShots,setHideLongShots]=useState(true);
 const [scope,setScope]=useState<Scope>("discover");
 const [saved,setSaved]=useState<Job[]>([]);
 const [hidden,setHidden]=useState<string[]>([]);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [sourceOpen,setSourceOpen]=useState(false);
 const [showN,setShowN]=useState(24);
 const [now,setNow]=useState(Date.now());
 const [ready,setReady]=useState(false);
 useEffect(()=>{const state=initialData();setSaved(state.saved);setHidden(state.hidden);setReady(true);},[]);
 useEffect(()=>{if(ready)saveData(saved,hidden);},[saved,hidden,ready]);
 const load=useCallback(async()=>{
   try{
     const response=await fetch("/api/search",{cache:"no-store"});
     const value=await response.json() as Feed;
     if(!response.ok||!Array.isArray(value.jobs))throw new Error(value.message||"Public job feeds did not return valid results.");
     setFeed(value);setError("");
   }catch(e){setError(e instanceof Error?e.message:"Could not reach the search engine.");}
   finally{setLoading(false);}
 },[]);
 useEffect(()=>{
   void load();
   const poll=window.setInterval(()=>void load(),FETCH_EVERY);
   const clock=window.setInterval(()=>setNow(Date.now()),60_000);
   const visibility=()=>{if(document.visibilityState==="visible")void load();};
   document.addEventListener("visibilitychange",visibility);
   return()=>{window.clearInterval(poll);window.clearInterval(clock);document.removeEventListener("visibilitychange",visibility);};
 },[load]);
 const merged=useMemo(()=>{
   if(scope==="saved")return saved;
   return feed?.jobs??[];
 },[feed,saved,scope]);
 const savedIds=useMemo(()=>new Set(saved.map(x=>x.url)),[saved]);
 const hiddenIds=useMemo(()=>new Set(hidden),[hidden]);
 const results=useMemo(()=>{
   const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
   return merged.filter(j=>{
      if(hiddenIds.has(j.id))return false;
      if(track!=="all"&&j.track!==track)return false;
      if(mode==="nyc"&&(!/new york|nyc|brooklyn|queens|manhattan|jersey city|hoboken|newark|stamford|white plains|long island/i.test(j.location)||j.workplace==="Remote"))return false;
      if(mode==="remote"&&j.workplace!=="Remote")return false;
      if(hideLongShots&&fitJob(j).eligibility==="Likely mismatch")return false;
      if(freshDays!==3650){
        const age=ageDays(j.date,now);
        if(age===null||age>freshDays)return false;
      }
      const haystack=(j.title+" "+j.company+" "+j.location+" "+j.description.slice(0,2500)).toLowerCase();
      return terms.every(t=>haystack.includes(t));
   }).sort((a,b)=>{
      if(order==="sports"&&isSports(a)!==isSports(b))return isSports(a)?-1:1;
      if(order==="newest"){
        const aDate=Date.parse(a.date||"1970"),bDate=Date.parse(b.date||"1970");
        if(aDate!==bDate)return bDate-aDate;
      }
      return fitJob(b).sortPriority-fitJob(a).sortPriority||Date.parse(b.date||"1970")-Date.parse(a.date||"1970");
   });
 },[merged,query,track,mode,order,freshDays,hideLongShots,hiddenIds,now]);
 const selected=results.find(x=>x.id===selectedId)||results[0]||null;
 const fav=(job:Job)=>{
   setSaved(previous=>previous.some(x=>x.url===job.url)?previous.filter(x=>x.url!==job.url):[job,...previous].slice(0,150));
 };
 const dismiss=(id:string)=>setHidden(v=>[id,...v.filter(x=>x!==id)].slice(0,1500));
 const updateTrack=(x:Track|"all")=>{setTrack(x);setShowN(24);setSelectedId(null);};
 const reset=()=>{setQuery("");setTrack("all");setMode("all");setOrder("best");setFreshDays(3650);setHideLongShots(true);setShowN(24);};
 const isEmpty=results.length===0;
 const sourceCount=feed?.sourceCount;
 const strong=feed?.jobs.filter(x=>fitJob(x).grade==="Strong target").length??0;
 const viewed=results.slice(0,showN);
 return <div className="app">
   <header className="topbar">
      <div className="topbar-content">
        <div className="wordmark"><span className="wordmark-icon"><Compass size={23}/></span><span>career<span>OS</span><small>FIND YOUR NEXT SHOT</small></span></div>
        <nav className="topnav" aria-label="Main navigation">
          <button type="button" onClick={()=>{setScope("discover");setSelectedId(null);}} className={scope==="discover"?"active":""}>Discover</button>
          <button type="button" onClick={()=>{setScope("saved");setSelectedId(null);}} className={scope==="saved"?"active":""}>Saved <span className="saved-number">{saved.length}</span></button>
        </nav>
        <div className="topbar-right"><span className="free-label"><ShieldCheck size={14}/> FREE SEARCH</span><button type="button" title="Refresh jobs" aria-label="Refresh jobs" onClick={()=>void load()} className="refresh-icon"><RefreshCw size={18}/></button></div>
      </div>
   </header>
   <div className="container">
     <section className="hero">
       <div className="hero-kicker"><span className="active-dot"/> YOUR CAREER. ACTUAL OPPORTUNITIES.</div>
       <h1>Less scrolling.<br/><em>Better shots.</em></h1>
       <p>A job search that actually knows your background. Real NYC and US-remote openings, ranked by qualifications, experience, and what you've already proven you can do.</p>
     </section>
     <section className="query-area" aria-label="Job search">
       <div className="query-input"><Search size={22}/><input autoComplete="off" aria-label="Search jobs" placeholder="Search a role, company, skill, or industry…" value={query} onChange={e=>{setQuery(e.target.value);setShowN(24);}}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery("")}><X size={17}/></button>}</div>
       <div className="search-lanes">{TRACKS.map(x=><button key={x.key} className={track===x.key?"active":""} onClick={()=>updateTrack(x.key)}>{x.label}</button>)}</div>
     </section>
     <div className="subline">
       <div><span className="live-chip"><span/> {feed?"PUBLIC FEEDS":"CONNECTING"}</span> <strong>{feed?.jobs.length??"—"}</strong> <span>current source listings</span><span className="subdot">•</span> <strong>{feed?strong:"—"}</strong> <span>strong targets</span></div>
       <div className="subline-right"><span>{sourceCount?sourceCount.ok+"/"+sourceCount.total+" feeds responding":"Checking providers…"}</span>
         <span className="subline-dot">·</span><span>Refreshes while open</span></div>
     </div>
     {error&&<div className="status-warning"><strong>Latest refresh failed.</strong> {error} {feed?"Showing previous results.":""}<button onClick={()=>void load()}><RefreshCw size={15}/> Retry</button></div>}
     {feed?.status==="partial"&&<button type="button" className="source-warning" onClick={()=>setSourceOpen(x=>!x)}>{feed.sourceCount.total-feed.sourceCount.ok} sources unavailable; search results may be incomplete <ChevronDown size={14}/></button>}
     {sourceOpen&&<div className="sources-panel"><h3>Sources checked</h3><div>{feed?.sourceSummary.map(x=><span key={x.name} className={x.ok?"source-ok":"source-down"}>{x.ok?<Check size={12}/>:<X size={12}/>} {x.name} {x.ok?"("+x.matches+")":""}</span>)}</div></div>}
     <main className="workspace">
       <aside className={"filters"+(filtersOpen?" expanded":"")}>
         <div className="filter-heading"><span><Filter size={17}/> Refine your search</span><button type="button" onClick={reset}>Reset</button></div>
         {hidden.length>0&&<button type="button" className="restore-hidden" onClick={()=>setHidden([])}>Restore {hidden.length} hidden job{hidden.length===1?"":"s"} <ArrowRight size={14}/></button>}
         <div className="field"><label htmlFor="location-filter">Where</label><select id="location-filter" value={mode} onChange={e=>setMode(e.target.value as Mode)}>
           <option value="all">NYC + eligible remote</option><option value="nyc">NYC metro (non-remote)</option><option value="remote">Remote (US eligible)</option>
         </select></div>
         <div className="field"><label htmlFor="date-filter">Date</label><select id="date-filter" value={freshDays} onChange={e=>setFreshDays(Number(e.target.value))}>
           <option value={3650}>All currently listed</option><option value={1}>Last 24 hours</option><option value={3}>Last 3 days</option><option value={7}>Last week</option><option value={30}>Last month</option>
         </select><small>Published time if available; otherwise updated time.</small></div>
         <label className="check-filter"><input type="checkbox" checked={hideLongShots} onChange={e=>setHideLongShots(e.target.checked)}/><span><strong>Only realistic targets</strong><small>Exclude clear seniority, tenure, or geographic mismatches</small></span></label>
         <div className="profile-summary"><span className="profile-overline">MATCHED TO YOUR ACTUAL BACKGROUND</span><h3>Built for your next move.</h3><p>{CANDIDATE.degree} · Full-stack development and company-wide automation leadership at FIDx · Broker-dealer requirements and client demos.</p><div className="profile-stack"><span>TypeScript</span><span>Python</span><span>SQL</span><span>React</span><span>Client-facing</span></div><small>The fit score is a transparent heuristic, never an interview probability. It uses only verified career facts.</small></div>
         <div className="source-credit"><strong><ShieldCheck size={16}/> No new subscriptions</strong><p>Public employer postings via Ashby and Greenhouse. Remote openings credited to <a target="_blank" rel="noopener noreferrer" href="https://himalayas.app">Himalayas</a>. No LinkedIn scraping, paid API, or ChatGPT key.</p></div>
       </aside>
       <section className="search-results" aria-label="Search results">
         <div className="results-top">
           <div><span className="results-eyebrow">{scope==="saved"?"YOUR SHORTLIST":"RANKED FOR YOU"}</span><h2>{scope==="saved"?"Jobs you've saved":"Your best opportunities"} <span>{loading&&!feed?"":results.length}</span></h2></div>
           <label className="sort"><ArrowDownUp size={15}/><select aria-label="Sort search results" value={order} onChange={e=>setOrder(e.target.value as Order)}><option value="best">Best fit</option><option value="newest">Newest</option><option value="sports">Sports & fitness first</option></select></label>
         </div>
         <button type="button" className="mobile-filter" onClick={()=>setFiltersOpen(x=>!x)}><SlidersHorizontal size={17}/> {filtersOpen?"Hide filters":"Filters"}</button>
         {loading&&!feed&&<div className="empty"><RefreshCw size={25} className="spin"/><h3>Searching available jobs…</h3><p>Reading public employer listings and checking which roles match your experience.</p></div>}
         {!loading&&isEmpty&&<div className="empty"><Target size={29}/><h3>{scope==="saved"?"Your shortlist is empty":"No matches found"}</h3><p>{scope==="saved"?"Save jobs that look worth pursuing; they'll stay here in your browser.":"Try broadening the date or title filters. We won't invent jobs to fill the results."}</p><button type="button" onClick={scope==="saved"?()=>setScope("discover"):reset}>{scope==="saved"?"Explore openings":"Clear filters"} <ArrowRight size={14}/></button></div>}
         {viewed.map(job=><Card key={job.id} job={job} now={now} selected={selected?.id===job.id} saved={savedIds.has(job.url)}
            onChoose={()=>setSelectedId(job.id)} onSave={()=>fav(job)} onHide={()=>dismiss(job.id)}/>)}
         {results.length>showN&&<button type="button" className="load-more" onClick={()=>setShowN(x=>x+24)}>Show more ({results.length-showN} remaining) <ChevronDown size={16}/></button>}
         {feed&&<p className="results-disclaimer">Showing current public-source listings, not every job on the internet. Check employer requirements before applying. Fit scores are not predicted employer decisions.</p>}
       </section>
       <aside className={"details"+(selectedId&&selected?" mobile-visible":"")}>
         {selected?<Explain key={selected.id} job={selected} isSaved={savedIds.has(selected.url)} onClose={()=>setSelectedId(null)} onSave={()=>fav(selected)}/>:<div className="detail-empty"><Zap size={27}/><h3>Every match, explained.</h3><p>Choose a role to see where your background aligns—and the requirements you should verify before spending time applying.</p></div>}
       </aside>
     </main>
     <footer className="footer"><span><Compass size={16}/> careerOS</span><p>Find the work. Make the case. Keep the search free.</p><a href="https://github.com/joestella99/career-OS" target="_blank" rel="noopener noreferrer">Source code <ExternalLink size={14}/></a></footer>
   </div>
 </div>;
}

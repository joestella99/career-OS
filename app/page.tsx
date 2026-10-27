"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {
  ArrowDownUp,ArrowRight,ArrowUpRight,Bookmark,BookmarkCheck,BriefcaseBusiness,
  Check,ChevronDown,ChevronRight,Clock3,Compass,ExternalLink,Filter,Heart,
  MapPin,RefreshCw,Search,ShieldCheck,SlidersHorizontal,Sparkles,Target,
  TrendingUp,X,Zap
} from "lucide-react";
import {
  DEFAULT_PREFS,filterAndSort,jobAgeDays,rankJob,
  type SearchFilters,type SearchJob,type Track
} from "@/lib/job-search";

type ApiResult={jobs:SearchJob[];sources:[number,number];status:"ok"|"partial"|"unavailable";checkedAt:string;limitations:string};
type Tab="discover"|"shortlist";
const SAVE_KEY="careeros_shortlist_v2";
const PREF_KEY="careeros_filters_v2";
const FIFTEEN_MINUTES=15*60*1000;
const TRACKS:[Track|"all",string][]=[
  ["all","Best for me"],["engineering","Software engineer"],["solutions","Solutions / implementation"],["product","Product / APM"]
];
const AGE_OPTIONS=[
  {days:3,label:"Last 3 days"},{days:7,label:"Last 7 days"},
  {days:30,label:"Last 30 days"},{days:3650,label:"Any date"}
] as const;
const emptyResult:ApiResult={jobs:[],sources:[0,0],status:"unavailable",checkedAt:"",limitations:""};
function timeAgo(date:string|null,kind:SearchJob["dateKind"],now:number):string{
 if(!date)return "Publication date unknown";
 const age=Math.max(0,now-Date.parse(date));
 const hours=Math.floor(age/3600000),days=Math.floor(age/86400000);
 const label=hours<1?"within an hour":hours<24?`${hours}h ago`:`${days}d ago`;
 return `${kind==="published"?"Published":"Updated"} ${label}`;
}
function safeLink(url:string):boolean{
 try{return new URL(url).protocol==="https:";}catch{return false;}
}
function localSaved():SearchJob[]{
 try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)||"[]");
   return Array.isArray(data)?data.filter(x=>x&&typeof x==="object"&&typeof x.url==="string"&&safeLink(x.url)).slice(0,150):[];
 }catch{return [];}
}
function localFilters():SearchFilters{
 try{
   const obj=JSON.parse(localStorage.getItem(PREF_KEY)||"null") as Partial<SearchFilters>|null;
   if(!obj)return {...DEFAULT_PREFS};
   return {...DEFAULT_PREFS,...obj,text:"",sort:obj.sort==="recent"?"recent":"fit"};
 }catch{return {...DEFAULT_PREFS};}
}
function sourceLabel(job:SearchJob):string{
 return job.source==="Himalayas"?"Himalayas · remote":job.source+" · employer";
}
function profileEvidence(role:Track):string{
 if(role==="engineering")return "Lead with your FIDx company-wide test automation work and full-stack internal tools. Show Our Money App for product engineering and BatOracle for Python/data.";
 if(role==="solutions")return "Lead with your broker-dealer discovery meetings, demos, requirements translation, and implementation work. Pair it with engineering ownership.";
 return "Lead with requirements discovery, cross-team automation rollout, and product iteration in Our Money App. Do not claim a formal PM title.";
}
function Score({job}:{job:SearchJob}){
 const fit=rankJob(job);
 return <div className={`fit-score ${fit.score>=82?"top":fit.score>=68?"medium":"low"}`}>
   <strong>{fit.score}</strong><small>/100</small>
 </div>;
}
export default function CareerSearch(){
 const [result,setResult]=useState<ApiResult>(emptyResult);
 const [state,setState]=useState<"loading"|"ready"|"failed">("loading");
 const [error,setError]=useState("");
 const [filters,setFilters]=useState<SearchFilters>(DEFAULT_PREFS);
 const [saved,setSaved]=useState<SearchJob[]>([]);
 const [tab,setTab]=useState<Tab>("discover");
 const [selected,setSelected]=useState<string|null>(null);
 const [shown,setShown]=useState(30);
 const [mobileFilters,setMobileFilters]=useState(false);
 const [now,setNow]=useState(Date.now());
 const [hydrated,setHydrated]=useState(false);
 const busy=useRef(false);
 const inputRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{setSaved(localSaved());setFilters(localFilters());setHydrated(true);},[]);
 useEffect(()=>{if(hydrated)localStorage.setItem(PREF_KEY,JSON.stringify(filters));},[filters,hydrated]);
 useEffect(()=>{if(hydrated)localStorage.setItem(SAVE_KEY,JSON.stringify(saved));},[saved,hydrated]);
 const refresh=useCallback(async()=>{
   if(busy.current)return;busy.current=true;
   setState(current=>current==="ready"?"ready":"loading");
   try{
     const response=await fetch("/api/search",{cache:"no-store"});
     const data=await response.json() as ApiResult&{message?:string};
     if(!response.ok||!Array.isArray(data.jobs))throw Error(data.message||"Sources unavailable. Try refreshing.");
     const clean=data.jobs.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string"&&typeof x.url==="string"&&safeLink(x.url));
     setResult({...data,jobs:clean});setState("ready");setError("");
   }catch(e){setError(e instanceof Error?e.message:"Search couldn't refresh.");setState("failed");}
   finally{busy.current=false;}
 },[]);
 useEffect(()=>{
   void refresh();
   const timer=window.setInterval(()=>void refresh(),FIFTEEN_MINUTES);
   const focus=()=>{if(document.visibilityState==="visible")void refresh();};
   document.addEventListener("visibilitychange",focus);
   const tick=window.setInterval(()=>setNow(Date.now()),60000);
   return()=>{window.clearInterval(timer);window.clearInterval(tick);document.removeEventListener("visibilitychange",focus);};
 },[refresh]);
 const searchResults=useMemo(()=>filterAndSort(result.jobs,filters,now),[result.jobs,filters,now]);
 const savedIds=new Set(saved.map(s=>s.url.replace(/\/$/,"")));
 const displayed=tab==="discover"?searchResults:saved.filter(job=>
   !filters.text.trim()||[job.company,job.title,job.description].join(" ").toLowerCase().includes(filters.text.toLowerCase().trim())
 );
 const visible=displayed.slice(0,shown);
 const current=visible.find(j=>j.id===selected)||visible[0]||null;
 const scored=useMemo(()=>result.jobs.map(rankJob),[result.jobs]);
 const highCount=scored.filter(s=>s.score>=82).length;
 const goodCount=scored.filter(s=>s.score>=68).length;
 const setFilter=<K extends keyof SearchFilters>(key:K,value:SearchFilters[K])=>{
   setFilters(old=>({...old,[key]:value}));setShown(30);setSelected(null);
 };
 const addSave=(job:SearchJob)=>{
   setSaved(previous=>savedIds.has(job.url.replace(/\/$/,""))
    ?previous.filter(x=>x.url.replace(/\/$/,"")!==job.url.replace(/\/$/,""))
    :[job,...previous].slice(0,150)
   );
 };
 const openList=(next:Tab)=>{setTab(next);setShown(30);setSelected(null);};
 const reset=()=>{setFilters({...DEFAULT_PREFS});setShown(30);setSelected(null);};
 const total=result.jobs.length;
 return <div className="search-app">
   <header className="search-navbar">
     <div className="search-mark"><div className="search-logo"><Compass size={23} strokeWidth={2.6}/></div><div><strong>career<span>OS</span></strong><small>THE OPPORTUNITY ENGINE</small></div></div>
     <nav aria-label="Views" className="search-nav">
       <button className={tab==="discover"?"nav-active":""} onClick={()=>openList("discover")}>Discover</button>
       <button className={tab==="shortlist"?"nav-active":""} onClick={()=>openList("shortlist")}>Shortlist <span>{saved.length}</span></button>
     </nav>
     <div className="navbar-right"><span className="free-stamp"><ShieldCheck size={14}/> FREE SOURCES</span><button onClick={()=>void refresh()} className="nav-refresh" title="Refresh jobs" aria-label="Refresh jobs"><RefreshCw size={18}/></button></div>
   </header>

   <main className="search-container">
     <div className="search-intro">
       <div className="eyebrow"><span className="pulse"/> BUILT AROUND YOUR EXPERIENCE</div>
       <h1>Find the job you can <em>actually win.</em></h1>
       <p>Real openings, matched to your engineering work, client experience, and product projects. Ranked for realistic interview fit—not company prestige or job-board noise.</p>
     </div>

     <section className="search-panel" aria-label="Job search">
       <div className="search-field"><Search size={22}/><input ref={inputRef} value={filters.text} onChange={e=>setFilter("text",e.target.value)} placeholder="Search company, role, technology, or keyword…" aria-label="Search opportunities"/>
       {filters.text&&<button aria-label="Clear search" onClick={()=>setFilter("text","")}><X size={17}/></button>}</div>
       <button className="search-filter-mobile" onClick={()=>setMobileFilters(!mobileFilters)}><SlidersHorizontal size={17}/> Filters</button>
       <div className="quick-tracks">
         {TRACKS.map(([value,label])=><button key={value} className={filters.track===value?"active":""} onClick={()=>setFilter("track",value)}>{label}</button>)}
       </div>
     </section>

     <div className="search-summary">
       <div className="summary-left"><span className="search-live"><span/> LIVE EMPLOYER FEEDS</span>
         <strong>{state==="ready"?total:"—"}</strong><span>unique roles indexed</span>
         <span className="summary-separator">/</span><strong>{state==="ready"?highCount:"—"}</strong><span>strong matches</span>
       </div>
       <div className="summary-right">
         <span><Clock3 size={14}/>{result.checkedAt?`Checked ${new Date(result.checkedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:"Syncing…"}</span>
         <span>{result.sources[1]}/{result.sources[0]} feeds connected</span>
       </div>
     </div>

     {state==="failed"&&<div className="search-alert"><strong>Some or all sources couldn't load.</strong><span>{error} {total?"Previous results remain on screen.":""}</span><button onClick={()=>void refresh()}>Retry <RefreshCw size={14}/></button></div>}
     {result.status==="partial"&&state==="ready"&&<div className="search-notice">Some company boards are unavailable at this check. Results are partial, not exhaustive.</div>}

     <div className="search-workspace">
       <aside className={`filter-sidebar ${mobileFilters?"filter-expanded":""}`}>
         <div className="filter-top"><strong><Filter size={16}/> Fine-tune matches</strong><button onClick={reset}>Reset</button></div>
         <div className="filter-unit"><label htmlFor="work-select">Work arrangement</label>
           <select id="work-select" value={filters.mode} onChange={e=>setFilter("mode",e.target.value as SearchFilters["mode"])}>
             <option value="all">NYC + US remote</option><option value="onsite-hybrid">NYC / office or hybrid</option><option value="remote">Remote / US eligible</option>
           </select>
         </div>
         <div className="filter-unit"><label htmlFor="age-select">Posting recency</label>
           <select id="age-select" value={filters.maxDays} onChange={e=>setFilter("maxDays",Number(e.target.value))}>
             {AGE_OPTIONS.map(x=><option key={x.days} value={x.days}>{x.label}</option>)}
           </select>
           <small>Greenhouse dates reflect updates, not original publication.</small>
         </div>
         <div className="filter-unit"><label htmlFor="source-select">Data source</label>
           <select id="source-select" value={filters.sources} onChange={e=>setFilter("sources",e.target.value as SearchFilters["sources"])}>
             <option value="all">All free sources</option><option value="Ashby">Ashby company boards</option><option value="Greenhouse">Greenhouse company boards</option><option value="Himalayas">Himalayas remote</option>
           </select>
         </div>
         <label className="filter-check"><input type="checkbox" checked={filters.hideStretch} onChange={e=>setFilter("hideStretch",e.target.checked)}/>
           <span><strong>Prioritize attainable jobs</strong><small>Hide low-fit stretch roles</small></span>
         </label>
         <div className="filter-explain">
           <Target size={20}/><strong>How ranking works</strong>
           <p>We compare posted requirements to verified FIDx experience, your technical projects, degree, and preferred work environment. Senior titles, large experience gaps, and unverified skills reduce the score.</p>
           <p><b>Not an interview probability.</b> We need application/interview outcomes to calibrate that.</p>
         </div>
         <div className="filter-sources"><span>FREE LIVE DATA</span><p>Ashby and Greenhouse public company boards · Himalayas remote listings</p><p>No paid API keys or ChatGPT usage.</p></div>
       </aside>

       <section className="results-column" aria-label="Ranked jobs">
         <div className="results-header">
           <div><span className="section-kicker">{tab==="discover"?"YOUR RANKED OPPORTUNITIES":"YOUR CURATED SHORTLIST"}</span>
             <h2>{tab==="discover"?"Best opportunities for you":"Roles worth pursuing"} <span>{displayed.length}</span></h2></div>
           <div className="results-sort"><ArrowDownUp size={15}/><select aria-label="Sort jobs" value={filters.sort} onChange={e=>setFilter("sort",e.target.value as SearchFilters["sort"])}><option value="fit">Best fit first</option><option value="recent">Most recent first</option></select></div>
         </div>
         {state==="loading"&&<div className="results-empty"><RefreshCw className="rotating" size={24}/><h3>Searching verified public job feeds…</h3><p>Comparing real openings against your proven experience.</p></div>}
         {state!=="loading"&&displayed.length===0&&<div className="results-empty"><Search size={25}/><h3>No jobs match these filters</h3><p>{tab==="shortlist"?"Save promising roles from Discover to build a shortlist.":"Try the last 30 days, another role track, or enable stretch roles. We won't fabricate matches."}</p><button className="button-dark" onClick={()=>tab==="shortlist"?openList("discover"):reset()}> {tab==="shortlist"?"Browse opportunities":"Clear filters"} <ArrowRight size={15}/></button></div>}
         {state!=="loading"&&visible.map((job,index)=>{
           const fit=rankJob(job),selectedNow=current?.id===job.id;
           const isSaved=savedIds.has(job.url.replace(/\/$/,""));
           return <article key={job.id} className={`result-card ${selectedNow?"card-selected":""}`} onClick={()=>setSelected(job.id)}>
             <div className="result-card-main">
               <div className="result-symbol">{job.company.slice(0,1).toUpperCase()}</div>
               <div className="result-body">
                 <div className="result-company">{job.company}<span>·</span>{sourceLabel(job)}</div>
                 <h3>{job.title}</h3>
                 <div className="result-meta"><span><MapPin size={13}/>{job.location||"Location not stated"}</span><span><Clock3 size={13}/>{timeAgo(job.date,job.dateKind,now)}</span></div>
                 <div className="result-signals">
                   <span className={`tier tier-${fit.tier.toLowerCase().replace(" ","-")}`}>{fit.tier}</span>
                   <span>{fit.role==="engineering"?"Engineering":fit.role==="solutions"?"Solutions":"Product"}</span>
                   {job.workMode!=="Unknown"&&<span>{job.workMode}</span>}
                   {(/sports|fitness|athlet|gaming/i.test(job.sector))&&<span>Sports / fitness</span>}
                 </div>
                 <p className="result-why">{fit.evidence[0]||"Relevant role"}{fit.evidence[1]?" · "+fit.evidence[1]:""}</p>
               </div>
               <div className="result-score"><Score job={job}/><small>fit score</small></div>
             </div>
             <div className="result-card-actions">
               <button onClick={e=>{e.stopPropagation();addSave(job);}} className={isSaved?"small-save is-saved":"small-save"}>{isSaved?<BookmarkCheck size={15}/>:<Bookmark size={15}/>} {isSaved?"Saved":"Shortlist"}</button>
               <button onClick={e=>{e.stopPropagation();setSelected(job.id);}} className="small-detail">Why this job <ChevronRight size={15}/></button>
               {safeLink(job.applyUrl)&&<a onClick={e=>e.stopPropagation()} href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="small-apply">Apply <ArrowUpRight size={15}/></a>}
             </div>
           </article>;
         })}
         {displayed.length>shown&&<button className="show-more" onClick={()=>setShown(n=>n+30)}>Show more matched jobs <ChevronDown size={17}/></button>}
         <p className="results-foot">Showing real openings returned by available sources. Job availability may change. Rank is rule-based fit, not an employer response forecast.</p>
       </section>

       <aside className="insights-sidebar">
         {current?(()=>{
           const fit=rankJob(current);
           return <div className="detail-sticky">
             <div className="detail-heading"><span>THE FIT BREAKDOWN</span><button onClick={()=>setSelected(null)} aria-label="Select top result"><Target size={16}/></button></div>
             <div className="detail-company">{current.company}</div>
             <h2>{current.title}</h2>
             <div className="detail-score-row"><Score job={current}/><div><strong>{fit.tier}</strong><small>Evidence-based relevance, not interview odds</small></div></div>
             <div className="detail-block"><h3><Check size={17}/> Why you're competitive</h3>
               {fit.evidence.length?fit.evidence.map((v,i)=><p key={i}>{v}</p>):<p>Not enough verified overlap yet.</p>}
             </div>
             <div className="detail-block caution"><h3><SlidersHorizontal size={17}/> What to verify</h3>
               {fit.gaps.length?fit.gaps.map((v,i)=><p key={i}>{v}</p>):<p>Review the full requirements and employer location policy before applying.</p>}
             </div>
             <div className="detail-block"><h3><Sparkles size={17}/> Your strongest application angle</h3><p>{profileEvidence(fit.role)}</p></div>
             {current.salary&&<div className="detail-salary"><span>Compensation listed</span><strong>{current.salary}</strong></div>}
             <details className="detail-description"><summary>Read the job description <ChevronDown size={15}/></summary><div>{current.description||"This employer feed did not supply a description."}</div></details>
             <div className="detail-actions">
               <button className="button-outline" onClick={()=>addSave(current)}>{savedIds.has(current.url.replace(/\/$/,""))?<BookmarkCheck size={17}/>:<Bookmark size={17}/>} {savedIds.has(current.url.replace(/\/$/,""))?"Remove from shortlist":"Save to shortlist"}</button>
               {safeLink(current.applyUrl)&&<a className="button-dark" href={current.applyUrl} target="_blank" rel="noopener noreferrer">Go to application <ArrowUpRight size={17}/></a>}
             </div>
             <p className="detail-source">Source: <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer">{current.source}</a>. Retrieved from a public job feed; employer review is not guaranteed.</p>
           </div>;
         })():<div className="detail-sticky blank-detail"><Target size={27}/><h3>Your career match, explained</h3><p>Select a job to see why it fits, what gaps to watch for, and how to position your experience.</p></div>}
       </aside>
     </div>
     <footer className="search-footer"><div><Compass size={18}/> careerOS</div><span>Search first. Evidence always. No paid search or model calls.</span><a href="https://github.com/joestella99/career-OS" target="_blank" rel="noopener noreferrer">Source code <ExternalLink size={13}/></a></footer>
   </main>
 </div>;
}

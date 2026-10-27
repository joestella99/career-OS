"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {ArrowUpRight,BookmarkCheck,BriefcaseBusiness,Check,ChevronDown,Clock3,Eye,EyeOff,Radio,RefreshCw,Search,ShieldCheck,Sparkles} from "lucide-react";
import {REFRESH_INTERVAL_MS,type LiveJob} from "@/lib/live-jobs";

type FeedPayload={status:string;message?:string;checkedAt?:string;jobs?:LiveJob[];boardsChecked?:number;boardsWorking?:number};
type Props={trackedUrls:string[];onSaveJob:(job:LiveJob,description?:string,salary?:string)=>void;onSeePipeline:()=>void;accessKey?:string;onNeedAccess?:()=>void};
const SEEN_KEY="careeros_fresh_seen_v3";
const HIDDEN_KEY="careeros_fresh_hidden_v3";
const SENIOR=/\b(senior|sr\.?|staff|principal|lead|manager|director|architect|head of)\b/i;
const AGE_WINDOWS=[{minutes:60,label:"Past hour"},{minutes:1440,label:"Past 24 hours"},{minutes:10080,label:"Past 7 days"}] as const;
function readLocal(key:string):string[]{try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string").slice(-1000):[];}catch{return [];}}
function elapsedLabel(minutes:number){if(minutes<1)return "Just posted";if(minutes<60)return `${minutes}m ago`;if(minutes<1440)return `${Math.floor(minutes/60)}h ago`;return `${Math.floor(minutes/1440)}d ago`;}
function cleanUrl(u:string){try{const value=new URL(u);return value.origin+value.pathname.replace(/\/$/,"");}catch{return u;}}

export default function LinkedInFreshFeed({trackedUrls,onSaveJob,onSeePipeline}:Props){
  const [jobs,setJobs]=useState<LiveJob[]>([]);
  const [status,setStatus]=useState<"idle"|"loading"|"ready"|"error">("idle");
  const [message,setMessage]=useState("");
  const [checkedAt,setCheckedAt]=useState("");
  const [boardCount,setBoardCount]=useState(0);
  const [boardOK,setBoardOK]=useState(0);
  const [seen,setSeen]=useState<string[]>([]);
  const [hidden,setHidden]=useState<string[]>([]);
  const [includeSenior,setIncludeSenior]=useState(false);
  const [showSeen,setShowSeen]=useState(true);
  const [ageWindow,setAgeWindow]=useState<number>(60);
  const [query,setQuery]=useState("");
  const [clock,setClock]=useState(Date.now());
  const [expanded,setExpanded]=useState<string|null>(null);
  const [previousCheck,setPreviousCheck]=useState<string|null>(null);
  const busy=useRef(false);
  const initialized=useRef(false);
  const previousIds=useRef<Set<string>>(new Set());

  useEffect(()=>{setSeen(readLocal(SEEN_KEY));setHidden(readLocal(HIDDEN_KEY));},[]);
  const markSeen=(id:string)=>setSeen(prev=>{const next=[...new Set([...prev,id])].slice(-1000);localStorage.setItem(SEEN_KEY,JSON.stringify(next));return next;});
  const dismiss=(id:string)=>setHidden(prev=>{const next=[...new Set([...prev,id])].slice(-1000);localStorage.setItem(HIDDEN_KEY,JSON.stringify(next));return next;});
  const load=useCallback(async()=>{
    if(busy.current)return;
    busy.current=true;
    setStatus(previous=>previous==="ready"?"ready":"loading");
    try{
      const response=await fetch("/api/jobs/live",{cache:"no-store"});
      const payload=await response.json() as FeedPayload;
      if(!response.ok||payload.status!=="ok"||!Array.isArray(payload.jobs))throw new Error(payload.message||"Could not fetch public job boards");
      const valid=payload.jobs.filter(j=>j && typeof j.id==="string" && typeof j.postedAt==="string" && j.source==="Ashby public job board");
      const freshIds=new Set(valid.map(j=>j.id));
      const recentNew=initialized.current?valid.filter(j=>!previousIds.current.has(j.id)): [];
      previousIds.current=freshIds;
      if(recentNew.length) setPreviousCheck(`${recentNew.length} new role${recentNew.length===1?"":"s"} since the previous check`);
      initialized.current=true;
      setJobs(valid);
      setCheckedAt(payload.checkedAt||new Date().toISOString());
      setBoardCount(payload.boardsChecked||0);
      setBoardOK(payload.boardsWorking||0);
      setStatus("ready");
      setMessage("");
    }catch(error){setStatus("error");setMessage(error instanceof Error?error.message:"Could not load openings");}
    finally{busy.current=false;}
  },[]);
  useEffect(()=>{
    void load();
    const timer=window.setInterval(()=>void load(),REFRESH_INTERVAL_MS);
    const onVisible=()=>{if(document.visibilityState==="visible")void load();};
    document.addEventListener("visibilitychange",onVisible);
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);};
  },[load]);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),30000);return ()=>window.clearInterval(timer);},[]);

  const existing=useMemo(()=>new Set(trackedUrls.map(cleanUrl)),[trackedUrls]);
  const filtered=useMemo(()=>jobs.filter(job=>{
    const postedMs=Date.parse(job.postedAt);
    const age=(clock-postedMs)/60000;
    if(!Number.isFinite(postedMs)||age<0||age>ageWindow)return false;
    if(hidden.includes(job.id) || (!showSeen&&seen.includes(job.id)))return false;
    if(!includeSenior&&SENIOR.test(job.title))return false;
    if(query&&!([job.title,job.company,job.location,job.description].join(" ").toLowerCase().includes(query.toLowerCase())))return false;
    return true;
  }),[jobs,clock,ageWindow,hidden,showSeen,seen,includeSenior,query]);
  const unseen=filtered.filter(j=>!seen.includes(j.id)).length;
  const lastCheck=checkedAt?Math.max(0,Math.floor((clock-Date.parse(checkedAt))/60000)):null;

  return <div className="auto-feed">
    <header className="auto-head">
      <div><div className="fresh-eyebrow"><Radio size={14}/> FREE AUTOMATED INTAKE · NYC SOFTWARE ENGINEERING</div>
        <h1>Fresh jobs. <em>Right here.</em></h1>
        <p>Current software engineering openings flow directly from public company job boards into CareerOS. No subscriptions, provider credentials, or searching six separate pages.</p>
      </div>
      <div className="auto-status"><span className={`auto-dot ${status==="ready"?"ready":"offline"}`}/>
        <strong>{status==="ready"?"Monitoring while open":status==="loading"?"Checking job boards…":"Feed unavailable"}</strong>
        <small>{checkedAt?`Checked ${lastCheck===0?"just now":`${lastCheck}m ago`}`:"No successful check yet"}</small>
        {boardCount>0&&<small>{boardOK}/{boardCount} boards reachable</small>}
      </div>
    </header>
    <div className="auto-toolbar">
      <div className="auto-tally"><Clock3 size={18}/><strong>{filtered.length}</strong><span>roles in selected window</span><span className="auto-separator">·</span><span>{unseen} not yet opened</span></div>
      <div className="auto-actions"><button type="button" className="btn btn-outline" onClick={()=>void load()} disabled={status==="loading"}><RefreshCw size={15}/> Refresh feed</button></div>
    </div>
    <div className="auto-layout">
      <section className="auto-feed-main">
        <div className="auto-controls">
          <div className="fresh-input-wrap"><Search size={16}/><input aria-label="Filter roles" placeholder="Search by company, stack, or title" value={query} onChange={event=>setQuery(event.target.value)}/></div>
          <select aria-label="Published within" value={ageWindow} onChange={e=>setAgeWindow(Number(e.target.value))}>{AGE_WINDOWS.map(x=><option key={x.minutes} value={x.minutes}>{x.label}</option>)}</select>
          <label><input type="checkbox" checked={showSeen} onChange={e=>setShowSeen(e.target.checked)}/> Include seen</label>
          <label><input type="checkbox" checked={includeSenior} onChange={e=>setIncludeSenior(e.target.checked)}/> Include senior roles</label>
        </div>
        {previousCheck&&<p className="fresh-desc">{previousCheck}</p>}
        {status==="error"&&<div className="auto-empty"><RefreshCw size={30}/><h2>Feed temporarily unavailable</h2><p>{message}</p><button className="btn btn-primary" onClick={()=>void load()}>Try again</button></div>}
        {status==="loading"&&<div className="auto-empty"><RefreshCw size={28} className="auto-spin"/><h2>Reading public job boards…</h2><p>Checking actual publication dates, NYC locations, and software engineering titles.</p></div>}
        {status==="ready"&&filtered.length===0&&<div className="auto-empty"><Eye size={30}/><h2>No matches in this window</h2>
          <p>The selected boards have no matching roles published in this time window, or you've hidden them. Try the past 24 hours or 7 days. The feed will keep checking while CareerOS is open.</p>
          <button className="btn btn-primary" onClick={()=>setAgeWindow(10080)}>See the past 7 days</button></div>}
        {status==="ready"&&filtered.map(job=><article key={job.id} className="auto-job">
          <div className="auto-job-top"><div className="auto-logo">{job.company[0]?.toUpperCase()}</div><div className="auto-job-info"><button className="auto-title" onClick={()=>{setExpanded(expanded===job.id?null:job.id);markSeen(job.id);}}>{job.title} <ChevronDown size={16}/></button><div className="auto-company">{job.company} · {job.location}</div></div><span className="auto-age">{elapsedLabel(Math.max(0,Math.floor((clock-Date.parse(job.postedAt))/60000)))}</span></div>
          <div className="auto-tags"><span>{job.workMode}</span><span>Direct employer listing</span><span>{seen.includes(job.id)?"Seen":"New to you"}</span></div>
          {expanded===job.id&&<div className="auto-description"><strong>{job.salary||"Compensation not supplied"}</strong><p style={{whiteSpace:"pre-wrap"}}>{job.description||"Description unavailable from the employer's public board."}</p><small>Published {new Date(job.postedAt).toLocaleString()}. This timestamp is the last publication time provided by the employer's ATS.</small></div>}
          <div className="auto-job-actions">
            <button className="btn btn-primary" disabled={existing.has(cleanUrl(job.url))} onClick={()=>{onSaveJob(job,job.description,job.salary);markSeen(job.id);}}>{existing.has(cleanUrl(job.url))?<BookmarkCheck size={16}/>:<Check size={16}/>} {existing.has(cleanUrl(job.url))?"Saved":"Save to pipeline"}</button>
            <button className="btn btn-outline" onClick={()=>{setExpanded(expanded===job.id?null:job.id);markSeen(job.id);}}>Description <ChevronDown size={14}/></button>
            <a className="btn btn-outline" href={job.applyUrl||job.url} target="_blank" rel="noopener noreferrer">Apply <ArrowUpRight size={15}/></a>
            <button type="button" className="auto-dismiss" title="Hide this opening" aria-label={`Hide ${job.title}`} onClick={()=>dismiss(job.id)}><EyeOff size={16}/></button>
          </div>
        </article>)}
      </section>
      <aside className="auto-aside">
        <div className="surface"><div className="eyebrow muted">NO EXTRA COST</div><h3>Free company feeds</h3>
          <p>CareerOS checks selected Ashby-powered employer boards, including sports technology and NYC product companies. The default window is one hour; choose 24 hours or seven days when it's quiet.</p>
          <p><strong>Refresh:</strong> every five minutes while this page stays open, plus when you return.</p>
          <p><strong>Storage:</strong> seen and hidden jobs remain in this browser. Saved roles go to your pipeline.</p>
          <button className="fresh-view-pipeline" onClick={onSeePipeline}>Your saved applications <BriefcaseBusiness size={15}/></button>
        </div>
        <div className="surface"><Sparkles size={20}/><h3>What this does not claim</h3>
          <p>These are direct employer applications—not verified LinkedIn Easy Apply listings. The feed covers selected companies, not the entire NYC job market.</p>
          <small>No background collection while the app is closed, no automatic applications, no paid AI or job-feed requests, and no fake results. Vercel Hobby usage limits still apply.</small>
          <p><ShieldCheck size={15}/> Read-only public sources. No login required.</p>
        </div>
      </aside>
    </div>
  </div>;
}

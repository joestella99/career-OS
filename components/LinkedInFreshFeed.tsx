"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,Bell,BookmarkCheck,BriefcaseBusiness,Check,ChevronDown,Clock3,ExternalLink,Eye,EyeOff,Radio,RefreshCw,Search,ShieldCheck,Sparkles} from 'lucide-react';
import type {LiveJob} from '@/lib/live-jobs';
import {REFRESH_INTERVAL_MS} from '@/lib/live-jobs';

type FeedPayload={status:string;message?:string;checkedAt?:string;jobs?:LiveJob[];windowMinutes?:number};
type Props={trackedUrls:string[];onSaveJob:(job:LiveJob,description?:string,salary?:string)=>void;accessKey:string;onNeedAccess:()=>void;onSeePipeline:()=>void};
const SEEN_KEY='careeros_fresh_seen_v2';
const DISMISSED_KEY='careeros_fresh_dismissed_v2';
const SENIOR=/\b(senior|sr\.?|staff|principal|lead|manager|director|architect|head of)\b/i;
function readSaved(key:string):string[]{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x.filter((v):v is string=>typeof v==='string').slice(-800):[];}catch{return [];}}
function timeLabel(minutes:number){return minutes<1?'Just now':minutes<60?`${minutes}m ago`:'About 1h ago';}

export default function LinkedInFreshFeed({trackedUrls,onSaveJob,accessKey,onNeedAccess,onSeePipeline}:Props){
  const [jobs,setJobs]=useState<LiveJob[]>([]),[status,setStatus]=useState<'idle'|'loading'|'ready'|'setup'|'error'>('idle');
  const [statusText,setStatusText]=useState(''),[updated,setUpdated]=useState('');
  const [seen,setSeen]=useState<string[]>([]),[dismissed,setDismissed]=useState<string[]>([]);
  const [showAll,setShowAll]=useState(true),[includeSenior,setIncludeSenior]=useState(false),[query,setQuery]=useState('');
  const [now,setNow]=useState(Date.now()),[openId,setOpenId]=useState<string|null>(null);
  const [details,setDetails]=useState<Record<string,{description:string;salary:string;easyApply:boolean;error?:string}>>({});
  const [detailBusy,setDetailBusy]=useState<string|null>(null);
  const [notify,setNotify]=useState(false);
  const everLoaded=useRef(false), inFlight=useRef(false),lastIds=useRef<Set<string>>(new Set());

  useEffect(()=>{setSeen(readSaved(SEEN_KEY));setDismissed(readSaved(DISMISSED_KEY));},[]);
  const updateSeen=(ids:string[])=>{setSeen(previous=>{const next=[...new Set([...previous,...ids])].slice(-800);localStorage.setItem(SEEN_KEY,JSON.stringify(next));return next;});};
  const dismiss=(id:string)=>{setDismissed(previous=>{const next=[...new Set([...previous,id])].slice(-800);localStorage.setItem(DISMISSED_KEY,JSON.stringify(next));return next;});};

  const load=useCallback(async()=>{
    if(!accessKey){setStatus('setup');setStatusText('Enter your CareerOS access key to unlock the feed.');return;}
    if(inFlight.current)return;
    inFlight.current=true;
    setStatus(current=>current==='ready'?'ready':'loading');
    try{
      const r=await fetch('/api/jobs/live',{headers:{'x-careeros-key':accessKey},cache:'no-store'});
      const data=await r.json() as FeedPayload;
      if(!r.ok){setStatus(r.status===401||r.status===503?'setup':'error');setStatusText(data.message||`Feed unavailable (${r.status})`);return;}
      if(data.status!=='ok'||!Array.isArray(data.jobs))throw new Error('Unexpected feed response');
      const valid=data.jobs.filter(j=>j&&typeof j.id==='string'&&j.easyApply&&typeof j.url==='string');
      const newJobs=valid.filter(j=>!lastIds.current.has(j.id));
      lastIds.current=new Set(valid.map(j=>j.id));
      if(notify && everLoaded.current && newJobs.length && typeof Notification!=='undefined' && Notification.permission==='granted' && document.visibilityState==='hidden'){
        new Notification(`${newJobs.length} fresh Easy Apply ${newJobs.length===1?'job':'jobs'}`,{body:'Open CareerOS to see the new postings.'});
      }
      everLoaded.current=true;
      setJobs(valid);setUpdated(data.checkedAt||new Date().toISOString());setStatus('ready');setStatusText('');
    }catch(err){setStatus('error');setStatusText(err instanceof Error?err.message:'Could not load jobs.');}
    finally{inFlight.current=false;}
  },[accessKey,notify]);

  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),REFRESH_INTERVAL_MS);
    const focus=()=>{if(document.visibilityState==='visible')void load();};
    document.addEventListener('visibilitychange',focus);return()=>{window.clearInterval(id);document.removeEventListener('visibilitychange',focus);};
  },[load]);
  useEffect(()=>{const t=window.setInterval(()=>setNow(Date.now()),30_000);return()=>window.clearInterval(t);},[]);

  const trackedIds=useMemo(()=>new Set(trackedUrls.map(v=>(v.match(/\/jobs\/view\/(?:[^/?#]*?-)?(\d{7,})/)||[])[1]).filter(Boolean)),[trackedUrls]);
  const display=useMemo(()=>jobs.filter(job=>{
    const seenAge=job.postedMinutes??61;
    const elapsed=updated?Math.max(0,(now-new Date(updated).getTime())/60000):0;
    const stillFresh=seenAge+elapsed<=60;
    return stillFresh&&!dismissed.includes(job.id)&& (includeSenior||!SENIOR.test(job.title)) && (showAll||!seen.includes(job.id)) && (!query||`${job.title} ${job.company} ${job.location}`.toLowerCase().includes(query.toLowerCase()));
  }),[jobs,dismissed,includeSenior,showAll,seen,query,now,updated]);
  const unseenCount=jobs.filter(j=>!seen.includes(j.id)&&!dismissed.includes(j.id)).length;
  const age=updated?Math.floor((now-new Date(updated).getTime())/60000):null;

  const reveal=async(job:LiveJob)=>{
    const expanded=openId!==job.id;
    setOpenId(expanded?job.id:null);
    updateSeen([job.id]);
    if(!expanded||details[job.id]||!accessKey)return;
    setDetailBusy(job.id);
    try{
      const response=await fetch(`/api/jobs/details?id=${encodeURIComponent(job.id)}`,{headers:{'x-careeros-key':accessKey}});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load job details');
      setDetails(prev=>({...prev, [job.id]:{description:String(data.description||''),salary:String(data.salary||''),easyApply:data.easyApply===true}}));
    }catch(err){setDetails(prev=>({...prev,[job.id]:{description:'',salary:'',easyApply:true,error:err instanceof Error?err.message:'Could not load details'}}));}
    finally{setDetailBusy(null);}
  };
  const enableAlerts=async()=>{
    if(typeof Notification==='undefined'){setStatusText('Browser notifications are unavailable on this device.');return;}
    const p=await Notification.requestPermission();setNotify(p==='granted');
    if(p!=='granted')setStatusText('Browser notifications were not enabled.');
  };

  return <div className="auto-feed">
    <header className="auto-head">
      <div><div className="fresh-eyebrow"><Radio size={14}/> AUTOMATED INTAKE · NYC SOFTWARE ENGINEERING</div>
        <h1>Fresh jobs. <em>Right here.</em></h1>
        <p>Actual LinkedIn Easy Apply listings pulled into CareerOS through SearchAPI, filtered to postings from the past hour. No hunting through six searches.</p>
      </div>
      <div className="auto-status"><span className={`auto-dot ${status==='ready'?'ready':'offline'}`}/><strong>{status==='ready'?'Monitoring while open':status==='loading'?'Connecting…':'Setup needed'}</strong><small>{updated?`Checked ${age===0?'just now':`${age}m ago`}`:'No successful sync yet'}</small></div>
    </header>
    <div className="auto-toolbar"><div className="auto-tally"><Clock3 size={18}/><strong>{display.length}</strong><span>fresh roles in feed</span><span className="auto-separator">·</span><span>{unseenCount} unseen from latest scan</span></div>
      <div className="auto-actions"><button type="button" className="btn btn-outline" onClick={()=>void load()} disabled={status==='loading'}><RefreshCw size={15}/> Refresh</button><button type="button" className="btn btn-outline" onClick={()=>notify?setNotify(false):void enableAlerts()}><Bell size={15}/>{notify?'Alerts on':'Desktop alerts'}</button></div>
    </div>
    <div className="auto-layout">
      <section className="auto-feed-main">
        <div className="auto-controls"><div className="fresh-input-wrap"><Search size={16}/><input aria-label="Filter listed jobs" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter companies or technologies"/></div>
          <label><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/> Include seen</label>
          <label><input type="checkbox" checked={includeSenior} onChange={e=>setIncludeSenior(e.target.checked)}/> Include senior roles</label>
        </div>
        {(status==='setup'||!accessKey)&&<div className="auto-empty"><ShieldCheck size={30}/><h2>Connect the job intake once</h2><p>{statusText||'Your SearchAPI provider key and CareerOS access key are needed before live listings can appear.'}</p><p>After the one-time setup, matching postings arrive in this feed automatically every five minutes while it is open.</p><button className="btn btn-primary" onClick={onNeedAccess}>Configure access</button></div>}
        {status==='error'&&<div className="auto-empty"><RefreshCw size={30}/><h2>Latest scan failed</h2><p>{statusText}</p><button className="btn btn-primary" onClick={()=>void load()}>Retry scan</button></div>}
        {status==='loading'&&<div className="auto-empty"><RefreshCw size={28} className="auto-spin"/><h2>Checking new listings…</h2><p>Looking for Easy Apply jobs posted in the last hour.</p></div>}
        {status==='ready'&&display.length===0&&<div className="auto-empty"><Eye size={30}/><h2>You're caught up.</h2><p>No matching unseen postings are available in this hour's results. The feed will check again automatically. To review older seen jobs, enable “Include seen”.</p><button className="btn btn-outline" onClick={()=>setShowAll(true)}>View seen roles</button></div>}
        {status==='ready'&&display.map(job=><article className="auto-job" key={job.id}>
          <div className="auto-job-top"><div className="auto-logo">{job.company[0]?.toUpperCase()}</div><div className="auto-job-info"><button className="auto-title" onClick={()=>void reveal(job)}>{job.title} <ChevronDown size={16}/></button><div className="auto-company">{job.company} · {job.location||'Location not specified'}</div></div><span className="auto-age">{timeLabel(job.postedMinutes??0)}</span></div>
          <div className="auto-tags"><span>LinkedIn Easy Apply*</span><span>Software engineering</span><span>Provider: SearchAPI</span></div>
          {openId===job.id&&<div className="auto-description">{detailBusy===job.id?<p>Loading the description…</p>:details[job.id]?.error?<p>{details[job.id].error}</p>:<><strong>{details[job.id]?.salary||'Salary not provided'}</strong><p>{details[job.id]?.description||'No description available from the provider.'}</p>{details[job.id]&&!details[job.id].easyApply&&<p className="auto-warning">The detail endpoint did not confirm Easy Apply. Check before applying.</p>}</>}</div>}
          <div className="auto-job-actions"><button className="btn btn-primary" disabled={trackedIds.has(job.id)} onClick={()=>{onSaveJob(job,details[job.id]?.description,details[job.id]?.salary);updateSeen([job.id]);}}>{trackedIds.has(job.id)?<BookmarkCheck size={16}/>:<Check size={16}/>} {trackedIds.has(job.id)?'Saved':'Save job'}</button>
            <button className="btn btn-outline" onClick={()=>void reveal(job)}>Details <ChevronDown size={14}/></button>
            <a className="btn btn-outline" href={job.url} rel="noopener noreferrer" target="_blank">Apply <ArrowUpRight size={15}/></a>
            <button className="auto-dismiss" title="Hide job" onClick={()=>dismiss(job.id)}><EyeOff size={16}/></button></div>
        </article>)}
      </section>
      <aside className="auto-aside"><div className="surface"><div className="eyebrow muted">HOW THE AUTOMATION WORKS</div><h3>A live intake, not links</h3><p><strong>Source:</strong> SearchAPI LinkedIn Jobs engine</p><p><strong>Search:</strong> Software Engineer · NYC metro · last hour · Easy Apply</p><p><strong>Updates:</strong> every five minutes while the page is open, plus when you return to the tab</p><p><strong>Storage:</strong> seen and hidden jobs stay in this browser; saved jobs go straight to your pipeline</p><button className="fresh-view-pipeline" onClick={onSeePipeline}>Your saved applications <BriefcaseBusiness size={15}/></button></div>
        <div className="surface"><Sparkles size={20}/><h3>What runs without you?</h3><p>The feed loads and refreshes on its own. Expand a job to read details here, or save it with one click. Applying still requires LinkedIn.</p><small>*Easy Apply and posting age come from the third-party provider's filters, not independent LinkedIn verification. Feed access requires separate API billing. Background collection when the app is closed requires a future scheduled worker and cloud database.</small></div>
      </aside>
    </div>
  </div>;
}

"use client";

import {useEffect, useMemo, useState} from "react";
import {ArrowRight, ArrowUpRight, Check, Clipboard, Clock3, ExternalLink, Link2, Radio, RefreshCw, Search, ShieldCheck, Sparkles, Target} from "lucide-react";
import {buildLinkedInSearchUrl, canonicalLinkedInJobUrl, LINKEDIN_PRESETS, type LinkedInTimeWindow, type LinkedInWorkMode} from "@/lib/linkedin";

type Props = {
  trackedUrls: string[];
  onTrackJob: (url: string) => void;
  onSeePipeline: () => void;
};

const TIMES: {value:LinkedInTimeWindow; label:string}[] = [
  {value:900,label:"15 min"}, {value:1800,label:"30 min"}, {value:3600,label:"1 hour"},
];
const MODES: {value:LinkedInWorkMode;label:string}[] = [
  {value:"all",label:"All setups"},{value:"hybrid",label:"Hybrid"},{value:"onsite",label:"On-site"},{value:"remote",label:"Remote"},
];

export default function LinkedInFreshFeed({trackedUrls,onTrackJob,onSeePipeline}:Props) {
  const [keywords,setKeywords] = useState("Software Engineer");
  const [location,setLocation] = useState("New York City Metropolitan Area");
  const [workMode,setWorkMode] = useState<LinkedInWorkMode>("all");
  const [timeSeconds,setTimeSeconds] = useState<LinkedInTimeWindow>(3600);
  const [earlyCareer,setEarlyCareer] = useState(false);
  const [jobUrl,setJobUrl] = useState("");
  const [error,setError] = useState("");
  const [copied,setCopied] = useState(false);
  const [clock,setClock] = useState<Date|null>(null);
  useEffect(()=>{
    const refreshClock=()=>setClock(new Date());
    refreshClock();
    const interval=window.setInterval(refreshClock,60_000);
    return ()=>window.clearInterval(interval);
  },[]);
  const baseOptions={keywords,location,timeSeconds,workMode,earlyCareer};
  const searchUrl=useMemo(()=>buildLinkedInSearchUrl(baseOptions),[keywords,location,timeSeconds,workMode,earlyCareer]);
  const linkedInJob=canonicalLinkedInJobUrl(jobUrl);
  const trackedIds=new Set(trackedUrls.map(canonicalLinkedInJobUrl).filter(Boolean));
  const isTracked=Boolean(linkedInJob && trackedIds.has(linkedInJob));
  const selectedCount=trackedIds.size;
  const handleTrack=(event:React.FormEvent)=>{
    event.preventDefault();
    if (!linkedInJob) {setError("Paste a LinkedIn job posting URL (not a search page or profile link).");return;}
    if (isTracked){setError("This posting is already in your CareerOS pipeline.");return;}
    setError("");onTrackJob(linkedInJob);setJobUrl("");
  };
  const copySearch=async()=>{
    try{await navigator.clipboard.writeText(searchUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}
    catch{setError("Clipboard access was blocked. Open the search and copy its URL from LinkedIn.");}
  };
  return <div className="fresh-page">
    <div className="fresh-hero">
      <div><div className="fresh-eyebrow"><Radio size={15}/> FRESH OPPORTUNITIES / LINKEDIN</div>
        <h1>Be first in the <em>door.</em></h1>
        <p>A permanent launchpad for LinkedIn Easy Apply searches from the last hour. Every link requests the newest results when opened.</p>
        <div className="fresh-badges"><span><Clock3 size={15}/> Last {timeSeconds/60} minutes</span><span><Target size={15}/> Easy Apply</span><span><RefreshCw size={15}/> Newest first</span></div>
      </div>
      <div className="fresh-hero-side"><span className="fresh-orb"><Radio size={36}/></span><strong>LIVE SEARCH</strong><small>{clock?clock.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"Ready"} local time</small><p>Results appear on LinkedIn—not inside CareerOS.</p></div>
    </div>

    <div className="fresh-layout">
      <section className="surface fresh-config">
        <div className="section-top"><div><div className="eyebrow muted">SET YOUR WATCH</div><h2>Search filters</h2></div><ShieldCheck size={19}/></div>
        <label className="fresh-field"><span>Job title or keywords</span><div className="fresh-input-wrap"><Search size={18}/><input value={keywords} maxLength={100} onChange={e=>setKeywords(e.target.value)} placeholder="Software Engineer" aria-label="Job search keywords"/></div></label>
        <label className="fresh-field"><span>Search location</span><input value={location} maxLength={100} onChange={e=>setLocation(e.target.value)} placeholder="New York City Metropolitan Area"/></label>
        <div className="fresh-field"><span>Posted within</span><div className="fresh-segments" role="group" aria-label="Time posted window">{TIMES.map(t=><button key={t.value} type="button" className={timeSeconds===t.value?"active":""} onClick={()=>setTimeSeconds(t.value)} aria-pressed={timeSeconds===t.value}>{t.label}</button>)}</div></div>
        <div className="fresh-field"><span>Work arrangement</span><div className="fresh-segments work-modes" role="group" aria-label="Work arrangement">{MODES.map(m=><button key={m.value} type="button" className={workMode===m.value?"active":""} onClick={()=>setWorkMode(m.value)} aria-pressed={workMode===m.value}>{m.label}</button>)}</div></div>
        <label className="fresh-toggle"><input type="checkbox" checked={earlyCareer} onChange={e=>setEarlyCareer(e.target.checked)}/><span><strong>Entry / Associate level only</strong><small>Optional — can exclude jobs that LinkedIn categorizes differently.</small></span></label>
        <div className="fresh-filter-foot">Always: <strong>Easy Apply</strong> · <strong>Full-time</strong> · <strong>Most recent first</strong></div>
        <a className="btn btn-primary fresh-primary" href={searchUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/> Open filtered jobs <ArrowUpRight size={16}/></a>
        <button type="button" className="fresh-copy" onClick={()=>void copySearch()}>{copied?<Check size={15}/>:<Clipboard size={15}/>} {copied?"Copied search link":"Copy this live search link"}</button>
      </section>

      <div className="fresh-content">
        <section className="surface fresh-searches">
          <div className="section-top"><div><div className="eyebrow muted">EXPAND THE NET</div><h2>One-hour search lanes</h2></div><span className="fresh-pill">{LINKEDIN_PRESETS.length} searches</span></div>
          <p className="fresh-desc">Companies name identical work differently. Open several lanes to catch fresh listings that one keyword search would miss.</p>
          <div className="fresh-search-list">{LINKEDIN_PRESETS.map((preset,i)=><div className="fresh-search-row" key={preset.keyword}>
            <div className="fresh-search-idx">{String(i+1).padStart(2,"0")}</div>
            <div className="fresh-search-details"><strong>{preset.label}</strong><small>{preset.detail}</small></div>
            <button className="fresh-use" type="button" onClick={()=>setKeywords(preset.keyword)} title={`Set keyword to ${preset.keyword}`}>Use</button>
            <a href={buildLinkedInSearchUrl({...baseOptions,keywords:preset.keyword})} target="_blank" rel="noopener noreferrer" aria-label={`Open ${preset.label} Easy Apply roles on LinkedIn`} className="fresh-open">Search <ArrowUpRight size={16}/></a>
          </div>)}</div>
          <div className="fresh-disclaimer"><ShieldCheck size={17}/><span>LinkedIn owns its search results. CareerOS doesn&apos;t scrape listings, automatically apply, or claim postings have been verified. Filters are based on LinkedIn URL parameters that may change.</span></div>
        </section>
        <section className="surface fresh-save">
          <div className="section-top"><div><div className="eyebrow muted">CLOSE THE LOOP</div><h2>Save a promising role</h2></div><span className="fresh-pill">{selectedCount} tracked via LinkedIn</span></div>
          <p className="fresh-desc">After opening a listing on LinkedIn, copy its job URL here. We&apos;ll prepare a new application record for you to review and complete.</p>
          <form onSubmit={handleTrack} className="fresh-save-form"><div className="fresh-input-wrap"><Link2 size={18}/><input value={jobUrl} onChange={e=>{setJobUrl(e.target.value);setError("");}} placeholder="https://www.linkedin.com/jobs/view/..." aria-label="Paste LinkedIn posting URL"/></div><button className="btn btn-primary" type="submit" disabled={!jobUrl.trim()||isTracked}><Check size={16}/> {isTracked?"Already saved":"Add to pipeline"}</button></form>
          {error&&<p className="fresh-error" role="alert">{error}</p>}
          <button type="button" className="fresh-view-pipeline" onClick={onSeePipeline}>View application pipeline <ArrowRight size={16}/></button>
        </section>
      </div>
    </div>
  </div>;
}

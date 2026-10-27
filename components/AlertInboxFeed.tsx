"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Script from "next/script";
import {ArrowUpRight,BookmarkPlus,CheckCircle2,Inbox,Link2,MailCheck,RefreshCw,ShieldCheck} from "lucide-react";
import {consolidateDigests,parseAlertEmail,type AlertDigest,type AlertListing,type AlertSource,type GmailEmail} from "@/lib/alert-inbox";

const SCOPE="https://www.googleapis.com/auth/gmail.readonly";
const CLIENT_ID=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID??"";
const QUERY='newer_than:14d {from:(linkedin.com) from:(builtin.com) from:(builtinnyc.com)}';
const FIVE_MIN=300000;

type OAuthResponse={access_token?:string;expires_in?:number;error?:string};
type GoogleClient={requestAccessToken:(args?:{prompt?:string})=>void};
type GoogleLibrary={accounts:{oauth2:{
  initTokenClient:(args:{client_id:string;scope:string;callback:(response:OAuthResponse)=>void;error_callback?:(error:{type?:string})=>void})=>GoogleClient;
  revoke:(token:string,callback:()=>void)=>void;
}}};
function getGoogle():GoogleLibrary|undefined{
  return (window as Window&{google?:GoogleLibrary}).google;
}
type GmailList={messages?:Array<{id:string}>};
type Props={trackedUrls:string[];onSave:(lead:AlertListing)=>void};
function timeAgo(value:string,now:number){
  const minutes=Math.max(0,Math.floor((now-Date.parse(value))/60000));
  return minutes<1?"just now":minutes<60?`${minutes}m ago`:minutes<1440?`${Math.floor(minutes/60)}h ago`:`${Math.floor(minutes/1440)}d ago`;
}

export default function AlertInboxFeed({trackedUrls,onSave}:Props){
  const [scriptReady,setScriptReady]=useState(false);
  const [token,setToken]=useState("");
  const [status,setStatus]=useState<"idle"|"loading"|"ready"|"error">("idle");
  const [error,setError]=useState("");
  const [digests,setDigests]=useState<AlertDigest[]>([]);
  const [lastChecked,setLastChecked]=useState("");
  const [source,setSource]=useState<"All"|AlertSource>("All");
  const [windowMinutes,setWindowMinutes]=useState(10080);
  const [now,setNow]=useState(Date.now());
  const cache=useRef(new Map<string,GmailEmail>());
  const activeRequest=useRef(false);
  const connected=Boolean(token);
  const saved=new Set(trackedUrls.map(x=>x.replace(/\/$/,"")));

  const load=useCallback(async()=>{
    if(!token||activeRequest.current)return;
    activeRequest.current=true;
    setStatus(current=>current==="ready"?"ready":"loading");
    try{
      const headers={Authorization:`Bearer ${token}`};
      const url=new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      url.searchParams.set("q",QUERY);
      url.searchParams.set("maxResults","45");
      const r=await fetch(url.toString(),{headers,cache:"no-store"});
      if(r.status===401)throw new Error("Gmail authorization expired. Reconnect to resume.");
      if(!r.ok)throw new Error(`Gmail returned ${r.status}. Check the Gmail API and OAuth consent settings.`);
      const listed=await r.json() as GmailList;
      const ids=(listed.messages??[]).slice(0,45).map(m=>m.id).filter(Boolean);
      const batch:GmailEmail[]=[];
      // Four concurrent reads maximum; previously fetched emails stay in tab memory.
      for(let offset=0;offset<ids.length;offset+=4){
        const group=ids.slice(offset,offset+4);
        const records=await Promise.all(group.map(async id=>{
          const previous=cache.current.get(id);
          if(previous)return previous;
          const response=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,{headers,cache:"no-store"});
          if(response.status===401)throw new Error("Gmail authorization expired. Reconnect to resume.");
          if(!response.ok)return null;
          const value=await response.json() as GmailEmail;
          if(value.id===id)cache.current.set(id,value);
          return value;
        }));
        batch.push(...records.filter((x):x is GmailEmail=>Boolean(x)));
      }
      const items=consolidateDigests(batch.map(parseAlertEmail).filter((x):x is AlertDigest=>Boolean(x)));
      setDigests(items);
      setStatus("ready");setError("");setLastChecked(new Date().toISOString());
    }catch(cause){
      const detail=cause instanceof Error?cause.message:"Could not read job alerts.";
      setStatus("error");setError(detail);
      if(detail.includes("authorization expired"))setToken("");
    }finally{activeRequest.current=false;}
  },[token]);

  useEffect(()=>{
    if(!token)return;
    void load();
    const ticker=window.setInterval(()=>void load(),FIVE_MIN);
    const whenVisible=()=>{if(document.visibilityState==="visible")void load();};
    document.addEventListener("visibilitychange",whenVisible);
    return ()=>{window.clearInterval(ticker);document.removeEventListener("visibilitychange",whenVisible);};
  },[load,token]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),30000);return()=>window.clearInterval(timer);},[]);

  const connect=()=>{
    if(!CLIENT_ID){setError("The owner must add a free Google OAuth web client ID to the Vercel project's NEXT_PUBLIC_GOOGLE_CLIENT_ID setting.");return;}
    const google=getGoogle();
    if(!google){setError("Google sign-in did not load. Reload the page and try again.");return;}
    setError("");
    const client=google.accounts.oauth2.initTokenClient({
      client_id:CLIENT_ID,
      scope:SCOPE,
      callback:response=>{
        if(!response.access_token){setError(response.error||"Google did not grant Gmail read-only access.");return;}
        cache.current.clear();
        setToken(response.access_token);
      },
      error_callback:e=>setError(`Google authorization failed: ${e.type||"unknown error"}`)
    });
    client.requestAccessToken();
  };
  const disconnect=()=>{
    const existing=token;setToken("");setDigests([]);cache.current.clear();setStatus("idle");
    if(existing)getGoogle()?.accounts.oauth2.revoke(existing,()=>{});
  };

  const displayed=useMemo(()=>digests.filter(d=>{
    const age=(now-Date.parse(d.receivedAt))/60000;
    return age>=0&&age<=windowMinutes&&(source==="All"||d.source===source);
  }),[digests,now,windowMinutes,source]);
  const links=displayed.reduce((n,d)=>n+d.listings.length,0);

  return <section className="surface inbox-section" aria-label="LinkedIn and Built In alert intake">
    <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={()=>setScriptReady(true)}/>
    <div className="inbox-heading">
      <div><div className="eyebrow muted">LINKEDIN + BUILT IN · EMAIL-POWERED INTAKE</div><h2>Your job alerts, right here.</h2>
        <p>Read matching alerts inside CareerOS—no switching between job boards to see what's new.</p></div>
      <span className="inbox-pill"><Inbox size={15}/>{connected?"Gmail connected":"Connection optional"}</span>
    </div>
    <div className="inbox-toolbar">
      <div className="inbox-toolbar-group">
        <select aria-label="Job alert source" value={source} onChange={event=>setSource(event.target.value as typeof source)}>
          <option value="All">Both sources</option><option>LinkedIn</option><option>Built In</option>
        </select>
        <select aria-label="Email arrival window" value={windowMinutes} onChange={event=>setWindowMinutes(Number(event.target.value))}>
          <option value={60}>Received in last hour</option><option value={1440}>Received in last 24 hours</option><option value={10080}>Received in last 7 days</option>
        </select>
      </div>
      <div className="inbox-toolbar-group">
        {connected?<><button className="btn btn-outline" disabled={status==="loading"} onClick={()=>void load()}><RefreshCw size={15}/> Check now</button><button className="inbox-disconnect" onClick={disconnect}>Disconnect</button></>:
          <button className="btn btn-primary" onClick={connect} disabled={!scriptReady||!CLIENT_ID}><MailCheck size={15}/> Connect Gmail alerts</button>}
      </div>
    </div>
    {!connected&&<div className="inbox-intro">
      <ShieldCheck size={23}/><div>
        <strong>{CLIENT_ID?"One-time Google permission required":"Google OAuth setup required"}</strong>
        <p>{CLIENT_ID?"CareerOS can read job-alert emails in your browser with your permission. Tokens aren't saved; Gmail messages are not sent to our server.":"To enable the free direct import, configure a Google OAuth web client ID and Gmail API in the app's deployment. No paid provider or OpenAI API is needed."}</p>
        <p className="inbox-note">Google's <code>gmail.readonly</code> permission can access your entire mailbox, although this feature only searches LinkedIn and Built In senders. It is a restricted scope and may require a Google OAuth test-user setup or verification.</p>
      </div>
    </div>}
    {error&&<p className="fresh-error" role="alert">{error}</p>}
    {connected&&<div className="inbox-status"><CheckCircle2 size={16}/>{status==="loading"?"Checking Gmail alerts…":status==="ready"?`${displayed.length} alerts · ${links} extracted job links`:status==="error"?"Alert check failed":"Connected"}{lastChecked&&<span> · checked {timeAgo(lastChecked,now)}</span>}</div>}
    {connected&&status==="ready"&&displayed.length===0&&<div className="inbox-empty">No LinkedIn or Built In email alerts in this window. Set up job alert emails on those services, or select a longer time window. They send notifications daily or weekly, not necessarily within an hour.</div>}
    {connected&&displayed.slice(0,20).map(digest=><article className="inbox-digest" key={digest.id}>
      <div className="inbox-digest-heading">
        <span className="inbox-source">{digest.source}</span><span className="inbox-received">Alert received {timeAgo(digest.receivedAt,now)} · Posting age unverified</span>
      </div>
      <h3>{digest.subject}</h3>
      {digest.listings.length? <div className="inbox-listings">
        {digest.listings.slice(0,10).map(role=><div className="inbox-listing" key={role.id}>
          <div><strong>{role.title}</strong><small>{role.company||"Company not identified in email"} · Easy Apply not verified</small></div>
          <div className="inbox-list-actions"><button type="button" className="btn btn-outline" disabled={saved.has(role.url.replace(/\/$/,""))} onClick={()=>onSave(role)}><BookmarkPlus size={14}/>{saved.has(role.url.replace(/\/$/,""))?"Saved":"Save"}</button>
          <a className="btn btn-outline" target="_blank" rel="noopener noreferrer" href={role.url} aria-label={`Open ${role.title} on ${role.source}`}><ArrowUpRight size={15}/></a></div>
        </div>)}
      </div>:<p className="inbox-preview">{digest.preview||"This job alert did not include an extractable direct job link. Open the original email to see its full details."}</p>}
      <a href={digest.gmailUrl} target="_blank" rel="noopener noreferrer" className="inbox-original">Original alert in Gmail <Link2 size={13}/></a>
    </article>)}
    <div className="inbox-footer">Free, read-only browser integration · Checks every 5 minutes while open · Alerts may be delayed by the sender. The company feeds below independently track employer publication dates.</div>
  </section>;
}

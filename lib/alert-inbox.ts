/**
 * Gmail alert parsing for LinkedIn and Built In. These are user-delivered emails,
 * NOT a LinkedIn/Built In job search API. Email arrival time != job publication time.
 * Parsing happens in the browser, and OAuth access tokens are not persisted.
 */
export type AlertSource="LinkedIn"|"Built In";
export type AlertListing={
  id:string;
  source:AlertSource;
  title:string;
  company:string;
  url:string;
  receivedAt:string;
  mailId:string;
  subject:string;
  preview:string;
  easyApplyVerified:false;
  postedAt:null;
};
export type AlertDigest={
  id:string;
  source:AlertSource;
  subject:string;
  receivedAt:string;
  preview:string;
  gmailUrl:string;
  listings:AlertListing[];
};
export type GmailPart={
  mimeType?:string;
  body?:{data?:string};
  parts?:GmailPart[];
  headers?:Array<{name:string;value:string}>;
};
export type GmailEmail={
  id?:string;
  internalDate?:string;
  snippet?:string;
  payload?:GmailPart;
};

const SWE=/\b(software\s+(?:engineer|developer)|full[ -]?stack|front[ -]?end|back[ -]?end|web\s+developer|application\s+developer|platform\s+engineer|devops|site reliability|data\s+engineer|machine learning\s+engineer|mobile\s+engineer|ios\s+engineer|android\s+engineer|solutions\s+engineer|engineering\s+intern)\b/i;

function base64UrlToText(encoded:string):string{
  try{
    const b64=encoded.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(encoded.length/4)*4,"=");
    const binary=atob(b64);
    return new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
  }catch{return "";}
}

function findPart(part:GmailPart|undefined,mime:string,depth=0):string{
  if(!part||depth>8)return "";
  if(part.mimeType===mime&&typeof part.body?.data==="string")
    return base64UrlToText(part.body.data).slice(0,180000);
  for(const child of (part.parts??[]).slice(0,24)){
    const found=findPart(child,mime,depth+1);
    if(found)return found;
  }
  return "";
}
function header(message:GmailEmail,key:string):string{
  return message.payload?.headers?.find(h=>h.name.toLowerCase()===key)?.value?.slice(0,350)??"";
}
export function sourceFromSender(value:string):AlertSource|null{
  const mail=(value.match(/<([^<>@\s]+@[^<>\s]+)>/)?.[1]??value.match(/\b[^\s<>@]+@[^\s<>@]+\b/)?.[0]??"").toLowerCase();
  const domain=mail.split("@")[1]??"";
  if(/(^|\.)linkedin\.com$/.test(domain))return "LinkedIn";
  if(/(^|\.)(builtin\.com|builtinnyc\.com)$/.test(domain))return "Built In";
  return null;
}
function cleanedUrl(raw:string,source:AlertSource):string|null{
  try{
    const url=new URL(raw.replace(/&amp;/g,"&"));
    if(url.protocol!=="https:")return null;
    const domain=url.hostname.toLowerCase();
    if(source==="LinkedIn"){
      if(!/(^|\.)linkedin\.com$/.test(domain))return null;
      const id=url.pathname.match(/\/(?:comm\/)?jobs\/view\/(?:[^/?#]*?-)?(\d{7,})\/?$/)?.[1]
        ??url.searchParams.get("currentJobId")??url.searchParams.get("jobId");
      if(!id||!/^\d{7,}$/.test(id))return null;
      return `https://www.linkedin.com/jobs/view/${id}/`;
    }
    if(!/(^|\.)(builtin\.com|builtinnyc\.com)$/.test(domain))return null;
    if(!/^\/job\//.test(url.pathname))return null;
    return `https://${domain}${url.pathname.replace(/\/$/,"")}`;
  }catch{return null;}
}
function normalTitle(raw:string):string{
  return raw.replace(/\s+/g," ").replace(/[›»→]+/g," ").trim().slice(0,180);
}
function extractLinks(html:string,source:AlertSource):Array<{url:string;title:string}>{
  if(!html)return [];
  const dom=new DOMParser().parseFromString(html,"text/html");
  const found=new Map<string,string>();
  for(const anchor of Array.from(dom.querySelectorAll("a[href]")).slice(0,250)){
    const url=cleanedUrl(anchor.getAttribute("href")??"",source);
    if(!url)continue;
    const title=normalTitle(anchor.textContent??"");
    if(!SWE.test(title))continue;
    if(!found.has(url))found.set(url,title);
  }
  return [...found].slice(0,24).map(([url,title])=>({url,title}));
}

export function parseAlertEmail(mail:GmailEmail):AlertDigest|null{
  if(!mail.id||!mail.payload)return null;
  const source=sourceFromSender(header(mail,"from"));
  if(!source)return null;
  const subject=header(mail,"subject")||"Job notification";
  const html=findPart(mail.payload,"text/html");
  const plain=findPart(mail.payload,"text/plain");
  const preview=(plain||mail.snippet||"").replace(/\s+/g," ").slice(0,400);
  // Ignore non-job mail from these senders, e.g. authentication or network updates.
  if(!/job|role|engineer|developer|career|match|opportunit/i.test([subject,preview.slice(0,140)].join(" ")))return null;
  const received=new Date(Number(mail.internalDate??""));
  if(!Number.isFinite(received.getTime()))return null;
  const links=extractLinks(html,source);
  const listings=links.map((x,index)=>{
    const split=x.title.match(/^(.*?)\s+(?:at|@|\|)\s+([^|·]+)$/i);
    return {
      id:`${source}:${x.url}`,source,
      title:(split?normalTitle(split[1]):x.title),
      company:split?normalTitle(split[2]):"",
      url:x.url,receivedAt:received.toISOString(),mailId:mail.id!,subject,preview,
      easyApplyVerified:false as const,postedAt:null,
    };
  });
  return {
    id:mail.id,source,subject,receivedAt:received.toISOString(),preview,
    gmailUrl:`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(mail.id)}`,
    listings
  };
}

export function consolidateDigests(digests:AlertDigest[]):AlertDigest[]{
  const latest=new Map<string,AlertListing>();
  for(const digest of [...digests].sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt))){
    digest.listings=digest.listings.filter(listing=>{
      if(latest.has(listing.url))return false;
      latest.set(listing.url,listing);
      return true;
    });
  }
  return digests.sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt));
}

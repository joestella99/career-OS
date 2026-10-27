import {timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {buildSearchApiUrl,normalizeLiveJobs} from '@/lib/live-jobs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function equals(a:string,b:string):boolean {
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length>0 && x.length===y.length && timingSafeEqual(x,y);
}

function reply(data:unknown,status=200){
  return NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
}

export async function GET(request:NextRequest){
  const key=process.env.SEARCHAPI_API_KEY;
  const access=process.env.CAREEROS_ACCESS_KEY;
  if (!key) return reply({status:'setup_required',message:'Add SEARCHAPI_API_KEY in your Vercel environment to enable automatic job intake.',jobs:[]},503);
  if (!access) return reply({status:'setup_required',message:'Configure CAREEROS_ACCESS_KEY to protect your paid job-feed requests.',jobs:[]},503);
  if (!equals(request.headers.get('x-careeros-key')||'',access)) return reply({status:'unauthorized',message:'Enter your CareerOS access key in Settings to load live jobs.',jobs:[]},401);
  try{
    // Next.js server Data Cache shares one provider result across viewers within the 5-minute TTL.
    // No secret is placed in the URL, client bundle, or API response.
    const res=await fetch(buildSearchApiUrl(),{
      headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},
      next:{revalidate:300},
      signal:AbortSignal.timeout(15000),
    });
    if(!res.ok){
      return reply({status:'provider_error',message:res.status===401||res.status===403?'SearchAPI key was rejected. Check account access and credits.':res.status===429?'Provider rate limit reached. Retry later.':`Job feed provider returned ${res.status}.`,jobs:[]},502);
    }
    const json:unknown=await res.json();
    const checkedAt=new Date().toISOString();
    return reply({status:'ok',jobs:normalizeLiveJobs(json,checkedAt),checkedAt,source:'SearchAPI / LinkedIn',windowMinutes:60,pollMinutes:5});
  } catch {
    return reply({status:'provider_error',message:'Live job intake is temporarily unavailable. Your saved jobs remain intact.',jobs:[]},502);
  }
}

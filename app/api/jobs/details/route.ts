import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function authorized(provided:string,expected:string){const a=Buffer.from(provided),b=Buffer.from(expected);return a.length>0&&a.length===b.length&&timingSafeEqual(a,b);}
export async function GET(request:NextRequest){
  const key=process.env.SEARCHAPI_API_KEY,access=process.env.CAREEROS_ACCESS_KEY;
  if(!key||!access) return NextResponse.json({error:'Job data provider not configured.'},{status:503});
  if(!authorized(request.headers.get('x-careeros-key')||'',access))return NextResponse.json({error:'Enter your CareerOS access key.'},{status:401});
  const id=request.nextUrl.searchParams.get('id')||'';
  if(!/^\d{7,15}$/.test(id))return NextResponse.json({error:'Invalid job ID.'},{status:400});
  const url=new URL('https://www.searchapi.io/api/v1/search');
  url.searchParams.set('engine','linkedin_job_details');url.searchParams.set('job_id',id);
  try{
    const r=await fetch(url,{headers:{Authorization:`Bearer ${key}`},next:{revalidate:86400},signal:AbortSignal.timeout(15000)});
    if(!r.ok)return NextResponse.json({error:`Could not load job details (${r.status}).`},{status:502});
    const value=await r.json();const job=value?.job;
    if(!job||typeof job!=='object'||String(job.job_id)!==id)throw new Error('Malformed provider response');
    return NextResponse.json({title:String(job.title||'').slice(0,180),description:String(job.description||'').slice(0,20000),salary:String(job.salary||''),employmentType:String(job.employment_type||''),easyApply:job.is_easy_apply===true}, {headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'Job details are unavailable.'},{status:502});}
}

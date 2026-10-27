import {NextResponse} from "next/server";
import {FREE_BOARDS,normalizeAshbyBoard,type LiveJob} from "@/lib/live-jobs";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Result={board:string;ok:boolean;jobs:LiveJob[]};

async function fetchBoard(board:typeof FREE_BOARDS[number],now:string):Promise<Result>{
  const url=`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.board)}?includeCompensation=true`;
  try{
    const response=await fetch(url,{headers:{Accept:"application/json"},next:{revalidate:300},signal:AbortSignal.timeout(9000)});
    if(!response.ok)return {board:board.board,ok:false,jobs:[]};
    const data:unknown=await response.json();
    if(!data||typeof data!=="object"||!Array.isArray((data as {jobs?:unknown}).jobs))return {board:board.board,ok:false,jobs:[]};
    return {board:board.board,ok:true,jobs:normalizeAshbyBoard(data,board.company,board.board,now)};
  }catch{return {board:board.board,ok:false,jobs:[]};}
}

export async function GET(){
  // Read-only public company boards: no OpenAI or third-party metered API keys.
  const checkedAt=new Date().toISOString();
  const results=await Promise.all(FREE_BOARDS.map(b=>fetchBoard(b,checkedAt)));
  const successful=results.filter(r=>r.ok);
  if(!successful.length){
    return NextResponse.json({status:"error",message:"Public job boards are temporarily unavailable. No placeholder listings were generated.",jobs:[],checkedAt,boardsChecked:results.length,boardsWorking:0},{
      status:502,headers:{"Cache-Control":"public, max-age=0, s-maxage=60"}
    });
  }
  const byUrl=new Map<string,LiveJob>();
  for(const result of successful)for(const job of result.jobs)byUrl.set(job.url,job);
  const jobs=[...byUrl.values()].sort((a,b)=>a.postedMinutes-b.postedMinutes).slice(0,160);
  return NextResponse.json({
    status:"ok",jobs,checkedAt,boardsChecked:results.length,boardsWorking:successful.length,
    source:"Direct public Ashby company job boards",windowMinutes:10080,pollMinutes:5,
    note:"Not LinkedIn Easy Apply. Only selected employers with verified publication timestamps; postedAt means last published."
  },{headers:{"Cache-Control":"public, max-age=0, s-maxage=60"}});
}

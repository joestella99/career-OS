import {NextResponse} from "next/server";
import {discover} from "@/lib/engine/sources";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

export async function GET(){
  try{
    const results=await discover();
    return NextResponse.json({
      ...results,
      rankingNotice:"Match strength is a transparent qualification heuristic, not a probability of interview or employer feedback.",
      access:"free-public-sources",
    },{
      status:results.status==="unavailable"?503:200,
      headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=600"}
    });
  }catch{
    return NextResponse.json({status:"unavailable",jobs:[],message:"Public job sources are temporarily unavailable. No synthetic jobs were generated."},{
      status:503,headers:{"Cache-Control":"no-store"}
    });
  }
}

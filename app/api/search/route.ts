import {NextResponse} from "next/server";
import {discoverJobs} from "@/lib/search-sources";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
  const snapshot=await discoverJobs();
  const code=snapshot.status==="unavailable"?503:200;
  return NextResponse.json({
    ...snapshot,
    ranking:"Heuristic qualification-fit score, NOT a probability of an interview.",
    sourcePolicy:"No paid APIs. Ashby/Greenhouse employer boards plus Himalayas remote listings (attribution).",
    limitations:"Curated employers and sampled remote queries, not all open jobs. Some sources may be unavailable.",
  },{status:code,headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=600"}});
}

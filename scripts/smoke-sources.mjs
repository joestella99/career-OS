/**
 * Real provider smoke check. Run on GitHub Actions or a developer machine.
 * No credentials; do not assert all curated employer board IDs exist.
 */
const targets=[
 ["Ashby:GameChanger","https://api.ashbyhq.com/posting-api/job-board/gamechanger"],
 ["Ashby:Novig","https://api.ashbyhq.com/posting-api/job-board/novig"],
 ["Ashby:Notion","https://api.ashbyhq.com/posting-api/job-board/notion"],
 ["Ashby:Ramp","https://api.ashbyhq.com/posting-api/job-board/ramp"],
 ["Greenhouse:SeatGeek","https://boards-api.greenhouse.io/v1/boards/seatgeek/jobs?content=true"],
 ["Greenhouse:Datadog","https://boards-api.greenhouse.io/v1/boards/datadog/jobs?content=true"],
 ["Greenhouse:Braze","https://boards-api.greenhouse.io/v1/boards/braze/jobs?content=true"],
 ["Greenhouse:Figma","https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true"],
 ["Himalayas:Software","https://himalayas.app/jobs/api/search?q=software%20engineer&country=US&sort=recent&page=1"]
];
const statuses=await Promise.all(targets.map(async ([name,url])=>{
 try{
  const r=await fetch(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(10000)});
  const body=r.ok?await r.json():null;
  const rows=Array.isArray(body?.jobs)?body.jobs:[];
  const sample=rows.length?Object.keys(rows[0]).slice(0,16):[];
  const found={name,status:r.status,ok:r.ok,rows:rows.length,sampleKeys:sample};
  process.stdout.write(JSON.stringify(found)+"\n");
  return found;
 }catch(e){
  const result={name,status:0,ok:false,rows:0,error:String(e).slice(0,120)};
  process.stdout.write(JSON.stringify(result)+"\n");
  return result;
 }
}));
const ok=statuses.filter(x=>x.ok&&x.rows>0).length;
const reachable=statuses.filter(x=>x.ok).length;
process.stdout.write(`RESULT: ${ok}/${targets.length} populated feeds; ${reachable} HTTP 200 responses\n`);

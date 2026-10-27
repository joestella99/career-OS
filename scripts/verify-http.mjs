/* Real production-server smoke test using Next's compiled build.
 * No browser automation or paid API access required.
 */
import {spawn} from "node:child_process";
import assert from "node:assert/strict";
const base="http://127.0.0.1:4173";
const proc=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","4173"],{
  stdio:["ignore","pipe","pipe"],env:{...process.env,PORT:"4173"}
});
let logs="";
for(const stream of [proc.stdout,proc.stderr])stream.on("data",chunk=>{logs+=String(chunk).slice(-1200);});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  let home=null;
  for(let i=0;i<44;i++){
    if(proc.exitCode!==null)throw Error("Server exited early: "+logs.slice(-1500));
    try{
      home=await fetch(base+"/",{signal:AbortSignal.timeout(1800)});
      if(home.status===200)break;
    }catch{}
    await sleep(500);
  }
  assert.equal(home?.status,200,"Homepage must return HTTP 200: "+logs.slice(-800));
  const markup=await home.text();
  assert.ok(markup.includes("Less scrolling")&&markup.includes("Better shots"),"New search homepage must render");
  assert.ok(!markup.includes("Application pipeline"),"Legacy dashboard must not render");
  const res=await fetch(base+"/api/search",{signal:AbortSignal.timeout(27000)});
  assert.equal(res.status,200,"Live search API must return 200");
  const data=await res.json();
  assert.ok(data.sourceCount?.ok>0,"Need at least one responding public provider");
  assert.ok(Array.isArray(data.jobs)&&data.jobs.length>0,"Need actual normalized open jobs");
  assert.ok(data.jobs.every(j=>j.applyUrl?.startsWith("https://")),"Every job needs original HTTPS apply URL");
  console.log("PRODUCTION_HTTP_OK",JSON.stringify({
    home:home.status,api:res.status,jobs:data.jobs.length,sources:data.sourceCount,
    titles:data.jobs.slice(0,3).map(j=>j.title)
  }));
}catch(e){console.error("PRODUCTION_HTTP_FAILURE",e,logs.slice(-1000));process.exitCode=1;}
finally{proc.kill("SIGTERM");await sleep(300);}

/* Live integration test for normalized CareerOS job search.
 * Uses public sources only; no paid keys and no credentials.
 */
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const ts=require("typescript");
(async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"careeros-live-"));
  try{
    const dir=path.join(__dirname,"../lib/engine");
    for(const name of ["profile","rank","sources"]){
      const text=fs.readFileSync(path.join(dir,name+".ts"),"utf8");
      const compiled=ts.transpileModule(text,{compilerOptions:{
        module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
      }}).outputText;
      fs.writeFileSync(path.join(tmp,name+".js"),compiled);
    }
    const {discover}=require(path.join(tmp,"sources.js"));
    const {fitJob}=require(path.join(tmp,"rank.js"));
    const started=Date.now(),data=await discover();
    const results={
      status:data.status,sources:data.sourceCount,total:data.jobs.length,elapsedMs:Date.now()-started,
      byType:data.jobs.reduce((o,j)=>(o[j.source]=(o[j.source]||0)+1,o),{}),
      byTrack:data.jobs.reduce((o,j)=>(o[j.track]=(o[j.track]||0)+1,o),{}),
      failed:data.failedSources
    };
    console.log("LIVE_RESULT",JSON.stringify(results));
    console.log("SOURCE_DETAIL",JSON.stringify(data.sourceSummary));
    console.log("TOP_FITS",JSON.stringify(data.jobs.slice(0,8).map(j=>({
      title:j.title,company:j.company,source:j.source,score:fitJob(j).score,grade:fitJob(j).grade,
      urlValid:j.url.startsWith("https://"),applyValid:j.applyUrl.startsWith("https://")
    }))));
    if(data.sourceCount.ok===0||data.jobs.length===0)throw Error("No usable job results; verify public sources");
    if(data.jobs.some(j=>!j.title||!j.company||!j.applyUrl.startsWith("https://")))throw Error("Malformed job card");
    const seniorTop=data.jobs.filter(j=>/\b(senior|principal|staff|director)\b/i.test(j.title)&&fitJob(j).score>50);
    if(seniorTop.length)throw Error("Senior roles still scoring too highly: "+seniorTop.slice(0,3).map(j=>j.title).join(" | "));
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

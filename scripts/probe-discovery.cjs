/* One-off integration test for actual discovery and ranking in GitHub Actions.
 * Uses TypeScript transpilation; no service secrets, no mutations to source data.
 */
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const ts=require("typescript");
(async()=>{
 const root=path.join(__dirname,"..");
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"careeros-test-"));
 try{
  for(const file of ["job-search","search-sources"]){
   let source=fs.readFileSync(path.join(root,"lib",file+".ts"),"utf8");
   if(file==="search-sources")source=source.replace('from "@/lib/job-search"','from "./job-search"');
   const out=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
   fs.writeFileSync(path.join(temp,file+".js"),out);
  }
  const {discoverJobs}=require(path.join(temp,"search-sources.js"));
  const {rankJob}=require(path.join(temp,"job-search.js"));
  const start=Date.now();
  const response=await discoverJobs();
  const summary={status:response.status,feeds:response.sources,entries:response.jobs.length,durationMs:Date.now()-start};
  console.log("DISCOVERY_RESULT "+JSON.stringify(summary));
  const bySource={};
  for(const j of response.jobs)bySource[j.source]=(bySource[j.source]||0)+1;
  console.log("DISCOVERY_SOURCES "+JSON.stringify(bySource));
  console.log("DISCOVERY_FEED_COUNTS "+JSON.stringify(response.sourceStatus));
  console.log("DISCOVERY_EXAMPLES "+JSON.stringify(response.jobs.slice(0,5).map(j=>({source:j.source,title:j.title,company:j.company,location:j.location,score:rankJob(j).score,linkValid:j.applyUrl.startsWith("https://")}))));
  if(response.sources[1]===0)throw Error("All remote sources returned unusable responses");
  if(response.jobs.length===0)throw Error("Source APIs connect but no job postings pass the parsing/eligibility filters");
  if(response.jobs.some(j=>!j.id||!j.title||!j.company||!j.url||!j.applyUrl))throw Error("Malformed job records");
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

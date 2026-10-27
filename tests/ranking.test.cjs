/* Node built-in tests for CareerOS fit logic; no paid service or fake hiring probabilities. */
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const ts=require("typescript");
const src=fs.readFileSync(path.resolve(__dirname,"../lib/job-search.ts"),"utf8");
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const target={exports:{}};
vm.runInNewContext(js,target,{filename:"job-search.js"});
const {rankJob,classifyTrack,filterAndSort}=target.exports;
const base={
  id:"sample-1",title:"Software Engineer I",company:"Example",location:"New York, NY",
  workMode:"Hybrid",track:"engineering",description:"2 years of experience with TypeScript React SQL API integrations and testing automation.",
  salary:"",url:"https://example.com/job/1",applyUrl:"https://example.com/job/1",source:"Ashby",sourceUrl:"https://jobs.ashbyhq.com/",
  sector:"Software",date:"2026-10-24T12:00:00Z",dateKind:"published",retrievedAt:"2026-10-27T12:00:00Z",remoteEligibility:"unknown",
};
function test(name,fn){try{fn();process.stdout.write("PASS "+name+"\n");}catch(e){process.stderr.write("FAIL "+name+"\n");throw e;}}
test("SWE is recognized",()=>assert.equal(classifyTrack("Software Engineer II"),"engineering"));
test("Solutions engineering recognized",()=>assert.equal(classifyTrack("Solutions Engineer"),"solutions"));
test("Associate product recognized",()=>assert.equal(classifyTrack("Associate Product Manager"),"product"));
test("Senior Engineer I must not be treated as junior",()=>{
 const x=rankJob({...base,title:"Senior Software Engineer I",description:"React Python SQL. 2 years of experience."});
 assert.ok(x.score<=48,`Senior title incorrectly scored ${x.score}`);
 assert.ok(x.gaps.some(g=>/Senior/i.test(g)));
});
test("Non-engineering enablement roles are excluded",()=>{
 assert.equal(classifyTrack("Senior Enablement Program Associate - Technical Solutions Enablement"),null);
 assert.equal(classifyTrack("Product Marketing Director"),null);
});
test("Entry-level solutions engineer can score above a senior role",()=>{
 const junior=rankJob({...base,id:"s1",title:"Associate Solutions Engineer",track:"solutions",description:"Implementation, client demos, SQL APIs, and 1 year of experience."});
 const senior=rankJob({...base,id:"s2",title:"Senior Solutions Engineer",track:"solutions",description:"Implementation, client demos, SQL APIs, and 1 year of experience."});
 assert.ok(junior.score>senior.score+20);
});
test("Five-plus year requirement is a hard stretch gate",()=>{
 const x=rankJob({...base,id:"long-tenure",title:"Software Engineer",description:"7 years of professional experience with TypeScript React Python SQL and API integrations."});
 assert.ok(x.score<=47,`7-year job incorrectly scored ${x.score}`);
});
test("Early career role outranks staff role",()=>{
 const junior=rankJob(base);
 const staff=rankJob({...base,title:"Staff Software Engineer",description:"8+ years of professional software engineering experience. AWS Kubernetes and Go required."});
 assert.ok(junior.score>staff.score+25,`junior ${junior.score} staff ${staff.score}`);
});
test("NYC role outranks ineligible remote role",()=>{
 const local=rankJob(base).score;
 const distant=rankJob({...base,location:"Remote — Europe",workMode:"Remote",remoteEligibility:"unknown"}).score;
 assert.ok(local>distant);
});
test("Client implementation experience produces distinct evidence",()=>{
 const x=rankJob({...base,title:"Solutions Engineer",track:"solutions",description:"Client discovery, stakeholder requirements, integrations, technical demonstrations. 2 years of experience."});
 assert.ok(x.evidence.some(t=>/client|FIDx/i.test(t)));
});
test("No score is mislabeled as a probability",()=>{
 const result=rankJob(base);
 assert.ok(Number.isInteger(result.score)&&result.score>=0&&result.score<=100);
 assert.equal("probability" in result,false);
});
test("Sort by fit is deterministic",()=>{
 const staff={...base,id:"other",title:"Staff Software Engineer",description:"10 years of professional experience required."};
 const filters={text:"",track:"all",mode:"all",maxDays:3650,sort:"fit",hideStretch:false,sources:"all"};
 const ranked=filterAndSort([staff,base],filters,Date.parse("2026-10-27T15:00:00Z"));
 assert.equal(ranked[0].id,base.id);
});

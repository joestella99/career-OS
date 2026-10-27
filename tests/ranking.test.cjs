/* Rebuild regression suite. Runs using only Node and the installed TypeScript compiler. */
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const assert=require("node:assert/strict");
const ts=require("typescript");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"careeros-tests-"));
try{
  for(const name of ["profile","rank"]){
    const raw=fs.readFileSync(path.join(__dirname,"../lib/engine",name+".ts"),"utf8");
    const output=ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    fs.writeFileSync(path.join(tmp,name+".js"),output);
  }
  const {classifyTitle,titleSeniority,requiredYears,fitJob,isNycArea,permitsUSRemote}=require(path.join(tmp,"rank.js"));
  const base={
    id:"unit:1",title:"Software Engineer I",company:"Company",location:"New York, NY",track:"engineering",
    workplace:"Hybrid",eligibleLocation:true,source:"Ashby",sourceBoard:"company",sector:"Software",
    url:"https://example.com/job",applyUrl:"https://example.com/apply",
    description:"Requirements: 2 years of professional experience. React, TypeScript, SQL, Python. Client collaboration.",
    salary:null,date:"2026-10-27T12:00:00Z",dateType:"published",receivedAt:"2026-10-27T15:00:00Z",
  };
  let failures=0,passes=0;
  const check=(title,fn)=>{try{fn();passes++;console.log("PASS",title);}catch(e){failures++;console.error("FAIL",title,e);}};
  check("Core software title",()=>assert.equal(classifyTitle("Software Engineer II"),"engineering"));
  check("Solutions title",()=>assert.equal(classifyTitle("Sales Engineer"),"solutions"));
  check("APM title",()=>assert.equal(classifyTitle("Associate Product Manager"),"product"));
  check("No accidental enablement role",()=>assert.equal(classifyTitle("Senior Enablement Program Associate - Technical Solutions Enablement"),null));
  check("No nontechnical account executive",()=>assert.equal(classifyTitle("Account Executive"),null));
  check("Senior Engineer I is senior",()=>assert.equal(titleSeniority("Senior Software Engineer I"),"senior"));
  check("New Grad is entry",()=>assert.equal(titleSeniority("Software Engineer, New Grad"),"entry"));
  check("Two-to-five years range means 2 minimum",()=>assert.equal(requiredYears("Requirements: 2-5 years of experience delivering software."),2));
  check("En-dash tenure range means 2 minimum",()=>assert.equal(requiredYears("Requirements: 2–5 years of experience building platforms."),2));
  check("Requires 7+ years caught",()=>assert.equal(requiredYears("Qualifications: 7+ years of professional experience in engineering."),7));
  check("Company heritage doesn't become a requirement",()=>assert.equal(requiredYears("Founded 20 years ago; we build products."),null));
  check("NYC full address",()=>assert.equal(isNycArea("New York, NY"),true));
  check("NYC plain New York",()=>assert.equal(isNycArea("New York"),true));
  check("Upstate not NYC",()=>assert.equal(isNycArea("Albany, NY"),false));
  check("US eligible remote",()=>assert.equal(permitsUSRemote("Remote - US"),true));
  check("Entry beats senior",()=>{
    const entry=fitJob(base),senior=fitJob({...base,title:"Senior Software Engineer I"});
    assert.ok(entry.score>senior.score+20);assert.ok(senior.score<=41);
  });
  check("Five-plus years hard ceiling",()=>{
    const fit=fitJob({...base,title:"Software Engineer",description:"Required: 7 years of professional experience. React SQL Python."});
    assert.ok(fit.score<=41);assert.equal(fit.eligibility,"Likely mismatch");
  });
  check("Ineligible remote hard ceiling",()=>{
    const fit=fitJob({...base,eligibleLocation:false,location:"Remote, Europe",workplace:"Remote"});
    assert.ok(fit.score<=48);
  });
  check("Client-facing solutions proof",()=>{
    const fit=fitJob({...base,track:"solutions",title:"Associate Solutions Engineer"});
    assert.ok(fit.positives.some(s=>s.includes("broker-dealer")));
  });
  check("Non-NYC territory disqualification",()=>{
    const fit=fitJob({...base,track:"solutions",title:"Associate Sales Engineer - Midwest",
      workplace:"Remote",location:"Remote - US"});
    assert.ok(fit.score<=48);assert.ok(fit.cautions.some(s=>s.includes("territory")));
  });
  check("Mid West territory not a NYC strong target",()=>{
    const x=fitJob({...base,track:"solutions",title:"Associate Sales Engineer - Mid West",
      location:"Remote - US",workplace:"Remote"});
    assert.ok(x.score<=48,`Mid West incorrectly scored ${x.score}`);
  });
  check("French bilingual requirement not an assumed skill",()=>{
    const x=fitJob({...base,track:"solutions",title:"Associate Sales Engineer (French Bilingual)",
      location:"Remote - US",workplace:"Remote"});
    assert.ok(x.score<=43,`French bilingual role incorrectly scored ${x.score}`);
    assert.ok(x.cautions.some(v=>/fluency/i.test(v)));
  });
  check("Palantir New Grad excluded when cohort is incompatible",()=>{
    const x=fitJob({...base,title:"Software Engineer, New Grad",company:"Palantir"});
    assert.ok(x.score<=39,`Palantir graduate gate missed: ${x.score}`);
    assert.equal(x.eligibility,"Likely mismatch");
  });
  check("Explicit 2027 graduate requirement excludes 2024 graduate",()=>{
    const x=fitJob({...base,title:"Software Engineer, New Grad",company:"Other",
      description:"What We Require: Must be graduating in December 2027. React, SQL, TypeScript."});
    assert.ok(x.score<=39,`Future degree window missed: ${x.score}`);
  });
  check("No fake hiring probability field",()=>assert.ok(!("interviewProbability" in fitJob(base))));
  console.log("ENGINE TESTS",passes,"passed;",failures,"failed");
  if(failures)process.exitCode=1;
}finally{fs.rmSync(tmp,{force:true,recursive:true});}

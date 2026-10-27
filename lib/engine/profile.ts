/**
 * Candidate facts drawn from the Job Hunt career evidence master (Oct 26, 2026).
 * No personal contact details, Onshore or FitView, and no fabricated expertise.
 */
export const CANDIDATE={
  location:"New York City",
  experienceYears:2,
  graduated:"Dec 2024",
  degree:"B.S. Computer Science, Temple University",
  tracks:["Software Engineering","Solutions / Implementation","Associate Product"] as const,
  technologies:[
    {name:"TypeScript",rx:/\btypescript\b/i,proof:"Independent product engineering"},
    {name:"JavaScript",rx:/\bjavascript\b/i,proof:"Full-stack development and projects"},
    {name:"React",rx:/\breact(?:\.js|js)?\b/i,proof:"Our Money App"},
    {name:"Python",rx:/\bpython\b/i,proof:"Test automation and BatOracle"},
    {name:"SQL",rx:/\b(?:sql|postgres|mysql|sql server)\b/i,proof:"Professional and project experience"},
    {name:"C# / .NET",rx:/\b(?:c#|c-sharp|csharp|\.net|dotnet)\b/i,proof:"Engineering and QA work"},
    {name:"Java",rx:/\bjava\b(?!script)/i,proof:"Technical background"},
    {name:"Angular",rx:/\bangular\b/i,proof:"MLB Connections"},
    {name:"Selenium / Playwright",rx:/\b(?:selenium|playwright)\b/i,proof:"FIDx automation leadership"},
    {name:"API integration",rx:/\b(?:rest api|restful api|apis|api integration|integrations?|webhooks?)\b/i,proof:"Engineering and projects"},
    {name:"Testing / QA",rx:/\b(?:test automation|automated tests?|qa|quality assurance|test framework|e2e testing|pytest)\b/i,proof:"Led company-wide FIDx automation rollout"},
    {name:"Firebase",rx:/\b(?:firebase|firestore)\b/i,proof:"Our Money App"},
    {name:"Machine learning",rx:/\b(?:machine learning|xgboost|random forest|scikit.learn)\b/i,proof:"BatOracle sports analytics project"},
    {name:"Azure",rx:/\bazure\b/i,proof:"Listed technical background"}
  ],
  evidence:{
    engineering:"Promoted to Application Developer at FIDx; built internal tooling and led company-wide test automation adopted by all teams.",
    solutions:"Led broker-dealer client discovery, product demos, requirements translation and implementation meetings at FIDx.",
    product:"Owned internal tooling initiatives and independently built and iterated on Our Money App; no formal PM position claimed.",
    sports:"Worked at MLB Network and built BatOracle, MLB Connections and a sports scoreboard; authentic sports-domain experience."
  }
};
export type Track="engineering"|"solutions"|"product";
export type Source="Ashby"|"Greenhouse"|"Lever"|"Himalayas";
export type Job={
  id:string;
  title:string;
  company:string;
  location:string;
  track:Track;
  workplace:"On-site"|"Hybrid"|"Remote"|"Unspecified";
  eligibleLocation:boolean;
  source:Source;
  sourceBoard:string;
  sector:string;
  url:string;
  applyUrl:string;
  description:string;
  salary:string|null;
  date:string|null;
  dateType:"published"|"updated"|"unknown";
  receivedAt:string;
};
export type Fit={
  score:number;
  grade:"Strong target"|"Good target"|"Consider"|"Long shot";
  eligibility:"Good"|"Check requirements"|"Likely mismatch";
  positives:string[];
  cautions:string[];
  skills:string[];
  yearsRequired:number|null;
  seniority:"entry"|"mid"|"senior";
  sortPriority:number;
};

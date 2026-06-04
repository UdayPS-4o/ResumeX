// Curated word lists for ATS analysis. Browser-safe, no dependencies.
//
// SKILL_TERMS is a recognition dictionary, not an exhaustive taxonomy: when a
// term from here appears in a job description we treat it as a high-value
// "hard skill" keyword (must-match), separate from generic JD nouns. Multi-word
// entries are matched as phrases.

export const SKILL_TERMS = [
  // languages
  'javascript','typescript','python','java','c++','c#','c','go','golang','rust','ruby','php','swift',
  'kotlin','scala','r','matlab','perl','bash','shell','powershell','objective-c','dart','elixir','haskell',
  'sql','nosql','html','css','sass','less','graphql',
  // frontend
  'react','react native','redux','next.js','nextjs','vue','vue.js','nuxt','angular','svelte','solid',
  'tailwind','tailwind css','bootstrap','material ui','jquery','webpack','vite','rollup','babel',
  'web components','accessibility','wcag','responsive design','storybook',
  // backend / frameworks
  'node','node.js','express','nestjs','fastify','django','flask','fastapi','spring','spring boot',
  'rails','ruby on rails','laravel','.net','asp.net','dotnet','gin','phoenix','rest','rest api','grpc',
  'microservices','graphql','websockets','oauth','jwt','openapi','swagger',
  // data / ml
  'pandas','numpy','scikit-learn','tensorflow','pytorch','keras','spark','hadoop','airflow','dbt',
  'kafka','spark','tableau','power bi','looker','snowflake','databricks','etl','machine learning',
  'deep learning','nlp','computer vision','data analysis','data engineering','statistics','a/b testing',
  'llm','generative ai','prompt engineering','rag','vector database',
  // databases
  'postgresql','postgres','mysql','mongodb','redis','dynamodb','cassandra','elasticsearch','sqlite',
  'oracle','sql server','mariadb','neo4j','firebase','supabase','prisma','sqlalchemy',
  // cloud / devops
  'aws','azure','gcp','google cloud','docker','kubernetes','k8s','terraform','ansible','helm',
  'jenkins','github actions','gitlab ci','circleci','ci/cd','prometheus','grafana','datadog',
  'cloudformation','lambda','s3','ec2','rds','ecs','eks','serverless','nginx','linux','unix',
  'observability','sre','infrastructure as code',
  // tooling / practice
  'git','github','gitlab','bitbucket','jira','confluence','figma','agile','scrum','kanban',
  'test driven development','tdd','unit testing','integration testing','cypress','playwright','jest',
  'selenium','pytest','junit','mocha','vitest','design patterns','oop','functional programming',
  'system design','distributed systems','data structures','algorithms',
  // product / business / general professional
  'product management','project management','stakeholder management','roadmap','okrs','kpis',
  'go-to-market','market research','user research','ux','ui','wireframing','prototyping',
  'salesforce','hubspot','sap','excel','vba','google analytics','seo','sem','crm','erp',
  'budgeting','forecasting','financial modeling','p&l','gaap','quickbooks',
  'leadership','mentoring','cross-functional','communication','negotiation','presentation',
];

// Pre-lowercased set for O(1) membership when a single token is a known skill.
export const SKILL_SET = new Set(SKILL_TERMS.map(s => s.toLowerCase()));
export const MULTIWORD_SKILLS = SKILL_TERMS.filter(s => /\s|\.|\//.test(s));

// Strong résumé action verbs (lemma form). Used to reward impactful bullets.
export const STRONG_VERBS = new Set([
  'led','built','designed','developed','created','launched','shipped','improved','increased','reduced',
  'optimized','automated','architected','implemented','managed','drove','delivered','scaled','migrated',
  'refactored','spearheaded','owned','founded','engineered','streamlined','accelerated','generated',
  'grew','cut','saved','negotiated','mentored','coordinated','analyzed','researched','deployed',
  'integrated','established','launched','pioneered','overhauled','transformed','redesigned','rearchitected',
  'orchestrated','championed','initiated','executed','produced','boosted','expanded','consolidated',
  'eliminated','resolved','debugged','tested','validated','prototyped','authored','published','presented',
  'directed','supervised','trained','recruited','onboarded','forecasted','modeled','quantified',
  'secured','maintained','modernized','standardized','simplified','unified','enabled','partnered',
]);

// Weak / passive bullet openers. Bullets that start like this read as duties,
// not achievements — ATS-aimed résumés should avoid them.
export const WEAK_OPENERS = [
  'responsible for','tasked with','worked on','worked with','helped','assisted','participated in',
  'involved in','contributed to','duties included','in charge of','handled','dealt with','part of',
  'was responsible','were responsible','responsible','supported the','familiar with','exposure to',
];

// Overused clichés / buzzwords recruiters and ATS scoring tools flag as filler.
export const BUZZWORDS = [
  'team player','hard worker','hard-working','hardworking','detail-oriented','detail oriented',
  'go-getter','self-starter','self starter','results-driven','results driven','results-oriented',
  'think outside the box','synergy','synergize','go-to person','dynamic','proactive','motivated',
  'passionate','enthusiastic','fast learner','quick learner','goal-oriented','people person',
  'best of breed','value add','value-add','seasoned','guru','ninja','rockstar','wheelhouse',
  'hit the ground running','win-win','results oriented','track record of success',
];

// Leading adverbs to strip before checking a bullet's first verb
// ("Successfully led" → "led", "Independently built" → "built").
export const LEADING_ADVERBS = new Set([
  'successfully','independently','effectively','efficiently','consistently','proactively','single-handedly',
  'collaboratively','strategically','rapidly','quickly','significantly','substantially','directly',
  'personally','actively','also','recently','currently','additionally','subsequently','ultimately',
]);

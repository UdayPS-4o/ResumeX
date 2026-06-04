// Deterministic JD ↔ résumé keyword matching — the part real ATS systems
// actually rank on. No LLM, no network: fast, free, offline, browser-safe.

import { tokenize, normalizeToken, containsPhrase, STOPWORDS } from './text.js';
import { SKILL_SET, MULTIWORD_SKILLS } from './dictionary.js';

// Common skill aliases → a shared canonical key, so a résumé that says
// "PostgreSQL" matches a JD that says "Postgres" (and vice-versa). Both the
// résumé side and the JD side are run through matchKey(), so only the canonical
// values here need to agree — the keys are every spelling we want to unify.
const ALIASES = new Map([
  ['postgres', 'postgresql'], ['postgresql', 'postgresql'], ['psql', 'postgresql'],
  ['k8s', 'kubernetes'], ['kubernetes', 'kubernetes'],
  ['js', 'javascript'], ['javascript', 'javascript'],
  ['ts', 'typescript'], ['typescript', 'typescript'],
  ['golang', 'go'],
  ['node', 'nodejs'], ['node.js', 'nodejs'], ['nodejs', 'nodejs'],
  ['react.js', 'react'], ['reactjs', 'react'], ['react', 'react'],
  ['vue.js', 'vue'], ['vuejs', 'vue'],
  ['next.js', 'nextjs'], ['nextjs', 'nextjs'],
  ['tailwindcss', 'tailwind'],
  ['dotnet', '.net'], ['.net', '.net'],
  ['gcp', 'gcp'], ['gce', 'gcp'],
  ['ml', 'machinelearning'],
  ['postgressql', 'postgresql'],
]);

// Canonical match key for a single token: alias → canonical, else a conservative
// singularization. Both sides of a comparison go through this.
function matchKey(tok) {
  const t = String(tok || '').toLowerCase().trim();
  if (ALIASES.has(t)) return ALIASES.get(t);
  return normalizeToken(t);
}

// Flatten the résumé JSON into one searchable text blob.
export function resumeToText(r) {
  if (!r || typeof r !== 'object') return '';
  const parts = [];
  const push = v => { if (v) parts.push(String(v)); };
  push(r.name); push(r.headline); push(r.summary);
  const c = r.contact || {};
  push(c.location); push(c.website); push(c.linkedin); push(c.github);
  for (const e of r.experience || []) {
    push(e.company); push(e.title); push(e.location); (e.bullets || []).forEach(push);
  }
  for (const p of r.projects || []) {
    push(p.name); push(p.description); (p.tech || []).forEach(push); (p.bullets || []).forEach(push);
  }
  for (const ed of r.education || []) {
    push(ed.school); push(ed.degree); push(ed.location); (ed.details || []).forEach(push);
  }
  for (const s of r.skills || []) { push(s.category); (s.items || []).forEach(push); }
  for (const x of r.certifications || []) { push(x.name); push(x.issuer); }
  for (const a of r.awards || []) { push(a.name); push(a.issuer); push(a.description); }
  return parts.join(' \n ');
}

// Extract ranked keywords from a job description.
// Returns { skills: [...], terms: [...] } where `skills` are recognized hard
// skills (highest value) and `terms` are other frequent, meaningful nouns.
export function extractJdKeywords(jobDescription, limit = 28) {
  const jd = String(jobDescription || '');
  if (!jd.trim()) return { skills: [], terms: [], all: [] };
  const lower = jd.toLowerCase();

  // 1) Recognized multi-word skills present in the JD (phrase match).
  const skillHits = new Map(); // display → weight
  for (const phrase of MULTIWORD_SKILLS) {
    if (containsPhrase(lower, phrase)) skillHits.set(phrase, (skillHits.get(phrase) || 0) + 3);
  }

  // 2) Single-token frequency pass. Recognized skills are tracked by their RAW
  //    token so canonical names survive — normalization would mangle singulars
  //    that happen to end in "-es" (e.g. "kubernetes" → "kubernete").
  const freq = new Map();        // normalized term → count (general terms)
  const rawSkills = new Map();   // raw skill token → count
  for (const tok of tokenize(jd)) {
    if (STOPWORDS.has(tok)) continue;
    if (SKILL_SET.has(tok)) rawSkills.set(tok, (rawSkills.get(tok) || 0) + 1);
    const n = normalizeToken(tok);
    if (n.length < 2 || STOPWORDS.has(n)) continue;
    freq.set(n, (freq.get(n) || 0) + 1);
  }

  // Don't double-count a single token already covered by a multi-word skill.
  const coveredBySkill = new Set();
  for (const phrase of skillHits.keys()) {
    for (const t of tokenize(phrase)) coveredBySkill.add(normalizeToken(t));
  }

  const skills = [
    ...[...skillHits.keys()],
    ...[...rawSkills.keys()].filter(t => !coveredBySkill.has(normalizeToken(t))),
  ];
  const skillSetLocal = new Set(skills.flatMap(s => tokenize(s).map(normalizeToken)));

  // 3) Remaining high-frequency terms (capitalized or repeated) as soft keywords.
  const terms = [...freq.entries()]
    .filter(([t]) => !skillSetLocal.has(t) && !SKILL_SET.has(t))
    .filter(([t, count]) => count >= 2 || isLikelyProperNoun(t, jd))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);

  return { skills, terms, all: [...skills, ...terms] };
}

// Heuristic: was this token Capitalized somewhere mid-sentence in the JD?
function isLikelyProperNoun(token, jd) {
  const cap = token.charAt(0).toUpperCase() + token.slice(1);
  const re = new RegExp(`\\b${cap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return re.test(jd);
}

// Match extracted JD keywords against the résumé. Skills are weighted 2× terms,
// reflecting how ATS scoring prioritizes required hard skills.
export function matchKeywords(resume, jobDescription) {
  const { skills, terms } = extractJdKeywords(jobDescription);
  if (skills.length === 0 && terms.length === 0) return null;

  const text = resumeToText(resume);
  const lower = text.toLowerCase();
  const resumeKeys = new Set(tokenize(text).map(matchKey));

  const present = kw => {
    const p = String(kw).toLowerCase();
    if (/\s|\//.test(p)) {
      // Multi-word phrase: exact phrase, else all significant tokens present.
      if (containsPhrase(lower, p)) return true;
      const toks = tokenize(p).filter(t => !STOPWORDS.has(t));
      return toks.length > 0 && toks.every(t => resumeKeys.has(matchKey(t)));
    }
    // Single token (incl. dotted skills like "node.js") → canonical-key match.
    return resumeKeys.has(matchKey(p)) || containsPhrase(lower, p);
  };

  const matchedSkills = skills.filter(present);
  const missingSkills = skills.filter(k => !present(k));
  const matchedTerms = terms.filter(present);
  const missingTerms = terms.filter(k => !present(k));

  const SKILL_W = 2, TERM_W = 1;
  const got = matchedSkills.length * SKILL_W + matchedTerms.length * TERM_W;
  const total = skills.length * SKILL_W + terms.length * TERM_W;
  const coverage = total ? got / total : 0;

  return {
    coverage,                                   // 0..1
    percent: Math.round(coverage * 100),
    matchedSkills, missingSkills,
    matchedTerms, missingTerms,
    // Flat, de-duped lists for simple UI rendering (skills first — highest value).
    matched: [...matchedSkills, ...matchedTerms],
    missing: [...missingSkills, ...missingTerms],
  };
}

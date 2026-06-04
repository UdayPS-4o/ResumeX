// Deterministic JD ↔ résumé keyword matching — the part real ATS systems
// actually rank on. No LLM, no network: fast, free, offline, browser-safe.

import { tokenize, normalizeToken, contentTokens, containsPhrase, STOPWORDS } from './text.js';
import { SKILL_SET, MULTIWORD_SKILLS } from './dictionary.js';

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

  // 2) Single-token frequency pass over the JD.
  const freq = new Map();
  for (const tok of tokenize(jd)) {
    if (STOPWORDS.has(tok)) continue;
    const n = normalizeToken(tok);
    if (n.length < 2 || STOPWORDS.has(n)) continue;
    freq.set(n, (freq.get(n) || 0) + 1);
  }
  // Promote single-token known skills regardless of frequency.
  const singleSkills = new Map();
  for (const [tok, count] of freq) {
    if (SKILL_SET.has(tok)) singleSkills.set(tok, count);
  }

  // Don't double-count a single token already covered by a multi-word skill.
  const coveredBySkill = new Set();
  for (const phrase of skillHits.keys()) {
    for (const t of tokenize(phrase)) coveredBySkill.add(normalizeToken(t));
  }

  const skills = [
    ...[...skillHits.keys()],
    ...[...singleSkills.keys()].filter(t => !coveredBySkill.has(t)),
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
  const resumeTokens = new Set(contentTokens(text));

  const present = kw => {
    // Multi-word / special chars → phrase match; else normalized-token match.
    if (/\s|\.|\//.test(kw)) return containsPhrase(lower, kw);
    const n = normalizeToken(kw);
    return resumeTokens.has(n) || containsPhrase(lower, kw);
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

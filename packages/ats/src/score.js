// Deterministic ATS (Applicant Tracking System) checks over the resume JSON.
// Fast, reliable, dependency-free, and browser-safe (this runs in the Vite
// frontend AND the Node backend). Callers can layer LLM advice on top.
//
// Two modes:
//   runAtsChecks(resume)                          → résumé-quality + parseability score (max 100)
//   runAtsChecks(resume, { jobDescription })      → the above, reweighted to make
//                                                   room for a real keyword-match
//                                                   score (what ATS actually ranks on),
//                                                   plus a `keywords` report.

import {
  STRONG_VERBS, WEAK_OPENERS, BUZZWORDS, LEADING_ADVERBS,
} from './dictionary.js';
import { matchKeywords, resumeToText } from './keywords.js';
import { tokenize } from './text.js';

// Category weights. With a JD, the seven quality categories are scaled to 65 so
// a 35-pt "Keyword match" category can dominate — mirroring how ATS scoring
// prioritizes requisition keyword overlap. Both rows total 100.
const WEIGHTS_BASE = { contact: 15, sections: 20, quantified: 20, verbs: 15, dates: 10, skills: 10, concise: 10 };
const WEIGHTS_JD   = { contact: 10, sections: 13, quantified: 13, verbs: 10, dates: 7,  skills: 7,  concise: 5  }; // +35 keyword

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function runAtsChecks(resume, opts = {}) {
  const r = resume || {};
  const jd = (opts.jobDescription || '').trim();
  const W = jd ? WEIGHTS_JD : WEIGHTS_BASE;

  const breakdown = [];
  const issues = [];
  const passed = [];
  const add = (category, ratio, max) =>
    breakdown.push({ category, score: Math.round(clamp01(ratio) * max), max });

  const bullets = collectBullets(r);

  // 1. Contact info — email/phone/location are core; a profile link is a bonus.
  {
    const c = r.contact || {};
    const hasValidEmail = c.email && EMAIL_RE.test(String(c.email).trim());
    const hasLink = !!(c.linkedin || c.website || c.github);
    let pts = 0;
    if (hasValidEmail) pts += 6;
    else if (c.email) { pts += 3; issues.push({ severity: 'medium', text: 'Email address looks malformed — ATS may fail to parse it.' }); }
    else issues.push({ severity: 'high', text: 'No email address — ATS often requires one to route applications.' });
    if (c.phone) pts += 4; else issues.push({ severity: 'medium', text: 'No phone number listed.' });
    if (c.location) pts += 3; else issues.push({ severity: 'low', text: 'No location — many ATS filter by location.' });
    if (hasLink) pts += 2; else issues.push({ severity: 'low', text: 'No LinkedIn or portfolio link — recruiters expect at least one.' });
    if (hasValidEmail && c.phone) passed.push('Reachable contact details present');
    add('Contact info', pts / 15, W.contact);
  }

  // 2. Core sections present.
  {
    let pts = 0;
    if ((r.experience || []).length) pts += 8; else issues.push({ severity: 'high', text: 'No work experience section.' });
    if ((r.education || []).length) pts += 5; else issues.push({ severity: 'medium', text: 'No education section.' });
    if ((r.skills || []).length) pts += 4; else issues.push({ severity: 'high', text: 'No skills section — ATS keyword-matches heavily against skills.' });
    if ((r.summary || '').trim()) pts += 3; else issues.push({ severity: 'low', text: 'No professional summary to anchor keywords.' });
    if (pts >= 17) passed.push('All core sections present');
    add('Section coverage', pts / 20, W.sections);
  }

  // 3. Quantified achievements — real metrics, not stray years.
  {
    const quantified = bullets.filter(hasMetric).length;
    const ratio = bullets.length ? quantified / bullets.length : 0;
    if (bullets.length === 0) {
      issues.push({ severity: 'high', text: 'No bullet points to evaluate — add achievements under each role.' });
    } else if (ratio < 0.3) {
      issues.push({ severity: 'high', text: `Only ${quantified}/${bullets.length} bullets show measurable impact. Add metrics (%, $, time, scale).` });
    } else if (ratio >= 0.5) {
      passed.push(`${quantified}/${bullets.length} bullets include measurable impact`);
    }
    add('Quantified impact', ratio, W.quantified);
  }

  // 4. Action verbs — adverb-aware first-verb check + weak-opener detection.
  {
    const strong = bullets.filter(b => isStrongVerb(firstVerb(b))).length;
    const weak = bullets.filter(startsWeak);
    const ratio = bullets.length ? strong / bullets.length : 0;
    if (bullets.length && ratio < 0.4) {
      issues.push({ severity: 'medium', text: 'Many bullets don\'t open with a strong action verb (Led, Built, Reduced…).' });
    } else if (ratio >= 0.6) {
      passed.push('Bullets lead with strong action verbs');
    }
    if (weak.length) {
      issues.push({ severity: 'medium', text: `${weak.length} bullet${weak.length > 1 ? 's' : ''} start with weak phrasing ("responsible for", "worked on", "helped"…). Lead with an achievement verb.` });
    }
    add('Action verbs', ratio, W.verbs);
  }

  // 5. Dates on experience.
  {
    const exp = r.experience || [];
    const withDates = exp.filter(e => e.start || e.end).length;
    const ratio = exp.length ? withDates / exp.length : 0;
    if (exp.length && ratio < 1) {
      issues.push({ severity: 'medium', text: 'Some roles are missing start/end dates — ATS uses these to compute tenure.' });
    } else if (exp.length) {
      passed.push('All roles have dates');
    }
    add('Employment dates', ratio, W.dates);
  }

  // 6. Skills depth.
  {
    const items = (r.skills || []).reduce((n, s) => n + (s.items?.length || 0), 0);
    let ratio = 0;
    if (items >= 12) { ratio = 1; passed.push(`${items} skills listed for keyword matching`); }
    else if (items >= 6) ratio = 0.7;
    else if (items >= 1) ratio = 0.4;
    if (items < 6) issues.push({ severity: 'medium', text: 'Add more concrete, role-relevant skills/keywords for ATS matching.' });
    add('Skills / keywords', ratio, W.skills);
  }

  // 7. Conciseness & length — bullet length, overall word count, buzzwords.
  {
    const longOnes = bullets.filter(b => wordCount(b) > 32).length;
    let ratio = bullets.length ? 1 - Math.min(longOnes / bullets.length, 1) : 1;
    if (bullets.length && longOnes / bullets.length > 0.25) {
      issues.push({ severity: 'low', text: 'Some bullets are very long — keep them to one scannable line.' });
    } else if (bullets.length) {
      passed.push('Bullets are concise');
    }

    const totalWords = wordCount(resumeToText(r));
    if (totalWords && totalWords < 250) {
      issues.push({ severity: 'medium', text: `Résumé is short (~${totalWords} words) — likely too thin to rank well.` });
      ratio *= 0.8;
    } else if (totalWords > 1100) {
      issues.push({ severity: 'low', text: `Résumé is long (~${totalWords} words) — tighten to keep it scannable.` });
      ratio *= 0.85;
    }

    const buzz = findBuzzwords(r);
    if (buzz.length) {
      issues.push({ severity: 'low', text: `Replace cliché buzzwords with evidence: ${buzz.slice(0, 4).join(', ')}${buzz.length > 4 ? '…' : ''}.` });
      ratio -= Math.min(0.05 * buzz.length, 0.2);
    }
    add('Conciseness', ratio, W.concise);
  }

  // 8. Keyword match against the job description (only when a JD is supplied).
  let keywords = null;
  if (jd) {
    keywords = matchKeywords(r, jd);
    const cov = keywords ? keywords.coverage : 0;
    add('Keyword match', cov, 35);
    if (keywords) {
      if (keywords.missingSkills.length) {
        issues.push({
          severity: cov < 0.5 ? 'high' : 'medium',
          text: `Missing ${keywords.missingSkills.length} key skill${keywords.missingSkills.length > 1 ? 's' : ''} from the job description: ${keywords.missingSkills.slice(0, 8).join(', ')}${keywords.missingSkills.length > 8 ? '…' : ''}.`,
        });
      }
      if (cov >= 0.7) passed.push(`Matches ${keywords.percent}% of the job description's keywords`);
    }
  }

  const score = breakdown.reduce((s, b) => s + b.score, 0);
  const out = { score, grade: gradeFor(score), breakdown, issues, passed };
  if (keywords) out.keywords = keywords;
  return out;
}

export function gradeFor(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs work';
  return 'Poor';
}

// ── helpers ───────────────────────────────────────────────────────────────

const clamp01 = n => Math.max(0, Math.min(1, n));
const wordCount = s => (s ? String(s).trim().split(/\s+/).filter(Boolean).length : 0);

function collectBullets(r) {
  const out = [];
  for (const e of r.experience || []) out.push(...(e.bullets || []));
  for (const p of r.projects || []) out.push(...(p.bullets || []));
  return out.filter(Boolean);
}

// A bullet shows measurable impact if it contains a percentage, currency,
// multiplier, scaled count (10k/2M), or any number that isn't merely a year.
function hasMetric(s) {
  if (!s) return false;
  const t = String(s);
  if (/\d\s*%/.test(t)) return true;
  if (/[$€£₹]\s*\d/.test(t)) return true;
  if (/\b\d+(\.\d+)?\s*[x×]\b/i.test(t)) return true;
  if (/\b\d+(\.\d+)?\s*(k|m|bn|b|mm)\b/i.test(t)) return true;
  const stripped = t.replace(/\b(19|20)\d{2}\b/g, ' ');   // drop 4-digit years
  return /\d/.test(stripped);
}

// First meaningful verb of a bullet, skipping a leading adverb.
function firstVerb(s) {
  const words = String(s || '').trim().split(/\s+/);
  let w = (words[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  if (LEADING_ADVERBS.has(w) && words[1]) w = words[1].toLowerCase().replace(/[^a-z]/g, '');
  return w;
}

// Accepts the strong verb plus its common inflections (develop/develops/developing).
function isStrongVerb(w) {
  if (!w) return false;
  const forms = new Set([w]);
  if (w.endsWith('ing')) { const b = w.slice(0, -3); forms.add(b); forms.add(b + 'e'); }
  if (w.endsWith('es')) forms.add(w.slice(0, -2));
  if (w.endsWith('s')) forms.add(w.slice(0, -1));
  for (const b of [...forms]) { forms.add(b + 'ed'); forms.add(b + 'd'); }
  for (const f of forms) if (STRONG_VERBS.has(f)) return true;
  return false;
}

function startsWeak(s) {
  const t = String(s || '').toLowerCase().trimStart();
  return WEAK_OPENERS.some(p => t.startsWith(p));
}

function findBuzzwords(r) {
  const text = resumeToText(r).toLowerCase();
  const found = [];
  for (const b of BUZZWORDS) {
    if (text.includes(b) && !found.includes(b)) found.push(b);
  }
  return found;
}

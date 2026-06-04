// Deterministic ATS (Applicant Tracking System) checks over the resume JSON.
// These are fast, reliable, and don't need an LLM. Callers (the backend route)
// can layer LLM keyword suggestions on top.
//
// Ported from backend/src/services/atsChecks.js (canonical scoring/weighting)
// and frontend/src/lib/ats.js (adds the `grade` field the UI relies on).

const STRONG_VERBS = new Set([
  'led','built','designed','developed','created','launched','shipped','improved',
  'increased','reduced','optimized','automated','architected','implemented','managed',
  'drove','delivered','scaled','migrated','refactored','spearheaded','owned','founded',
  'engineered','streamlined','accelerated','generated','grew','cut','saved','negotiated',
  'mentored','coordinated','analyzed','researched','deployed','integrated','established',
]);

const hasNumber = s => /\d/.test(s || '');
const firstWord = s => (s || '').trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');

export function runAtsChecks(resume) {
  const r = resume || {};
  const breakdown = [];
  const issues = [];
  const passed = [];

  // 1. Contact info — 15
  {
    const c = r.contact || {};
    let pts = 0;
    if (c.email) pts += 6; else issues.push({ severity: 'high', text: 'No email address — ATS often requires one to route applications.' });
    if (c.phone) pts += 5; else issues.push({ severity: 'medium', text: 'No phone number listed.' });
    if (c.location) pts += 4; else issues.push({ severity: 'low', text: 'No location — many ATS filter by location.' });
    if (c.email && c.phone) passed.push('Reachable contact details present');
    breakdown.push({ category: 'Contact info', score: pts, max: 15 });
  }

  // 2. Core sections — 20
  {
    let pts = 0;
    if ((r.experience || []).length) pts += 8; else issues.push({ severity: 'high', text: 'No work experience section.' });
    if ((r.education || []).length) pts += 5; else issues.push({ severity: 'medium', text: 'No education section.' });
    if ((r.skills || []).length) pts += 4; else issues.push({ severity: 'high', text: 'No skills section — ATS keyword-matches heavily against skills.' });
    if ((r.summary || '').trim()) pts += 3; else issues.push({ severity: 'low', text: 'No professional summary.' });
    if (pts >= 17) passed.push('All core sections present');
    breakdown.push({ category: 'Section coverage', score: pts, max: 20 });
  }

  // 3. Quantified achievements — 20
  {
    const bullets = collectBullets(r);
    const quantified = bullets.filter(hasNumber).length;
    const ratio = bullets.length ? quantified / bullets.length : 0;
    const pts = Math.round(ratio * 20);
    if (bullets.length === 0) {
      issues.push({ severity: 'high', text: 'No bullet points to evaluate — add achievements under each role.' });
    } else if (ratio < 0.3) {
      issues.push({ severity: 'high', text: `Only ${quantified}/${bullets.length} bullets are quantified. Add metrics (%, $, time, scale).` });
    } else if (ratio >= 0.5) {
      passed.push(`${quantified}/${bullets.length} bullets include measurable impact`);
    }
    breakdown.push({ category: 'Quantified impact', score: pts, max: 20 });
  }

  // 4. Action verbs — 15
  {
    const bullets = collectBullets(r);
    const strong = bullets.filter(b => STRONG_VERBS.has(firstWord(b))).length;
    const ratio = bullets.length ? strong / bullets.length : 0;
    const pts = Math.round(ratio * 15);
    if (bullets.length && ratio < 0.4) {
      issues.push({ severity: 'medium', text: 'Many bullets don\'t start with a strong action verb (Led, Built, Reduced…).' });
    } else if (ratio >= 0.6) {
      passed.push('Bullets lead with strong action verbs');
    }
    breakdown.push({ category: 'Action verbs', score: pts, max: 15 });
  }

  // 5. Dates on experience — 10
  {
    const exp = r.experience || [];
    const withDates = exp.filter(e => e.start || e.end).length;
    const ratio = exp.length ? withDates / exp.length : 0;
    const pts = Math.round(ratio * 10);
    if (exp.length && ratio < 1) {
      issues.push({ severity: 'medium', text: 'Some roles are missing start/end dates — ATS uses these to compute tenure.' });
    } else if (exp.length) {
      passed.push('All roles have dates');
    }
    breakdown.push({ category: 'Employment dates', score: pts, max: 10 });
  }

  // 6. Skills depth — 10
  {
    const items = (r.skills || []).reduce((n, s) => n + (s.items?.length || 0), 0);
    let pts = 0;
    if (items >= 12) { pts = 10; passed.push(`${items} skills listed for keyword matching`); }
    else if (items >= 6) pts = 7;
    else if (items >= 1) pts = 4;
    if (items < 6) issues.push({ severity: 'medium', text: 'Add more concrete, role-relevant skills/keywords for ATS matching.' });
    breakdown.push({ category: 'Skills / keywords', score: pts, max: 10 });
  }

  // 7. Conciseness — 10
  {
    const bullets = collectBullets(r);
    const longOnes = bullets.filter(b => (b || '').split(/\s+/).length > 32).length;
    let pts = 10;
    if (bullets.length) {
      const ratio = longOnes / bullets.length;
      pts = Math.round((1 - Math.min(ratio, 1)) * 10);
      if (ratio > 0.25) issues.push({ severity: 'low', text: 'Some bullets are very long — keep them to one scannable line.' });
      else passed.push('Bullets are concise');
    }
    breakdown.push({ category: 'Conciseness', score: pts, max: 10 });
  }

  const score = breakdown.reduce((s, b) => s + b.score, 0);
  return { score, grade: gradeFor(score), breakdown, issues, passed };
}

export function gradeFor(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs work';
  return 'Poor';
}

function collectBullets(r) {
  const out = [];
  for (const e of r.experience || []) out.push(...(e.bullets || []));
  for (const p of r.projects || []) out.push(...(p.bullets || []));
  return out.filter(Boolean);
}

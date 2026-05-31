import { useLayoutEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ResumePreview — a faithful, fully client-side HTML render of a resume.
//
// Used for crisp thumbnails in two places:
//   • Dashboard cards   → the user's actual resume content
//   • Template picker    → a shared SAMPLE_RESUME, one card per template
//
// Because it's real HTML (not a rasterised PNG), it stays razor-sharp at any
// size — which is the whole point: the old picker shipped low-res preview images
// and the dashboard showed abstract grey bars.
//
// The page is laid out at a fixed "paper" width (PAGE_W px ≈ US-Letter @ 96dpi)
// and then uniformly scaled to fill whatever box it's dropped into, so every
// preview is pixel-proportional to a real printed page.
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_W = 816; // 8.5in * 96dpi

// ── Markdown → safe inline HTML (mirrors RichText's **bold** / *italic*) ──────
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function mdInline(s) {
  if (s == null || s === '') return { __html: '' };
  let h = escapeHtml(s);
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  h = h.replace(/\n/g, '<br/>');
  return { __html: h };
}
const has = (v) => v != null && String(v).trim() !== '';
const pick = (...vals) => vals.find(has);
const joinDates = (a, b) => [a, b].filter(has).join(' – ');

// Bullets may live under several keys, and may be an array or a newline string.
function asBullets(item) {
  const raw = item?.bullets ?? item?.highlights ?? item?.points ?? item?.items;
  if (Array.isArray(raw)) return raw.filter(has);
  if (has(raw)) return String(raw).split('\n').map((s) => s.trim()).filter(Boolean);
  return [];
}

// Skills entries: support {category, items}, {name, keywords}, or a bare string.
function skillLine(s) {
  if (typeof s === 'string') return { label: '', body: s };
  const label = pick(s?.category, s?.name, s?.group, s?.label) || '';
  const itemsRaw = s?.items ?? s?.keywords ?? s?.skills ?? s?.values ?? '';
  const body = Array.isArray(itemsRaw) ? itemsRaw.filter(has).join(', ') : String(itemsRaw || '');
  return { label, body };
}

// ── Per-template look. id → typography + section-heading treatment. ───────────
const SERIF = "Georgia, 'Times New Roman', Cambria, serif";
const SANS = "'Inter', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const STYLES = {
  uday: {
    accent: '#2062c9', font: SERIF, align: 'left',
    nameSize: 30, nameColor: '#2062c9', heading: 'rule', headingUpper: true,
    labels: { summary: 'Profile', experience: 'Work Experience', skills: 'Skills' },
  },
  jake: {
    accent: '#1f2937', font: SERIF, align: 'center',
    nameSize: 27, nameColor: '#111827', heading: 'underline', headingUpper: true,
    labels: { skills: 'Technical Skills' },
  },
  modern: {
    accent: '#2062c9', font: SANS, align: 'left',
    nameSize: 30, nameColor: '#2062c9', heading: 'rule', headingUpper: true,
    labels: { summary: 'Profile', experience: 'Work Experience', skills: 'Skills' },
  },
  classic: {
    accent: '#111827', font: SERIF, align: 'center',
    nameSize: 26, nameColor: '#111827', heading: 'center', headingUpper: true,
    labels: {},
  },
  compact: {
    accent: '#7c3aed', font: SANS, align: 'left',
    nameSize: 22, nameColor: '#7c3aed', heading: 'compact', headingUpper: true,
    dense: true, inlineHeadline: true,
    labels: {},
  },
};

const DEFAULT_ORDER = ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'awards'];
const BASE_LABELS = {
  summary: 'Summary', experience: 'Experience', education: 'Education',
  projects: 'Projects', skills: 'Skills', certifications: 'Certifications', awards: 'Awards',
};

// ── Scaled paper: render a fixed-width page, scale-to-fit its container. ───────
export function ScaledPage({ className, children, pageWidth = PAGE_W }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.32);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w) setScale(w / pageWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidth]);

  return (
    <div ref={ref} className={className} style={{ position: 'relative', overflow: 'hidden', background: '#fff' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: pageWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}

// ── Small layout atoms (sizes are in px on the full-width PAGE_W canvas) ───────
function Row({ left, right, strongLeft, italicLeft, size = 12.5, gap = 2 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, marginTop: gap }}>
      <div style={{ fontSize: size, fontWeight: strongLeft ? 700 : 400, fontStyle: italicLeft ? 'italic' : 'normal', color: '#1f2430', lineHeight: 1.35 }}>{left}</div>
      {has(right) && <div style={{ fontSize: size - 1, color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

function Bullets({ items, accent, dense }) {
  if (!items.length) return null;
  return (
    <ul style={{ listStyle: 'none', margin: dense ? '2px 0 0' : '3px 0 0', padding: 0 }}>
      {items.map((b, i) => (
        <li key={i} style={{ position: 'relative', paddingLeft: 14, fontSize: dense ? 11 : 11.5, color: '#374151', lineHeight: 1.4, marginTop: i ? (dense ? 1 : 2) : 0 }}>
          <span style={{ position: 'absolute', left: 2, color: accent }}>•</span>
          <span dangerouslySetInnerHTML={mdInline(b)} />
        </li>
      ))}
    </ul>
  );
}

function Heading({ children, s }) {
  const accent = s.accent;
  const text = s.headingUpper ? String(children).toUpperCase() : children;
  const common = {
    fontSize: s.dense ? 12 : 13,
    fontWeight: 700,
    letterSpacing: s.heading === 'center' ? 1.6 : s.headingUpper ? 0.6 : 0.2,
    marginTop: s.dense ? 11 : 15,
    marginBottom: 5,
    fontFamily: s.font,
  };
  if (s.heading === 'underline')
    return <div style={{ ...common, color: '#111827', borderBottom: '1.2px solid #111827', paddingBottom: 2 }}>{text}</div>;
  if (s.heading === 'accentrule')
    return <div style={{ ...common, color: accent, fontSize: s.dense ? 13 : 14.5, borderBottom: `1.4px solid ${accent}`, paddingBottom: 2 }}>{text}</div>;
  if (s.heading === 'center')
    return <div style={{ ...common, color: '#111827', textAlign: 'center', borderBottom: '1px solid #9aa1ad', paddingBottom: 3 }}>{text}</div>;
  if (s.heading === 'compact')
    return <div style={{ ...common, color: accent, borderBottom: `0.8px solid ${accent}55`, paddingBottom: 2 }}>{text}</div>;
  // 'rule' (uday) — accent text + accent rule
  return <div style={{ ...common, color: accent, borderBottom: `1.6px solid ${accent}`, paddingBottom: 2 }}>{text}</div>;
}

// ── Section renderers ─────────────────────────────────────────────────────────
function ExperienceItem({ it, s }) {
  const title = pick(it.title, it.role, it.position, it.jobTitle);
  const org = pick(it.company, it.org, it.organization, it.employer, it.companyName);
  const dates = pick(it.dates, joinDates(it.start, it.end));
  const loc = pick(it.location, it.place);
  const sub = has(title) ? [org, loc].filter(has).join(', ') : loc; // org folds into line 1 when there's no title
  const desc = pick(it.description, it.summary);
  return (
    <div style={{ marginTop: s.dense ? 6 : 8 }}>
      <Row left={pick(title, org)} right={dates} strongLeft />
      {has(sub) && <Row left={<span style={{ fontStyle: 'italic' }}>{sub}</span>} size={11.5} gap={0} />}
      {has(desc) && <div style={{ fontSize: 11.5, color: '#374151', marginTop: 2, lineHeight: 1.4 }} dangerouslySetInnerHTML={mdInline(desc)} />}
      <Bullets items={asBullets(it)} accent={s.accent} dense={s.dense} />
    </div>
  );
}

function EducationItem({ it, s }) {
  const school = pick(it.school, it.institution, it.org, it.university);
  let degree = pick(it.degree, it.title, it.qualification, it.program);
  if (has(degree) && has(it.gpa)) degree = `${degree} · GPA: ${it.gpa}`;
  const dates = pick(it.dates, joinDates(it.start, it.end), it.year);
  const loc = pick(it.location, it.place);
  // `details` is a string[] in the schema; tolerate a bare string or `description` too.
  const details = Array.isArray(it.details) ? it.details.filter(has)
    : has(it.details) ? [it.details] : has(it.description) ? [it.description] : [];
  return (
    <div style={{ marginTop: s.dense ? 5 : 7 }}>
      <Row left={school} right={pick(dates, loc)} strongLeft />
      {has(degree) && <Row left={<span style={{ fontStyle: 'italic' }}>{degree}</span>} right={has(dates) ? loc : null} size={11.5} gap={0} />}
      <Bullets items={details} accent={s.accent} dense={s.dense} />
    </div>
  );
}

function ProjectItem({ it, s }) {
  const name = pick(it.name, it.title);
  const techRaw = pick(it.tech, it.technologies, it.stack, it.tools);
  const tech = Array.isArray(techRaw) ? techRaw.filter(has).join(' · ') : techRaw;
  const dates = pick(it.dates, joinDates(it.start, it.end));
  const desc = pick(it.description, it.summary);
  return (
    <div style={{ marginTop: s.dense ? 5 : 7 }}>
      <Row left={<span>{name}{has(tech) && <span style={{ fontWeight: 400, color: '#6b7280' }}> — {tech}</span>}</span>} right={dates} strongLeft />
      {has(desc) && <div style={{ fontSize: 11.5, color: '#374151', marginTop: 1, lineHeight: 1.4 }} dangerouslySetInnerHTML={mdInline(desc)} />}
      <Bullets items={asBullets(it)} accent={s.accent} dense={s.dense} />
    </div>
  );
}

function CreditItem({ it, s }) {
  const name = pick(it.name, it.title);
  const issuer = pick(it.issuer, it.org, it.organization, it.authority);
  const date = pick(it.date, it.year, it.dates);
  const desc = pick(it.description, it.details);
  return (
    <div style={{ marginTop: s.dense ? 3 : 5 }}>
      <Row left={<span>{name}{has(issuer) && <span style={{ fontWeight: 400, color: '#6b7280' }}> — {issuer}</span>}</span>} right={date} strongLeft />
      {has(desc) && <div style={{ fontSize: 11.5, color: '#374151', marginTop: 1, lineHeight: 1.35 }} dangerouslySetInnerHTML={mdInline(desc)} />}
    </div>
  );
}

function renderSection(key, resume, s) {
  // User override wins, then the template's own label, then a generic default.
  const custom = resume?.sectionTitles?.[key];
  const label = (custom && String(custom).trim())
    || (s.labels && s.labels[key]) || BASE_LABELS[key] || key;
  if (key === 'summary') {
    if (!has(resume.summary)) return null;
    return (
      <section key={key}>
        <Heading s={s}>{label}</Heading>
        <div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.45 }} dangerouslySetInnerHTML={mdInline(resume.summary)} />
      </section>
    );
  }
  const list = Array.isArray(resume[key]) ? resume[key].filter(Boolean) : [];
  if (!list.length) return null;
  let body;
  if (key === 'experience') body = list.map((it, i) => <ExperienceItem key={i} it={it} s={s} />);
  else if (key === 'education') body = list.map((it, i) => <EducationItem key={i} it={it} s={s} />);
  else if (key === 'projects') body = list.map((it, i) => <ProjectItem key={i} it={it} s={s} />);
  else if (key === 'skills')
    body = list.map((sk, i) => {
      const { label: l, body: b } = skillLine(sk);
      if (!has(l) && !has(b)) return null;
      return (
        <div key={i} style={{ fontSize: 11.5, color: '#374151', marginTop: i ? 2 : 0, lineHeight: 1.4 }}>
          {has(l) && <span style={{ fontWeight: 700, color: '#1f2430' }}>{l}: </span>}
          <span dangerouslySetInnerHTML={mdInline(b)} />
        </div>
      );
    });
  else body = list.map((it, i) => <CreditItem key={i} it={it} s={s} />); // certifications, awards
  return (
    <section key={key}>
      <Heading s={s}>{label}</Heading>
      {body}
    </section>
  );
}

// ── The full-width page ───────────────────────────────────────────────────────
function ResumePage({ resume, template, fallbackName }) {
  const s = STYLES[template] || STYLES.jake;
  const r = resume || {};
  const c = r.contact || {};
  const name = pick(r.name, fallbackName) || 'Your Name';
  const headline = pick(r.headline, r.title, r.subtitle);
  const contactBits = [pick(c.location, c.city), c.phone, c.email, pick(c.website, c.site, c.url), c.linkedin, c.github, c.portfolio].filter(has);

  const order = (Array.isArray(r.sectionOrder) && r.sectionOrder.length ? r.sectionOrder : DEFAULT_ORDER)
    .filter((k) => DEFAULT_ORDER.includes(k));
  for (const k of DEFAULT_ORDER) if (!order.includes(k)) order.push(k);

  const sections = order.map((k) => renderSection(k, r, s)).filter(Boolean);
  const blank = !has(r.name) && sections.length === 0;

  return (
    <div style={{
      width: PAGE_W, minHeight: 1056, boxSizing: 'border-box',
      padding: s.dense ? '34px 42px' : '40px 50px',
      background: '#fff', color: '#1f2430', fontFamily: s.font,
      WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility',
    }}>
      <header style={{ textAlign: s.align, marginBottom: 4 }}>
        <div style={{ fontSize: s.nameSize, fontWeight: 700, color: s.nameColor, lineHeight: 1.05, letterSpacing: 0.2 }}>
          {name}
          {s.inlineHeadline && has(headline) && (
            <span style={{ fontSize: 14, fontWeight: 400, fontStyle: 'italic', color: '#4b5563' }}> — {headline}</span>
          )}
        </div>
        {!s.inlineHeadline && has(headline) && (
          <div style={{ fontSize: 14, color: '#374151', marginTop: 3, fontWeight: 500 }}>{headline}</div>
        )}
        {contactBits.length > 0 && (
          <div style={{ fontSize: 11, color: '#5b6470', marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '2px 0', justifyContent: s.align === 'center' ? 'center' : 'flex-start' }}>
            {contactBits.map((b, i) => (
              <span key={i}>{b}{i < contactBits.length - 1 && <span style={{ color: '#c2c8d0', margin: '0 4px' }}>·</span>}</span>
            ))}
          </div>
        )}
        <div style={{ borderBottom: `1px solid ${s.accent}22`, marginTop: 8 }} />
      </header>

      {blank ? (
        <div style={{ marginTop: 120, textAlign: 'center', color: '#aab2bd', fontSize: 14 }}>Empty resume — start chatting to fill it in</div>
      ) : sections}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export default function ResumePreview({ resume, template = 'jake', fallbackName, className }) {
  return (
    <ScaledPage className={className}>
      <ResumePage resume={resume} template={template} fallbackName={fallbackName} />
    </ScaledPage>
  );
}

// Sample content for the template picker — one canonical resume, shown in every
// template so the user is comparing layouts, not data.
export const SAMPLE_RESUME = {
  name: 'Alex Carter',
  headline: 'Senior Software Engineer',
  contact: {
    location: 'San Francisco, CA', phone: '(555) 234-9919',
    email: 'alex.carter@email.com', linkedin: 'linkedin.com/in/alexcarter', github: 'github.com/alexcarter',
  },
  summary: 'Full-stack engineer with 7+ years building scalable web platforms and developer tooling. Led teams shipping high-traffic products end-to-end — from **API design** to polished UI.',
  experience: [
    {
      title: 'Senior Software Engineer', company: 'Lanfield Technologies', location: 'San Francisco, CA',
      start: 'Mar 2021', end: 'Present',
      bullets: [
        'Architected a microservices platform serving 480M+ daily requests, cutting p95 latency by 38%.',
        'Led a team of 5 engineers delivering a customer dashboard adopted by 200+ enterprise clients.',
        'Drove the migration to TypeScript and CI/CD, reducing production incidents by 45%.',
      ],
    },
    {
      title: 'Software Engineer', company: 'Brightwave Labs', location: 'Austin, TX',
      start: 'Jul 2018', end: 'Feb 2021',
      bullets: [
        'Built real-time analytics pipelines processing 10TB of event data per day.',
        'Shipped a React component library adopted across 12 internal products.',
      ],
    },
  ],
  education: [
    { school: 'University of California, Berkeley', degree: 'B.S. in Computer Science', location: 'Berkeley, CA', start: '2014', end: '2018' },
  ],
  projects: [
    { name: 'DevPulse', tech: 'React · Node.js · PostgreSQL', description: 'Open-source CI dashboard aggregating build health across repositories.' },
    { name: 'QueryForge', tech: 'TypeScript', description: 'Type-safe SQL query builder with 2k+ GitHub stars.' },
  ],
  skills: [
    { category: 'Languages', items: 'JavaScript, TypeScript, Python, Go, SQL' },
    { category: 'Frameworks', items: 'React, Node.js, Express' },
    { category: 'Infrastructure', items: 'AWS, Docker, Kubernetes, PostgreSQL, Redis' },
  ],
};

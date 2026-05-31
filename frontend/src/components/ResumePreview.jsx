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

const PAGE_W = 794; // A4: 8.27in * 96dpi

// ── Markdown → safe inline HTML (mirrors RichText's **bold** / *italic*) ──────
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function mdInline(s) {
  if (s == null || s === '') return { __html: '' };
  let h = escapeHtml(s);
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  h = h.replace(/\+\+([^+]+)\+\+/g, '<mark style="background-color: #dcfce7; color: #065f46; border-radius: 2px; padding: 0 2px;">$1</mark>');
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
    dense: true, inlineHeadline: false,
    labels: {},
  },
  executive: {
    accent: '#1a56db', font: SANS, align: 'center',
    nameSize: 28, nameColor: '#1a56db', heading: 'double-rule', headingUpper: true,
    labels: { summary: 'Profile', experience: 'Work Experience' },
  },
  deedy: {
    accent: '#2b6cb0', font: SANS, align: 'center',
    nameSize: 26, nameColor: '#111827', heading: 'accentrule', headingUpper: true,
    layout: 'sidebar-left', sidebar: ['education', 'skills', 'awards'], sidebarWidth: '30%',
    labels: {},
  },
  alta: {
    accent: '#0d9488', font: SANS, align: 'left',
    nameSize: 26, nameColor: '#0d9488', heading: 'accentrule', headingUpper: true,
    headerLayout: 'split',
    labels: {},
  },
  minimalist: {
    accent: '#000000', font: SERIF, align: 'center',
    nameSize: 24, nameColor: '#1a202c', heading: 'framed-center', headingUpper: true,
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
  if (s.heading === 'double-rule')
    return (
      <div style={{ ...common, textAlign: 'center', color: accent, marginBottom: 8, marginTop: 18 }}>
        <div style={{ borderTop: `1.5px solid ${accent}`, marginBottom: 5 }} />
        {text}
        <div style={{ borderBottom: `1.5px solid ${accent}`, marginTop: 5, paddingBottom: 2 }} />
      </div>
    );
  if (s.heading === 'framed-center')
    return (
      <div style={{ ...common, textAlign: 'center', color: accent, marginBottom: 8, marginTop: 18 }}>
        <div style={{ borderTop: '1px solid #cbd5e1', marginBottom: 5 }} />
        <span style={{ letterSpacing: 1.5 }}>{text}</span>
        <div style={{ borderBottom: '1px solid #cbd5e1', marginTop: 5, paddingBottom: 2 }} />
      </div>
    );
  if (s.heading === 'background')
    return (
      <div style={{ ...common, textAlign: 'center', backgroundColor: accent, color: '#fff', padding: '4px 0', borderRadius: 2, marginBottom: 8, marginTop: 16 }}>
        {text}
      </div>
    );
  // 'rule' (modern) — accent text + accent rule
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
  const formatting = r.formatting || {};
  const isInlineHeadline = formatting.inlineHeadline ?? s.inlineHeadline ?? false;

  const order = (Array.isArray(r.sectionOrder) && r.sectionOrder.length ? r.sectionOrder : DEFAULT_ORDER)
    .filter((k) => DEFAULT_ORDER.includes(k));
  for (const k of DEFAULT_ORDER) if (!order.includes(k)) order.push(k);

  const mainKeys = s.layout === 'sidebar-left' ? order.filter(k => !s.sidebar.includes(k)) : order;
  const sidebarKeys = s.layout === 'sidebar-left' ? order.filter(k => s.sidebar.includes(k)) : [];

  const mainSections = mainKeys.map((k) => renderSection(k, r, s)).filter(Boolean);
  const sidebarSections = sidebarKeys.map((k) => renderSection(k, r, s)).filter(Boolean);
  const blank = !has(r.name) && mainSections.length === 0 && sidebarSections.length === 0;

  return (
    <div style={{
      width: PAGE_W, minHeight: 1123, boxSizing: 'border-box',
      padding: s.dense ? '34px 42px' : '40px 50px',
      background: '#fff', color: '#1f2430', fontFamily: s.font,
      WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility',
    }}>
      {s.headerLayout === 'split' ? (
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: s.nameSize, fontWeight: 700, color: s.nameColor, lineHeight: 1.05, letterSpacing: 0.2 }}>{name}</div>
            {has(headline) && <div style={{ fontSize: 14, color: '#374151', marginTop: 3, fontWeight: 500 }}>{headline}</div>}
          </div>
          <div style={{ fontSize: 11, color: '#5b6470', textAlign: 'right', lineHeight: 1.4 }}>
            {contactBits.map((b, i) => <div key={i}>{b}</div>)}
          </div>
        </header>
      ) : (
        <header style={{ textAlign: s.align, marginBottom: 4 }}>
          <div style={{ fontSize: s.nameSize, fontWeight: 700, color: s.nameColor, lineHeight: 1.05, letterSpacing: 0.2 }}>
            {name}
            {isInlineHeadline && has(headline) && (
              <span style={{ fontSize: 14, fontWeight: 400, fontStyle: 'italic', color: '#4b5563' }}> — {headline}</span>
            )}
          </div>
          {!isInlineHeadline && has(headline) && (
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
      )}

      {blank ? (
        <div style={{ marginTop: 120, textAlign: 'center', color: '#aab2bd', fontSize: 14 }}>Empty resume — start chatting to fill it in</div>
      ) : s.layout === 'sidebar-left' ? (
        <div style={{ display: 'flex', gap: 32, marginTop: 12 }}>
          <div style={{ width: s.sidebarWidth, flexShrink: 0 }}>
            {sidebarSections}
          </div>
          <div style={{ flex: 1 }}>
            {mainSections}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {mainSections}
        </div>
      )}
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
  headline: 'Senior Software Engineer | Scalable Systems',
  contact: {
    location: 'San Francisco, CA, USA',
    phone: '555-019-2837',
    email: 'hello@alexcarter.dev',
    linkedin: 'alex-carter',
    github: 'acarter-dev',
  },
  summary: 'Senior software engineer with a focus on designing and scaling high-throughput distributed systems. Experienced in migrating monolithic architectures to microservices and building robust data pipelines to accelerate business intelligence. Proven track record of taking complex infrastructure projects from concept to deployment, using modern cloud-native tools to maintain high availability and performance.',
  experience: [
    {
      title: 'Senior Backend Engineer', company: 'CloudScale Inc.', location: 'Seattle, WA, USA',
      start: 'Mar 2022', end: 'Present',
      bullets: [
        'Architected a distributed event-streaming platform to streamline the ingestion of real-time telemetry data across 50+ microservices.',
        'Owned the end-to-end migration of legacy on-premise databases to AWS Aurora, ensuring zero downtime and improving query performance by 40%.',
        'Collaborated with cross-functional teams to ensure seamless integration of new authentication protocols and compliance with strict data privacy regulations.',
      ],
    },
    {
      title: 'Software Engineer', company: 'DataFlow Systems', location: 'Austin, TX, USA',
      start: 'Jun 2019', end: 'Feb 2022',
      bullets: [
        "Delivered end-to-end backend features for DataFlow's flagship analytics dashboard (React frontend + Node.js/GraphQL backend).",
        'Shipped critical performance enhancements across the data ingestion pipeline, utilizing Redis caching to maintain sub-100ms response times.',
        'Integrated machine learning models into product workflows by building asynchronous task queues using Celery and RabbitMQ to orchestrate data processing.',
        "Enabled rich real-time reporting (time-series charts) by wiring WebSocket connections into the application's existing reporting layer.",
        'Worked in a fast-paced agile environment, collaborating directly with product managers to prioritize feature delivery and system reliability.',
      ],
    },
  ],
  projects: [
    {
      name: 'Distributed Task Scheduler', tech: 'Go, gRPC, etcd',
      description: "Engineered a fault-tolerant distributed task scheduling system to enable reliable background job execution. Built a custom consensus wrapper by analyzing Raft protocol implementations, enabling programmatic leader election and automatic failover scheduling (infrastructure-level integration layer).",
    },
    {
      name: 'High-Volume Order Processing', tech: 'Java, Kafka, Kubernetes',
      description: 'Built an asynchronous processing suite with high volume event ingestion (10k+ msgs/sec), inventory monitors, and a low-latency request-driven order executor (50ms SLA) at high concurrency. Implemented a centralized observability dashboard to manage dead-letter queues and retry logic; deployed on AWS EKS for scale. Integrated automated fallback mechanisms with circuit breakers to reduce manual intervention during downstream outages.',
    },
    {
      name: 'Automated CI/CD Orchestrator', tech: 'Python, Docker, GitHub Actions',
      description: 'Engineered an end-to-end deployment orchestration suite controlling 50+ concurrent microservice pipelines with a custom dependency-graph resolution engine for parallel builds. Engineered custom caching logic by optimizing Docker layer reuse to consistently achieve sub-minute build times, and deployed a centralized monitor to track live deployment progression and health status across all production environments.',
    },
    {
      name: 'Real-Time Fraud Detection', tech: 'Scala, Apache Flink, Cassandra',
      description: 'Built a real-time transaction monitoring system across multiple payment gateways, supporting parallel rule evaluations and anomaly detection. Monitored transaction streams via message brokers, detected and decoded fraudulent patterns, and triggered automated account lockouts with configurable thresholds executing within the same processing window.',
    },
  ],
  skills: [
    { category: 'Languages', items: 'Java, Go, Python, TypeScript, Scala, Rust, SQL, Bash' },
    { category: 'Backend & APIs', items: 'Node.js, Spring Boot, GraphQL, gRPC, REST, FastAPI' },
    { category: 'Data & Streaming', items: 'PostgreSQL, MongoDB, Cassandra, Redis, Kafka, RabbitMQ' },
    { category: 'Cloud & DevOps', items: 'AWS, Kubernetes, Docker, Terraform, Prometheus, CI/CD' },
  ],
  education: [
    { school: 'University of Washington, Seattle', degree: 'Bachelor of Science in Computer Science', start: 'Sep 2015', end: 'Jun 2019' },
  ],
};

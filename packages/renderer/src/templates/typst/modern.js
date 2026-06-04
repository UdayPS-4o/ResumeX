// "Modern" template — Typst port of the LaTeX `uday` layout.
// Big blue name, bold rule-separated uppercase sections, sans-serif body.
// Compiles via the Typst engine (format: 'typst').

import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Modern',
  description: 'Bold colored name with rule-separated sections — clean and contemporary.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#2062c9',
  defaultPageSize: 'a4',
  format: 'typst',
};

export const SEED_RESUME = {
  name: 'UDAY PRATAP SINGH PARIHAR',
  headline: 'FULL STACK | AUTOMATION | REVERSE ENGINEERING',
  contact: {
    email: 'work@udayps.com',
    phone: '8819923334',
    location: 'Indore, Madhya Pradesh, India',
    website: '',
    linkedin: '',
    github: '',
  },
  summary:
    'Full-stack developer focused on shipping production features and building efficient ' +
    'automation systems. Hands-on experience building LLM-powered products, developing agentic ' +
    'workflows, and reverse-engineering complex APIs to solve integration challenges. Comfortable ' +
    'with high-throughput systems and building reliable tools where documentation is limited. ' +
    'I enjoy digging into how systems work to deliver scalable, impactful solutions.',
  experience: [
    {
      company: 'Delivo',
      title: 'Founding Engineer',
      location: 'Mumbai, Maharashtra, India',
      start: 'Jan 2023',
      end: 'Feb 2025',
      description:
        'Built a cutting-edge logistics web platform to streamline the management of ' +
        'international shipping operation,',
      bullets: [
        'Owned the end-to-end tech stack, from platform architecture and core workflows to ' +
        'client/warehouse dashboards and system integrations.',
        'Collaborated with cross-functional teams to ensure seamless integration with existing ' +
        'systems and compliance with international shipping regulations.',
      ],
    },
    {
      company: 'Tradyon',
      title: 'Software Engineer Intern',
      location: 'Bengaluru, Karnataka, India',
      start: 'May 2025',
      end: 'Jul 2025',
      description:
        "Delivered end-to-end product features for Tradyon's cross platform AI chatbot " +
        '(**Next.js** web + **React Native** app).',
      bullets: [
        'Shipped production features and bug fixes across web and mobile to improve chatbot ' +
        'UX and reliability.',
        '**Built agentic workflows using Dify** and n8n to orchestrate LLM interactions with ' +
        'global trade-data retrieval (BigQuery backed) and downstream response generation.',
        "Enabled rich responses (text + charts/graphs) by wiring workflows into the app's " +
        'existing data/services layer.',
        'Worked in a fast iteration cycle, prioritizing delivery speed while maintaining code quality.',
      ],
    },
  ],
  projects: [
    {
      name: 'EHR Automation — eClinicalWorks',
      start: '',
      end: 'Aug 2025',
      description: '',
      tech: [],
      link: '',
      bullets: [
        "**Reverse engineered the platform's payload encryption** of request endpoints to enable " +
        'reliable automation. Built a custom API wrapper by analyzing network traffic and ' +
        'request/response patterns, enabling programmatic patient creation and appointment ' +
        'scheduling (UI-free integration layer).',
      ],
    },
    {
      name: 'E-commerce Automation — Myntra, Flipkart',
      start: '',
      end: 'Dec 2023',
      description: '',
      tech: [],
      link: '',
      bullets: [
        'Built an automation suite with high volume account generation (500+), restock/price ' +
        'monitors, and a low-latency **request-driven bulk checkout executor** (~2s COD) at 500+ ' +
        'concurrency. Implemented a **centralized web dashboard** to manage accounts, orders, and ' +
        'delivery codes; deployed on GCP Cloud Run for scale. Integrated automated card payment ' +
        'flows with **3DS OTP capture/autofill** via companion app integration to reduce manual intervention.',
      ],
    },
    {
      name: 'High-Concurrency Ticketing — BookMyShow / District',
      start: 'Oct 2024',
      end: 'Nov 2025',
      description: '',
      tech: [],
      link: '',
      bullets: [
        'Engineered an end-to-end RPA ticketing suite controlling **50 concurrent accounts on Firefox** ' +
        'with an IMAP-based auto-login pipeline for high-demand drops (Coldplay, Travis Scott, ' +
        'Diljit Dosanjh, 2023 World Cup). Engineered custom Queue-IT bypass logic by optimizing ' +
        'request timing to consistently achieve **sub 500 queue positions**, and deployed a centralized ' +
        'monitor to track live queue progression and seat availability across all active sessions.',
      ],
    },
    {
      name: 'Real-Time Copy Trading Bot (Solana + EVM)',
      start: '',
      end: 'Jul 2024',
      description: '',
      tech: [],
      link: '',
      bullets: [
        'Built a real time copy trading system across Solana and EVM chains (Ethereum, Base), ' +
        'supporting multiple copier + copying wallets. Monitored on-chain transactions via RPC nodes, ' +
        'detected and decoded swap input data, and mirrored trades with configurable allocation ' +
        'executing within the next block.',
      ],
    },
  ],
  skills: [
    {
      category: 'Automation',
      items: ['API/Android Reverse Engineering', 'Puppeteer', 'Appium', 'SSL Proxying', 'Burp', 'Frida', 'Dify'],
    },
    { category: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Tailwind', 'React Native'] },
    { category: 'Backend & DB', items: ['Node.js', 'Python', 'PHP', 'MySQL', 'Mongo'] },
    { category: 'Cloud & Infra', items: ['GCP (Cloud Run)', 'AWS', 'Serverless', 'Nginx', 'Linux'] },
  ],
  education: [
    {
      school: 'IPS Academy, Rajendra Nagar, Indore',
      degree: 'Bachelor of Technology - BTech in Computer Science',
      location: '',
      start: 'Jun 2023',
      end: 'Jun 2027',
      gpa: '',
      details: [],
    },
  ],
  certifications: [],
  awards: [],
};

export function renderModern(r, opts = {}) {
  const paper = typPaper(opts.pageSize || META.defaultPageSize);

  const c = r.contact || {};
  const contact = [
    c.location && `${typIcon('location')} ${typ(c.location)}`,
    c.phone && `${typIcon('phone')} ${typ(c.phone)}`,
    c.email && `${typIcon('email')} ${typLink('mailto:' + c.email, c.email)}`,
    c.linkedin && `${typIcon('linkedin')} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github')} ${typLink(c.github)}`,
    c.website && `${typIcon('website')} ${typLink(c.website)}`,
  ]
    .filter(Boolean)
    .join(' | ');

  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));
  const blocks = {};

  if (r.summary?.trim()) {
    blocks.summary = `#sectionhead[${H('summary', 'Profile')}]\n${typMd(r.summary)}`;
  }

  if (r.experience?.length) {
    const items = r.experience.map((x) => {
      const titleCo = [x.title && typ(x.title), x.company && typ(x.company)]
        .filter(Boolean)
        .join(', ');
      const lines = [`#entryhead[${titleCo}][${typDate(x.start, x.end)}]`];
      if (x.location) lines.push(`#text(size: 9pt, fill: subtext)[${typ(x.location)}]`);
      if (x.description?.trim()) lines.push(typMd(x.description));
      if (x.bullets?.length) lines.push(`#v(2pt)\n` + x.bullets.map((b) => `- ${typMd(b)}`).join('\n'));
      return lines.join('\n');
    });
    blocks.experience = `#sectionhead[${H('experience', 'Work Experience')}]\n${items.join('\n#v(10pt)\n')}`;
  }

  if (r.projects?.length) {
    const items = r.projects.map((p) => {
      const projDate =
        p.start && p.end ? typDate(p.start, p.end) : p.end || p.start ? typ(p.end || p.start) : '';
      const lines = [`#entryhead[${typMd(p.name)}][${projDate}]`];
      if (p.description?.trim()) lines.push(typMd(p.description));
      if (p.bullets?.length) lines.push(`#v(2pt)\n` + p.bullets.map((b) => `- ${typMd(b)}`).join('\n'));
      return lines.join('\n\n');
    });
    blocks.projects = `#sectionhead[${H('projects', 'Freelance Projects')}]\n${items.join('\n#v(10pt)\n')}`;
  }

  if (r.skills?.length) {
    const isBullets = r.settings?.skillsAsBullets ?? false;
    let lines = '';
    if (isBullets) {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:]\n${(s.items || []).map(i => `  - ${typ(i)}`).join('\n')}`)
        .join('\n\n');
    } else {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
        .join(' \\\n');
    }
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n${lines}`;
  }

  if (r.education?.length) {
    const items = r.education.map((e) => {
      const schoolLoc = [e.school && typ(e.school), e.location && typ(e.location)]
        .filter(Boolean)
        .join(', ');
      const lines = [`#entryhead[${schoolLoc}][${typDate(e.start, e.end)}]`];
      const sub = [];
      if (e.degree) sub.push(typ(e.degree));
      if (e.gpa) sub.push(`GPA: ${typ(e.gpa)}`);
      if (sub.length) lines.push(sub.join(' \\\n'));
      if (e.details?.length) lines.push(`#v(2pt)\n` + e.details.map((d) => `- ${typMd(d)}`).join('\n'));
      return lines.join('\n\n');
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n#v(10pt)\n')}`;
  }

  if (r.certifications?.length) {
    const items = r.certifications.map(
      (c2) => `#entryhead[${typ(c2.name)}][${typ(c2.date)}]\n\n${typ(c2.issuer)}`,
    );
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${items.join('\n#v(4pt)\n')}`;
  }

  if (r.awards?.length) {
    const items = r.awards.map((a) => {
      const lines = [`#entryhead[${typMd(a.name)}][${typ(a.date)}]`];
      if (a.issuer) lines.push(typ(a.issuer));
      if (a.description?.trim()) lines.push(typMd(a.description));
      return lines.join('\n\n');
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n#v(4pt)\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: (left: 0.39in, right: 0.49in, top: 0.30in, bottom: 0.30in))
#set text(font: ("Arial", "Helvetica Neue", "Liberation Sans"), size: 10pt, fill: rgb("#1E2330"))
#set par(leading: 0.55em, spacing: 0.45em, justify: false)
#set list(indent: 1.1em, body-indent: 0.4em, tight: false, spacing: 0.2em)
#show list: it => { set par(leading: 0.45em, spacing: 0.2em); it }

#let namecol = rgb("#2062C9")
#let sectioncol = rgb("#1F61C8")
#let icon-color = sectioncol
#let subtext = rgb("#3A3F4B")
#let sectionhead(title) = {
  v(12pt)
  line(length: 100%, stroke: 0.6pt + sectioncol)
  v(2pt)
  text(fill: sectioncol, weight: "bold", size: 12pt)[#upper(title)]
  v(2pt)
  line(length: 100%, stroke: 0.6pt + sectioncol)
  v(5pt)
}
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])

#text(size: 24pt, weight: "bold", fill: namecol)[${typ(r.name || 'YOUR NAME')}]

#v(2pt)
#text(size: 16pt, weight: "bold")[${typ(r.headline || '')}]

#v(1pt)
#text(size: 9pt)[${contact}]

${sections.join('\n\n')}
`;
}

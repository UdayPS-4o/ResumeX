// "Neat" template — Awesome CV-inspired premium layout.
// Dynamically imports the local neat-cv package files to construct the CV.

import { sectionTitle } from '../../typst.js';
import { typ, typMd, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Neat',
  description: 'Awesome CV-inspired premium layout — imported from official neat-cv Typst package.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#4682b4',
  defaultPageSize: 'a4',
  format: 'typst',
};

export function renderNeat(r, opts = {}) {
  const paper = typPaper(opts.pageSize || META.defaultPageSize);
  const accentColor = opts.accentColor || META.accent;

  const names = (r.name || 'Your Name').split(' ');
  const firstname = names[0] || 'Your';
  const lastname = names.slice(1).join(' ') || 'Name';

  const c = r.contact || {};
  const authorProps = [
    `firstname: ${JSON.stringify(firstname)}`,
    `lastname: ${JSON.stringify(lastname)}`
  ];
  if (c.email) authorProps.push(`email: ${JSON.stringify(c.email)}`);
  if (c.phone) authorProps.push(`phone: ${JSON.stringify(c.phone)}`);
  if (c.location) authorProps.push(`address: [${typ(c.location)}]`);
  if (r.headline) authorProps.push(`position: ${JSON.stringify(r.headline)}`);
  if (c.website) authorProps.push(`website: ${JSON.stringify(c.website)}`);
  if (c.github) {
    const ghUser = c.github.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '');
    authorProps.push(`github: ${JSON.stringify(ghUser)}`);
  }
  if (c.linkedin) {
    const liUser = c.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '');
    authorProps.push(`linkedin: ${JSON.stringify(liUser)}`);
  }

  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));

  // Build Sidebar content
  const sidebarParts = [];

  // Summary -> About me
  if (r.summary?.trim()) {
    sidebarParts.push(`= ${H('summary', 'About me')}\n${typMd(r.summary)}`);
  }

  // Skills -> Sidebar
  if (r.skills?.length) {
    const skillsList = r.skills.map(s => {
      if (r.settings?.skillsAsBullets ?? false) {
        return `#strong[${typ(s.category)}]\n${(s.items || []).map(item => `- ${typ(item)}`).join('\n')}`;
      } else {
        return `#strong[${typ(s.category)}]:\n${(s.items || []).map(typ).join(', ')}`;
      }
    }).join('\n\n');
    sidebarParts.push(`= ${H('skills', 'Skills')}\n${skillsList}`);
  }

  // Awards -> Sidebar
  if (r.awards?.length) {
    const awardsList = r.awards.map(a => {
      return `#strong[${typMd(a.name)}]\n#v(2pt)\n${[a.issuer, a.date ? `#emph[${typ(a.date)}]` : null].filter(Boolean).join(', ')}`;
    }).join('\n\n');
    sidebarParts.push(`= ${H('awards', 'Awards')}\n${awardsList}`);
  }

  // Build Main content
  const mainParts = [];

  // Experience
  if (r.experience?.length) {
    const expItems = r.experience.map(x => {
      const desc = [];
      if (x.description?.trim()) desc.push(typMd(x.description));
      if (x.bullets?.length) desc.push(...x.bullets.map(b => `- ${typMd(b)}`));
      return `#entry(
        title: ${JSON.stringify(x.title || '')},
        date: ${JSON.stringify(typDate(x.start, x.end))},
        institution: ${JSON.stringify(x.company || '')},
        location: ${JSON.stringify(x.location || '')},
        [${desc.join('\n')}]
      )`;
    }).join('\n\n');
    mainParts.push(`= ${H('experience', 'Experience')}\n${expItems}`);
  }

  // Projects
  if (r.projects?.length) {
    const projItems = r.projects.map(p => {
      const desc = [];
      if (p.description?.trim()) desc.push(typMd(p.description));
      if (p.bullets?.length) desc.push(...p.bullets.map(b => `- ${typMd(b)}`));
      const techStr = p.tech?.length ? ` [${p.tech.join(', ')}]` : '';
      return `#entry(
        title: ${JSON.stringify((p.name || '') + techStr)},
        date: ${JSON.stringify(typDate(p.start, p.end))},
        institution: ${JSON.stringify(p.link || '')},
        [${desc.join('\n')}]
      )`;
    }).join('\n\n');
    mainParts.push(`= ${H('projects', 'Projects')}\n${projItems}`);
  }

  // Education
  if (r.education?.length) {
    const eduItems = r.education.map(e => {
      const desc = [];
      if (e.gpa) desc.push(`GPA: ${typ(e.gpa)}`);
      if (e.details?.length) desc.push(...e.details.map(d => `- ${typMd(d)}`));
      return `#entry(
        title: ${JSON.stringify(e.degree || '')},
        date: ${JSON.stringify(typDate(e.start, e.end))},
        institution: ${JSON.stringify(e.school || '')},
        location: ${JSON.stringify(e.location || '')},
        [${desc.join('\n')}]
      )`;
    }).join('\n\n');
    mainParts.push(`= ${H('education', 'Education')}\n${eduItems}`);
  }

  // Certifications
  if (r.certifications?.length) {
    const certItems = r.certifications.map(c2 => {
      return `#entry(
        title: ${JSON.stringify(c2.name || '')},
        date: ${JSON.stringify(c2.date || '')},
        institution: ${JSON.stringify(c2.issuer || '')},
        []
      )`;
    }).join('\n\n');
    mainParts.push(`= ${H('certifications', 'Certifications')}\n${certItems}`);
  }

  return `#import "/packages/renderer/src/templates/typst/packages/neat-cv/lib.typ": *

#show: cv.with(
  author: (
    ${authorProps.join(',\n    ')}
  ),
  accent-color: rgb("${accentColor}"),
  paper-size: "${paper}",
)

#cv-with-side[
  ${sidebarParts.join('\n\n')}
][
  ${mainParts.join('\n\n')}
]
`;
}

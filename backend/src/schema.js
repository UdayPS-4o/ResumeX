// Canonical resume JSON shape used throughout the app.
// LLMs are asked to return updates that match this shape; renderers consume it.

export const emptyResume = () => ({
  name: '',
  headline: '',
  contact: {
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
  },
  summary: '',
  experience: [],   // { company, title, location, start, end, bullets:[] }
  education: [],    // { school, degree, location, start, end, gpa, details:[] }
  projects: [],     // { name, description, tech:[], link, bullets:[] }
  skills: [],       // { category, items:[] }
  certifications: [], // { name, issuer, date }
  awards: [],         // { name, issuer, date, description }
  sectionOrder: [],   // optional explicit section order; empty = template default
  sectionTitles: {},  // optional per-section heading overrides; e.g. { projects: 'Selected Work' }
});

// Lightweight JSON-schema description handed to providers that support structured output.
export const resumeJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    headline: { type: 'string' },
    contact: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        location: { type: 'string' },
        website: { type: 'string' },
        linkedin: { type: 'string' },
        github: { type: 'string' },
      },
    },
    summary: { type: 'string' },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          location: { type: 'string' },
          start: { type: 'string' },
          end: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' },
          degree: { type: 'string' },
          location: { type: 'string' },
          start: { type: 'string' },
          end: { type: 'string' },
          gpa: { type: 'string' },
          details: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          tech: { type: 'array', items: { type: 'string' } },
          link: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          issuer: { type: 'string' },
          date: { type: 'string' },
        },
      },
    },
    awards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          issuer: { type: 'string' },
          date: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
};

// Merge updates into the working resume, replacing arrays wholesale
// (so the model fully owns each section).
export function mergeResume(current, update) {
  if (!update || typeof update !== 'object') return current;
  const next = { ...emptyResume(), ...current };
  for (const [key, value] of Object.entries(update)) {
    if (value === undefined || value === null) continue;
    if (key === 'contact' && typeof value === 'object') {
      next.contact = { ...next.contact, ...value };
    } else if (key === 'sectionTitles' && typeof value === 'object') {
      // Merge (don't replace) so a model turn never wipes the user's custom headings.
      next.sectionTitles = { ...(next.sectionTitles || {}), ...value };
    } else {
      next[key] = value;
    }
  }
  return next;
}

// Type definitions for resume-latex-renderer

export interface ResumeContact {
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
}

export interface ExperienceItem {
  company?: string;
  title?: string;
  location?: string;
  start?: string;
  end?: string;
  bullets?: string[];
}

export interface EducationItem {
  school?: string;
  degree?: string;
  location?: string;
  start?: string;
  end?: string;
  gpa?: string;
  details?: string[];
}

export interface ProjectItem {
  name?: string;
  description?: string;
  tech?: string[];
  link?: string;
  bullets?: string[];
}

export interface SkillGroup {
  category?: string;
  items?: string[];
}

export interface CertificationItem {
  name?: string;
  issuer?: string;
  date?: string;
}

export interface AwardItem {
  name?: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface Resume {
  name?: string;
  headline?: string;
  contact?: ResumeContact;
  summary?: string;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  projects?: ProjectItem[];
  skills?: SkillGroup[];
  certifications?: CertificationItem[];
  awards?: AwardItem[];
  /** Optional explicit section order; empty array = template default. */
  sectionOrder?: string[];
}

export type PageSize = "letter" | "a4" | "legal";

export interface RenderOptions {
  pageSize?: PageSize;
  [key: string]: unknown;
}

export interface TemplateMeta {
  name: string;
  description: string;
  author: string;
  license: string;
  accent: string;
  defaultPageSize?: PageSize;
}

export interface TemplateInfo extends TemplateMeta {
  id: string;
  hasSeed: boolean;
}

export interface TemplateDefinition {
  meta: TemplateMeta;
  render: (resume: Resume, opts?: RenderOptions) => string;
  seed?: Resume;
}

/** Render a resume to a complete LaTeX document string. */
export function renderResume(templateId: string, resume: Resume, opts?: RenderOptions): string;

/** Get a template's metadata + render fn, or undefined if unknown. */
export function getTemplate(id: string): (TemplateInfo & { render: TemplateDefinition["render"] }) | undefined;

/** List metadata for all built-in templates. */
export function listTemplates(): TemplateInfo[];

/** Sample/seed resume bundled with a template, or null. */
export function getSeed(id: string): Resume | null;

/** Factory for an empty resume object. */
export function emptyResume(): Resume;

/** Merge a partial update into a resume (arrays replaced wholesale). */
export function mergeResume(current: Resume, update: Partial<Resume>): Resume;

/** JSON schema describing the resume shape (for LLM structured output). */
export const resumeJsonSchema: Record<string, unknown>;

/** Registry of all templates by id. */
export const TEMPLATES: Record<string, TemplateDefinition>;

/** Low-level LaTeX helpers for authoring custom templates. */
export const latex: {
  tex(value: unknown): string;
  joinTex(parts: unknown[], sep?: string): string;
  hrefTex(url: string, display?: string): string;
  dateRange(start?: string, end?: string): string;
  orderSections(
    blocks: Record<string, string>,
    fallbackOrder: string[],
    explicitOrder?: string[]
  ): string[];
};

declare const _default: {
  renderResume: typeof renderResume;
  getTemplate: typeof getTemplate;
  listTemplates: typeof listTemplates;
  getSeed: typeof getSeed;
  TEMPLATES: typeof TEMPLATES;
  emptyResume: typeof emptyResume;
  mergeResume: typeof mergeResume;
  resumeJsonSchema: typeof resumeJsonSchema;
  latex: typeof latex;
};
export default _default;

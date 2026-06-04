// @resumex/renderer — single source of truth for LaTeX resume templates.
export { renderTemplate, listTemplates, getSeed, TEMPLATES } from './templates/index.js';

// Re-export the LaTeX string helpers so consumers can import them from the
// package root as well as via the "./latex.js" subpath.
export * from './latex.js';

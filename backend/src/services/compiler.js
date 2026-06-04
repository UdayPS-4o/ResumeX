// Compile a rendered resume (Typst source) to a PDF Buffer using the fast vendored Typst engine.

import { compileTypst, detectTypst } from './typstCompiler.js';

// Report which compilers the server will use (for /api/health).
export function compileInfo() {
  return { typst: Boolean(detectTypst()) };
}

// Dispatch a rendered document to the Typst engine.
export async function compileSource(source, format = 'typst') {
  // We compile all sources via Typst now since LaTeX has been removed.
  return compileTypst(source);
}

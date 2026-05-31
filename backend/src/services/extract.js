// Extract plain text from an uploaded resume file (PDF or DOCX).
import mammoth from 'mammoth';

export async function extractText(buffer, filename = '', mimetype = '') {
  const name = filename.toLowerCase();
  const isPdf = mimetype === 'application/pdf' || name.endsWith('.pdf');
  const isDocx =
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx');
  const isDoc = name.endsWith('.doc') && !name.endsWith('.docx');

  if (isPdf) return cleanup(await extractPdf(buffer));
  if (isDocx) return cleanup(await extractDocx(buffer));
  if (isDoc) {
    const err = new Error('Legacy .doc files are not supported. Please save as .docx or PDF.');
    err.status = 415;
    throw err;
  }

  // Last resort: treat as UTF-8 text.
  const text = buffer.toString('utf8');
  if (text && /[\x20-\x7E]/.test(text)) return cleanup(text);

  const err = new Error('Unsupported file type. Upload a PDF or DOCX.');
  err.status = 415;
  throw err;
}

async function extractPdf(buffer) {
  // pdfjs-dist legacy build runs in Node.
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Reconstruct rough line breaks from item vertical positions.
    let lastY = null;
    let line = '';
    const lines = [];
    for (const item of content.items) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = '';
      }
      line += item.str + (item.hasEOL ? '' : ' ');
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pages.push(lines.join('\n'));
  }
  await doc.destroy?.();
  return pages.join('\n\n');
}

async function extractDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return value || '';
}

function cleanup(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Trim trailing blank space from a single-page PDF so a short resume doesn't
// sit on a half-empty page. We keep the page width and top margin, then shrink
// the page height down to the lowest inked pixel plus a matching bottom margin.
//
// Done as a post-compile step (rather than in Typst) so it works for every
// template without disturbing their layout. Best-effort: any failure returns
// the original PDF unchanged.

import * as mupdf from 'mupdf';

const SCAN_DPI = 100;        // resolution for detecting where content ends
const INK = 245;             // a channel below this counts as "ink" (not white)
const DEFAULT_MARGIN_PT = 0.55 * 72; // bottom padding, matches template top margin

// Find the y (in PDF points, from the top) of the lowest non-white pixel.
function lowestInkPt(page) {
  const s = SCAN_DPI / 72;
  const pix = page.toPixmap(mupdf.Matrix.scale(s, s), mupdf.ColorSpace.DeviceRGB, false, true);
  const W = pix.getWidth(), H = pix.getHeight(), N = pix.getNumberOfComponents();
  const px = pix.getPixels();
  for (let y = H - 1; y >= 0; y--) {
    const row = y * W * N;
    for (let x = 0; x < W; x++) {
      const i = row + x * N;
      if (px[i] < INK || px[i + 1] < INK || px[i + 2] < INK) return (y + 1) / s;
    }
  }
  return -1; // fully blank
}

// Returns a possibly-smaller PDF buffer. Only trims single-page docs and only
// when it saves a meaningful amount of height.
export function trimPdfBottom(buffer, { marginPt = DEFAULT_MARGIN_PT, minSavingsPt = 18 } = {}) {
  try {
    const doc = mupdf.Document.openDocument(buffer, 'application/pdf');
    if (doc.countPages() !== 1) return buffer; // overflowed to 2+ pages: nothing to trim
    const page = doc.loadPage(0);
    const [x0, , x1, pageH] = page.getBounds();

    const ink = lowestInkPt(page);
    if (ink < 0) return buffer; // blank page — leave it alone

    const newH = ink + marginPt;
    if (newH >= pageH - minSavingsPt) return buffer; // not enough whitespace to bother

    // mupdf page-box space is top-left origin, so [x0, 0, x1, newH] keeps the
    // top of the page and drops everything below newH.
    page.setPageBox('MediaBox', [x0, 0, x1, newH]);
    page.setPageBox('CropBox', [x0, 0, x1, newH]);

    const out = doc.saveToBuffer('');
    return Buffer.from(out.asUint8Array());
  } catch {
    return buffer; // never let trimming break a compile
  }
}

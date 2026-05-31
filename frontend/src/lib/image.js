// Downscale an image File/Blob and return { mime, data, dataUrl } where
// `data` is raw base64 (no prefix) for the API and `dataUrl` is for previews.
// Keeps payloads small so they fit within request and provider limits.

const MAX_DIM = 1280;
const QUALITY = 0.82;

export async function fileToImagePart(file) {
  const bitmap = await loadBitmap(file);
  const { width, height } = fit(bitmap.width, bitmap.height, MAX_DIM);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // PNG keeps crispness for screenshots of text; JPEG is smaller for photos.
  const useJpeg = !/png/i.test(file.type);
  const mime = useJpeg ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mime, QUALITY);
  const data = dataUrl.split(',')[1];
  return { mime, data, dataUrl };
}

function loadBitmap(file) {
  if (typeof window !== 'undefined' && window.createImageBitmap) {
    return createImageBitmap(file);
  }
  // Fallback for environments without createImageBitmap.
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function fit(w, h, max) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

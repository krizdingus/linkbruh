// Media download for the Instagram fallback — video, images, and carousels.
// Instagram proxies come in several shapes: kkinstagram redirects a /reel/ URL
// straight to the video file; vxinstagram serves an HTML page with an og:video
// tag; photo posts and carousels serve an HTML page with one or more og:image
// tags. fetchInstagramMedia handles all three and only returns something when
// the result is actually media — so an HTML "login wall" bounce never gets
// uploaded as a fake .mp4 or .jpg.

import { MAX_UPLOAD_BYTES, MAX_ATTACHMENTS, SCRAPER_UA } from './config.js';
import { parseVideoUrl, parseImageUrls } from './embeds.js';

const DOWNLOAD_TIMEOUT_MS = 20000;
const MEDIA_EXT_RE = /\.(mp4|mov|webm|gif|jpg|jpeg|png|webp)$/i;

// Derive a sensible attachment filename from the (possibly redirected) URL. CDN
// basenames are long and ugly, so anything unreasonable becomes the fallback.
export function filenameFor(url, fallback = 'video.mp4') {
  try {
    const base = new URL(url).pathname.split('/').pop() || '';
    if (MEDIA_EXT_RE.test(base) && base.length <= 40) return base;
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function withinLimit(declaredLength) {
  return !(declaredLength && declaredLength > MAX_UPLOAD_BYTES);
}

// Fetch a DIRECT media URL into a Buffer if it is a video or image within the
// size limit. Returns { buffer, name } or null. `fallbackName` names the
// attachment when the URL has no usable basename.
async function downloadDirect(url, fallbackName) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': SCRAPER_UA }, signal: controller.signal });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.startsWith('video/') && !type.startsWith('image/')) return null;
    if (!withinLimit(Number(res.headers.get('content-length')))) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_BYTES) return null;
    return { buffer, name: filenameFor(res.url || url, fallbackName) };
  } finally {
    clearTimeout(timer);
  }
}

// Resolve one proxy candidate to its media file(s). Three shapes are handled:
//   - the proxy redirects straight to the media file (kkinstagram /reel/),
//   - an HTML page with an og:video (vxinstagram-style reel),
//   - an HTML page with one or more og:image tags (photo or carousel).
// Returns { files: [{ buffer, name }] } or null.
async function fetchFromCandidate(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': SCRAPER_UA }, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return null;

  const type = (res.headers.get('content-type') || '').toLowerCase();

  // The proxy IS the file (direct redirect to the CDN).
  if (type.startsWith('video/') || type.startsWith('image/')) {
    if (!withinLimit(Number(res.headers.get('content-length')))) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_BYTES) return null;
    const fallback = type.startsWith('video/') ? 'video.mp4' : 'image.jpg';
    return { files: [{ buffer, name: filenameFor(res.url || url, fallback) }] };
  }

  if (!type.includes('text/html')) return null;
  const html = await res.text();

  const videoUrl = parseVideoUrl(html);
  if (videoUrl) {
    const file = await downloadDirect(videoUrl, 'video.mp4');
    return file ? { files: [file] } : null;
  }

  const imageUrls = parseImageUrls(html).slice(0, MAX_ATTACHMENTS);
  if (imageUrls.length) {
    const files = [];
    for (const imageUrl of imageUrls) {
      const file = await downloadDirect(imageUrl, 'image.jpg');
      if (file) files.push(file);
    }
    if (files.length) return { files };
  }

  return null;
}

// Try each candidate proxy URL in turn; return the first that yields media.
// Returns { files: [{ buffer, name }] } or null (private / age-restricted /
// removed / too big / all proxies down).
export async function fetchInstagramMedia(candidateUrls) {
  for (const url of candidateUrls) {
    try {
      const result = await fetchFromCandidate(url);
      if (result) return result;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

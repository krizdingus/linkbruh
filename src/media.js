// Video download for the Instagram fallback. Instagram proxies come in two
// shapes: kkinstagram redirects a /reel/ URL straight to the video file, while
// vxinstagram serves an HTML page with an og:video tag. downloadVideo handles
// both and, crucially, only returns something when the result is actually a
// video — so an HTML "login wall" bounce never gets uploaded as a fake .mp4.

import { MAX_UPLOAD_BYTES, SCRAPER_UA } from './config.js';
import { parseVideoUrl } from './embeds.js';

const DOWNLOAD_TIMEOUT_MS = 20000;

// Derive a sensible attachment filename from the (possibly redirected) URL. The
// CDN basenames are long and ugly, so anything unreasonable becomes video.mp4.
export function filenameFor(url) {
  try {
    const base = new URL(url).pathname.split('/').pop() || '';
    if (/\.(mp4|mov|webm|gif)$/i.test(base) && base.length <= 40) return base;
  } catch {
    // fall through to default
  }
  return 'video.mp4';
}

function withinLimit(declaredLength) {
  return !(declaredLength && declaredLength > MAX_UPLOAD_BYTES);
}

// Download a URL into a Buffer if it resolves to a video within the size limit.
// If the URL serves an HTML embed page instead (vxinstagram-style), follow its
// og:video once. Returns { buffer, name } or null (not a video, too big, failed).
export async function downloadVideo(url, depth = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': SCRAPER_UA },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const type = (res.headers.get('content-type') || '').toLowerCase();

    if (type.startsWith('video/')) {
      if (!withinLimit(Number(res.headers.get('content-length')))) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength > MAX_UPLOAD_BYTES) return null;
      return { buffer, name: filenameFor(res.url || url) };
    }

    // An embed page rather than the file — pull its og:video and fetch that once.
    if (depth === 0 && type.includes('text/html')) {
      const videoUrl = parseVideoUrl(await res.text());
      if (videoUrl) return downloadVideo(videoUrl, depth + 1);
    }

    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Try each candidate proxy URL in turn; return the first that yields a video.
export async function fetchInstagramVideo(candidateUrls) {
  for (const url of candidateUrls) {
    try {
      const file = await downloadVideo(url);
      if (file) return file;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

// Video download for the Instagram fallback. Pulls a direct video URL into a
// Buffer the bot can upload as a native Discord attachment, but only if it's
// within the upload ceiling. filenameFor is pure and tested; downloadVideo is
// the network wrapper.

import { MAX_UPLOAD_BYTES, SCRAPER_UA } from './config.js';

const DOWNLOAD_TIMEOUT_MS = 20000;

// Derive a sensible attachment filename from the (possibly redirected) URL.
export function filenameFor(url) {
  try {
    const base = new URL(url).pathname.split('/').pop() || '';
    if (/\.(mp4|mov|webm|gif)$/i.test(base)) return base;
  } catch {
    // fall through to default
  }
  return 'video.mp4';
}

// Download a video into a Buffer, but only if it's within the upload ceiling.
// Returns { buffer, name } or null (too big, timed out, or the fetch failed).
export async function downloadVideo(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': SCRAPER_UA },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const declared = Number(res.headers.get('content-length'));
    if (declared && declared > MAX_UPLOAD_BYTES) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_BYTES) return null;

    return { buffer, name: filenameFor(res.url || url) };
  } finally {
    clearTimeout(timer);
  }
}

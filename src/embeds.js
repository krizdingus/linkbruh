// Proxy selection. Given a source link, probe candidate proxies and return both
// the proxy URL to post and the direct video URL extracted from it — so a
// silently-degraded proxy is skipped, and the Instagram fallback has a file to
// download. parseVideoUrl / hasVideoEmbed are pure and tested; probing is the
// only network part.

import { SCRAPER_UA } from './config.js';
import { proxiesFor, buildProxyUrl } from './links.js';

const PROBE_TIMEOUT_MS = 8000;

// Meta tags that carry a direct video URL, best first.
const VIDEO_META_PROPS = ['og:video:secure_url', 'og:video', 'twitter:player:stream'];

function decodeEntities(value) {
  return value
    .replace(/&#x2F;/gi, '/')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

// Pull the first video URL out of a proxy embed page's HTML. The property and
// content attributes can appear in either order. Returns null when there's no
// video (a photo-only post, or a login-walled / degraded proxy response).
export function parseVideoUrl(html) {
  if (!html) return null;
  for (const prop of VIDEO_META_PROPS) {
    const propThenContent = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const contentThenProp = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      'i',
    );
    const match = html.match(propThenContent) || html.match(contentThenProp);
    if (match) return decodeEntities(match[1]);
  }
  return null;
}

// Does this proxy page carry a usable video embed?
export function hasVideoEmbed(html) {
  return parseVideoUrl(html) !== null;
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': SCRAPER_UA },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return parseVideoUrl(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

// Resolve a source link to { proxyUrl, videoUrl }: the first candidate that
// currently serves a video embed, plus the direct video URL extracted from it.
// If none verify, proxyUrl is the primary candidate (best-effort) and videoUrl
// is null.
export async function resolveEmbed({ host, pathAndQuery }) {
  const candidates = proxiesFor(host).map((proxy) => buildProxyUrl(proxy, pathAndQuery));

  for (const url of candidates) {
    try {
      const videoUrl = await probe(url);
      if (videoUrl) return { proxyUrl: url, videoUrl };
    } catch {
      // unreachable / timed out — try the next candidate
    }
  }

  return { proxyUrl: candidates[0] ?? null, videoUrl: null };
}

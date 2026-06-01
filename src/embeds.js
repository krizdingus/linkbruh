// Proxy selection. Given a source link, pick the proxy URL that actually serves
// a working video embed right now — so a silently-degraded domain (the failure
// that this whole thing was built to dodge) can't break the fix. The HTML probe
// is the only network part; hasVideoEmbed is pure and tested.

import { SCRAPER_UA } from './config.js';
import { proxiesFor, buildProxyUrl } from './links.js';

const PROBE_TIMEOUT_MS = 8000;

// Does this proxy page carry a usable video embed? Discord renders inline video
// from og:video / og:video:secure_url or a twitter:player:stream tag; a degraded
// proxy serves a bare card with none of these.
export function hasVideoEmbed(html) {
  if (!html) return false;
  return /(?:property|name)=["'](?:og:video(?::secure_url)?|twitter:player:stream)["']/i.test(
    html,
  );
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': SCRAPER_UA },
      signal: controller.signal,
    });
    if (!res.ok) return false;
    return hasVideoEmbed(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

// Resolve a source link to the proxy URL to post: the first candidate that
// currently serves a video embed. If none verify (a photo-only post, or every
// proxy is down), fall back to the first candidate as a best-effort so the link
// still gets fixed.
export async function resolveEmbedUrl({ host, pathAndQuery }) {
  const candidates = proxiesFor(host).map((proxy) => buildProxyUrl(proxy, pathAndQuery));

  for (const url of candidates) {
    try {
      if (await probe(url)) return url;
    } catch {
      // unreachable / timed out — try the next candidate
    }
  }

  return candidates[0] ?? null;
}

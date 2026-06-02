// Pure link detection. No Discord objects, no network — that's what makes it
// testable. findLinks(text) returns the source links worth fixing; the proxy
// selection (which needs network) lives in embeds.js.

import { DOMAIN_MAP, POST_PATH_SEGMENTS } from './config.js';

// Regions whose contents must be ignored, in the order we strip them. Each match
// is blanked (replaced with same-length spaces) so positions stay stable and the
// links inside simply stop existing for the scanner.
//   - fenced code blocks ```...```
//   - inline code `...`
//   - spoilers ||...||
//   - angle-bracket-wrapped <...> (Discord treats these as embed-suppressed)
const IGNORED_REGIONS = [
  /```[\s\S]*?```/g,
  /`[^`]*`/g,
  /\|\|[\s\S]*?\|\|/g,
  /<[^>\s]+>/g,
];

function blank(match) {
  return ' '.repeat(match.length);
}

function maskIgnoredRegions(text) {
  let out = text;
  for (const region of IGNORED_REGIONS) {
    out = out.replace(region, blank);
  }
  return out;
}

// Matches x.com / twitter.com / instagram.com links: optional scheme, optional
// www./m./mobile. subdomain, the host, and an optional path+query. Stops at
// whitespace and the delimiters that bound the regions we strip above.
//
// The leading (?<![\w.-]) is a label boundary. Without it the host would match
// inside another domain — "fxtwitter.com" contains "twitter.com", and
// "kkinstagram.com" contains "instagram.com" — and we'd re-fix proxy links.
const LINK_RE =
  /(?<![\w.-])(?:https?:\/\/)?(?:www\.|m\.|mobile\.)?(x\.com|twitter\.com|instagram\.com)(\/[^\s<>|`)]*)?/gi;

// True if any path segment marks an actual post (status / p / reel / tv ...).
function hasPostSegment(path) {
  return path
    .split('/')
    .filter(Boolean)
    .some((seg) => POST_PATH_SEGMENTS.has(seg.toLowerCase()));
}

// Trailing sentence punctuation (a link at the end of a sentence) is not part of
// the URL.
function trimTrailingPunctuation(path) {
  return path.replace(/[.,!?;:]+$/, '');
}

// Find every fixable source link with its exact matched text. Returns
// [{ host, pathAndQuery, raw, index }] in order, deduped by host+path. `raw` is
// the matched URL with trailing sentence punctuation removed (so it can be
// stripped out of a reposted caption verbatim); `index` is its offset in `text`.
export function findLinkMatches(text) {
  if (!text) return [];

  const masked = maskIgnoredRegions(text);
  const matches = [];
  const seen = new Set();

  for (const match of masked.matchAll(LINK_RE)) {
    const host = match[1].toLowerCase();
    const rawPath = match[2] || '';
    const pathAndQuery = trimTrailingPunctuation(rawPath);

    if (!hasPostSegment(pathAndQuery)) continue;

    const key = host + pathAndQuery;
    if (seen.has(key)) continue;
    seen.add(key);

    // Trim the same trailing punctuation off the full match that we trimmed off
    // the path, then slice raw from the original text by offset+length so it is
    // provably the exact substring of `text` regardless of what masking did.
    const trimmed = rawPath.length - pathAndQuery.length;
    const rawLen = match[0].length - trimmed;
    const raw = text.slice(match.index, match.index + rawLen);

    matches.push({ host, pathAndQuery, raw, index: match.index });
  }

  return matches;
}

// Source links worth fixing, as { host, pathAndQuery }. Thin view over
// findLinkMatches for callers that don't need the raw text.
export function findLinks(text) {
  return findLinkMatches(text).map(({ host, pathAndQuery }) => ({ host, pathAndQuery }));
}

// The candidate proxy hosts for a source host, in priority order.
export function proxiesFor(host) {
  return DOMAIN_MAP[host] || [];
}

// Build a proxy URL: swap in the proxy host, keep the path and query.
export function buildProxyUrl(proxyHost, pathAndQuery) {
  return `https://${proxyHost}${pathAndQuery}`;
}

// Instagram uses /reels/ (plural) in shared links, but the InstaFix-class
// proxies expect /reel/ (singular) — the plural form 405s. Normalize it.
export function normalizeInstagramPath(pathAndQuery) {
  return pathAndQuery.replace(/^\/reels\//i, '/reel/');
}

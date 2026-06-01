// Pure link logic. No Discord objects in here — that's what makes it testable.
// Entry point is findFixes(text), which returns the list of fixed URLs to post.

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

// Build the proxied URL: swap the host, keep the path and query. Trailing
// sentence punctuation (a link at the end of a sentence) is trimmed off.
function rewrite(host, pathAndQuery) {
  const proxy = DOMAIN_MAP[host.toLowerCase()];
  const path = pathAndQuery.replace(/[.,!?;:]+$/, '');
  return `https://${proxy}${path}`;
}

// Find every fixable link in a message and return the rewritten URLs, in order,
// deduped. Returns [] when there's nothing to fix.
export function findFixes(text) {
  if (!text) return [];

  const masked = maskIgnoredRegions(text);
  const fixes = [];
  const seen = new Set();

  for (const match of masked.matchAll(LINK_RE)) {
    const host = match[1];
    const pathAndQuery = match[2] || '';

    if (!hasPostSegment(pathAndQuery)) continue;

    const fixed = rewrite(host, pathAndQuery);
    if (seen.has(fixed)) continue;
    seen.add(fixed);
    fixes.push(fixed);
  }

  return fixes;
}

// ---------------------------------------------------------------------------
// EDIT SURFACE. All domain mappings live here.
//
// Each service lists candidate proxy domains in priority order. Before posting,
// the bot checks them in turn and uses the first one that actually serves a
// working video embed right now, so a degraded domain can't silently break the
// fix. Instagram domains rotate / die often — when one stops working, move the
// next live InstaFix-class domain to the front (or add it).
// ---------------------------------------------------------------------------

// X / Twitter. vxtwitter has been the reliable one; fxtwitter/fixupx share the
// FxEmbed backend and rotate in when X's guest API is healthy.
export const X_PROXIES = ['vxtwitter.com', 'fxtwitter.com', 'fixupx.com'];

// Instagram (InstaFix-class). Front entry is the current live one. kkinstagram
// redirects straight to the video file; vxinstagram serves an og:video page —
// the downloader handles both. (ddinstagram is currently dead.)
export const INSTAGRAM_PROXIES = ['kkinstagram.com', 'vxinstagram.com'];

// Source host -> candidate proxy hosts. The scanner only matches these source
// hosts, so a link already on a proxy domain is never re-fixed.
export const DOMAIN_MAP = {
  'x.com': X_PROXIES,
  'twitter.com': X_PROXIES,
  'instagram.com': INSTAGRAM_PROXIES,
};

// A URL is only worth fixing if its path points at an actual post (not a profile
// or the site root). These are the first-or-any path segments that mark a post.
export const POST_PATH_SEGMENTS = new Set(['status', 'p', 'reel', 'reels', 'tv']);

// User-Agent that makes the proxies serve embed metadata instead of redirecting
// to the real site — the same trick Discord's own scraper uses. The bot sends
// this when probing a proxy to confirm it has a video embed.
export const SCRAPER_UA =
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)';

// Instagram fallback only: when a proxy has the video but Discord can't be
// trusted to embed it, the bot downloads the file and re-uploads it. This caps
// how big a file it will pull. 25 MB is the safe ceiling for a non-boosted
// server; bigger than this falls back to posting the link.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Webhook display name used when reposting a fix as the original poster. The
// per-message username/avatar override this; this is only the webhook's own name.
export const WEBHOOK_NAME = 'linkbruh';

// Discord caps a single message at 10 attachments — the ceiling for a carousel.
export const MAX_ATTACHMENTS = 10;

// When an Instagram post can't be fixed (private / age-restricted / removed /
// too big), the bot leaves the original alone and posts this note, which then
// deletes itself after NOTE_DELETE_MS. NEUTRAL PLACEHOLDER — rewrite in your
// own voice; this is a user-facing string and is intentionally not styled here.
export const FALLBACK_NOTE = "couldn't fix this one.";
export const NOTE_DELETE_MS = 12000;

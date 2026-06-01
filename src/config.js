// ---------------------------------------------------------------------------
// EDIT SURFACE. All domain mappings live here. Change a proxy, change it here.
//
// Instagram proxy domains rotate / die often. When embeds stop working, swap
// INSTAGRAM_PROXY for the next live InstaFix-class domain. That's the whole fix.
// ---------------------------------------------------------------------------

// X / Twitter proxy. fxtwitter.com is usually the default, but its embed
// endpoint serves degraded cards (no og:video) when X's guest API tightens up;
// vxtwitter.com is a separate backend that tends to keep working when it does.
// fixupx.com shares fxtwitter's backend, so it is NOT an independent fallback.
// Fallback (manual swap): fxtwitter.com
export const X_PROXY = 'vxtwitter.com';

// Instagram proxy. Fallback (manual swap): ddinstagram.com
export const INSTAGRAM_PROXY = 'kkinstagram.com';

// Source host -> proxy host. The scanner only looks at these source hosts, so a
// link already on a proxy domain is never matched and never re-fixed.
export const DOMAIN_MAP = {
  'x.com': X_PROXY,
  'twitter.com': X_PROXY,
  'instagram.com': INSTAGRAM_PROXY,
};

// A URL is only worth fixing if its path points at an actual post (not a profile
// or the site root). These are the first-or-any path segments that mark a post.
export const POST_PATH_SEGMENTS = new Set(['status', 'p', 'reel', 'reels', 'tv']);

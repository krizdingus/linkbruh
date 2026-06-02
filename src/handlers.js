// Discord-side glue between events and the logic. Kept thin: decide whether to
// act, resolve each link, post, suppress the original.

import { findLinks, proxiesFor, buildProxyUrl, normalizeInstagramPath } from './links.js';
import { resolveEmbed } from './embeds.js';
import { fetchInstagramVideo } from './media.js';
import { postReply } from './post.js';

// The react-to-delete emoji. Unicode cross mark (U+274C).
const DELETE_EMOJI = '❌';

// Work out what to post for a single source link, tracking proxyUrl either way
// so we can fall back to a plain link if an upload fails.
//
// Instagram embeds are unreliable even when a proxy has the video, because
// Discord's scraper gets login-walled — so for Instagram the bot downloads the
// video and uploads it directly. X embeds work fine as links, so they stay
// links via the self-healing proxy probe.
async function resolveFix(link) {
  if (link.host === 'instagram.com') {
    const path = normalizeInstagramPath(link.pathAndQuery);
    const candidates = proxiesFor(link.host).map((proxy) => buildProxyUrl(proxy, path));
    const file = await fetchInstagramVideo(candidates);
    // No video means no proxy could fetch it (private / age-restricted / removed)
    // — nothing can fix that logged-out, so stay quiet instead of posting a dead
    // link.
    if (!file) return { proxyUrl: null, file: null };
    return { proxyUrl: candidates[0] ?? null, file };
  }

  const { proxyUrl } = await resolveEmbed(link);
  return { proxyUrl, file: null };
}

// New message: if it carries fixable links, reply with the fixes and suppress
// the original's broken embed. Ignores DMs, bots, and itself.
export async function onMessage(message) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const links = findLinks(message.content);
  if (links.length === 0) return;

  const fixes = [];
  for (const link of links) {
    fixes.push(await resolveFix(link));
  }

  const files = fixes.filter((f) => f.file).map((f) => f.file);
  const content = fixes
    .filter((f) => !f.file && f.proxyUrl)
    .map((f) => f.proxyUrl)
    .join('\n');

  if (files.length === 0 && !content) return;

  try {
    await postReply(message, { content: content || undefined, files });
  } catch (err) {
    // Upload rejected (size) or some other send failure — fall back to links.
    console.error('post failed, retrying as links:', err.message);
    const allLinks = fixes.map((f) => f.proxyUrl).filter(Boolean).join('\n');
    if (!allLinks) return;
    try {
      await postReply(message, { content: allLinks });
    } catch (err2) {
      console.error('could not post fix:', err2.message);
      return;
    }
  }

  // Best effort — needs Manage Messages. If it fails the fix still stands.
  try {
    await message.suppressEmbeds(true);
  } catch (err) {
    console.error('could not suppress original embed:', err.message);
  }
}

// React with ❌ to delete the bot's fix. Only the original author can do it.
// The original author is read from the reply reference, so there's no state to
// keep across restarts.
export async function onReaction(reaction, user) {
  if (user.bot) return;
  if (reaction.emoji.name !== DELETE_EMOJI) return;

  try {
    if (reaction.partial) await reaction.fetch();
    const msg = reaction.message.partial
      ? await reaction.message.fetch()
      : reaction.message;

    // Only act on the bot's own fix messages.
    if (msg.author.id !== msg.client.user.id) return;

    const originalId = msg.reference?.messageId;
    if (!originalId) return;

    const original = await msg.channel.messages.fetch(originalId);
    if (original.author.id !== user.id) return;

    await msg.delete();
  } catch (err) {
    console.error('could not handle delete react:', err.message);
  }
}

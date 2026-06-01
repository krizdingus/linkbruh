// Discord-side glue between events and the logic. Kept thin: decide whether to
// act, resolve each link to a working proxy, post, suppress the original.

import { findLinks } from './links.js';
import { resolveEmbedUrl } from './embeds.js';
import { postFix } from './post.js';

// The react-to-delete emoji. Unicode cross mark (U+274C).
const DELETE_EMOJI = '❌';

// New message: if it carries fixable links, reply with working proxy links and
// suppress the original's broken embed. Ignores DMs, bots, and itself.
export async function onMessage(message) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const links = findLinks(message.content);
  if (links.length === 0) return;

  const urls = [];
  for (const link of links) {
    const url = await resolveEmbedUrl(link);
    if (url) urls.push(url);
  }
  if (urls.length === 0) return;

  try {
    await postFix(message, urls);
  } catch (err) {
    console.error('could not post fix:', err.message);
    return;
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

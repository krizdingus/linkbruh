// Discord-side glue between events and the logic. The happy path: every fixable
// link in a message resolves to media, the bot has the perms, so it reposts one
// combined message AS the original poster and deletes the original. Anything
// short of that degrades to reply mode (and a self-deleting note for Instagram
// posts that can't be fixed at all), so the bot never deletes a message it
// couldn't fully replace.

import { PermissionFlagsBits } from 'discord.js';
import { findLinkMatches, proxiesFor, buildProxyUrl, normalizeInstagramPath } from './links.js';
import { resolveEmbed } from './embeds.js';
import { fetchInstagramMedia } from './media.js';
import { postReply } from './post.js';
import { postAsUser } from './webhooks.js';
import { stripFixed } from './format.js';
import { FALLBACK_NOTE, NOTE_DELETE_MS, MAX_ATTACHMENTS } from './config.js';

const DELETE_EMOJI = '❌'; // ❌

// Maps a posted fix message id -> the original author id, so ❌-to-delete still
// works after the original (and its reply reference) is gone. In-memory only;
// a restart forgets it and ❌ on an older fix becomes a no-op.
const fixAuthors = new Map();

// Resolve one link to what should be posted for it.
//   X video      -> { kind: 'x', link, proxyUrl }
//   X non-video  -> null              (embeds fine natively; ignore it)
//   Instagram ok -> { kind: 'ig', link, files }
//   Instagram no -> { kind: 'ig-fail', link }   (private / age / removed / big)
async function resolveFix(link) {
  if (link.host === 'instagram.com') {
    const path = normalizeInstagramPath(link.pathAndQuery);
    const candidates = proxiesFor(link.host).map((proxy) => buildProxyUrl(proxy, path));
    const media = await fetchInstagramMedia(candidates);
    if (!media) return { kind: 'ig-fail', link };
    return { kind: 'ig', link, files: media.files };
  }

  const { proxyUrl, videoUrl } = await resolveEmbed(link);
  if (!videoUrl) return null; // text/photo tweet — leave it alone
  return { kind: 'x', link, proxyUrl };
}

// Drop a note that the post couldn't be fixed, then delete it after a beat so it
// doesn't linger. Best-effort throughout.
async function postSelfDeletingNote(message) {
  try {
    const note = await message.reply({
      content: FALLBACK_NOTE,
      allowedMentions: { repliedUser: false },
    });
    setTimeout(() => {
      note.delete().catch(() => {});
    }, NOTE_DELETE_MS);
  } catch (err) {
    console.error('could not post fallback note:', err.message);
  }
}

// Reply-mode fallback: post the successful fixes as a reply and suppress the
// original's broken embed. Used when the bot can't impersonate, or when some
// link in the message failed and the original must be preserved.
async function replyWithFixes(message, successes) {
  const files = successes.filter((s) => s.kind === 'ig').flatMap((s) => s.files).slice(0, MAX_ATTACHMENTS);
  const content = successes
    .filter((s) => s.kind === 'x')
    .map((s) => s.proxyUrl)
    .join('\n');
  if (files.length === 0 && !content) return;

  try {
    await postReply(message, { content: content || undefined, files });
  } catch (err) {
    console.error('reply fix failed:', err.message);
    return;
  }
  try {
    await message.suppressEmbeds(true);
  } catch (err) {
    console.error('could not suppress original embed:', err.message);
  }
}

export async function onMessage(message) {
  if (!message.guild) return;
  if (message.author.bot) return;
  if (message.webhookId) return; // never reprocess our own reposts

  const links = findLinkMatches(message.content);
  if (links.length === 0) return;

  const fixes = [];
  for (const link of links) {
    fixes.push(await resolveFix(link));
  }

  const successes = fixes.filter((f) => f && (f.kind === 'x' || f.kind === 'ig'));
  const igFails = fixes.filter((f) => f && f.kind === 'ig-fail');

  // Nothing fixable resolved (e.g. only non-video tweets): note any IG failures
  // and otherwise stay quiet.
  if (successes.length === 0) {
    for (const fail of igFails) await postSelfDeletingNote(message);
    return;
  }

  const me = message.guild.members.me;
  const perms = me ? message.channel.permissionsFor(me) : null;
  const canImpersonate =
    !!perms &&
    perms.has(PermissionFlagsBits.ManageWebhooks) &&
    perms.has(PermissionFlagsBits.ManageMessages);

  // Only delete-and-impersonate when EVERY fixable link resolved and we have the
  // perms — otherwise a failed link would be destroyed with the original.
  if (igFails.length === 0 && canImpersonate) {
    const files = successes
      .filter((s) => s.kind === 'ig')
      .flatMap((s) => s.files)
      .slice(0, MAX_ATTACHMENTS);
    const replaced = successes.map((s) => s.link.raw);
    const xLinks = successes.filter((s) => s.kind === 'x').map((s) => s.proxyUrl).join('\n');
    const caption = stripFixed(message.content, replaced);
    const content = [caption, xLinks].filter(Boolean).join('\n') || undefined;

    try {
      const posted = await postAsUser(message, { content, files });
      // Repost succeeded — safe to delete the original now.
      await message.delete();
      if (posted?.id) fixAuthors.set(posted.id, message.author.id);
      return;
    } catch (err) {
      console.error('impersonation failed, falling back to reply:', err.message);
      // fall through to reply mode; original is untouched
    }
  }

  // Degraded path: reply with the fixes (don't delete), note any IG failures.
  await replyWithFixes(message, successes);
  for (const fail of igFails) await postSelfDeletingNote(message);
}

// React with ❌ to delete the bot's fix. Only the original author can. Checks the
// in-memory map first (impersonation reposts), then falls back to the reply
// reference (reply-mode fixes still carry one).
export async function onReaction(reaction, user) {
  if (user.bot) return;
  if (reaction.emoji.name !== DELETE_EMOJI) return;

  try {
    if (reaction.partial) await reaction.fetch();
    const msg = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

    // Impersonation repost: authorized via the map.
    if (fixAuthors.has(msg.id)) {
      if (fixAuthors.get(msg.id) !== user.id) return;
      await msg.delete();
      fixAuthors.delete(msg.id);
      return;
    }

    // Reply-mode fix: authorized via the reply reference.
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

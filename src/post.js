// The single place that decides HOW a fix appears. v0.1 is reply mode. Webhook
// mode (re-post as the original user) would be a localized change right here.

import { AttachmentBuilder } from 'discord.js';

// Reply to the original message with the fix: proxy links as content, downloaded
// videos as native attachments, or both. No user ping — the reply reference is
// enough, and the bot is supposed to be quiet. `files` is [{ buffer, name }].
export function postReply(message, { content, files = [] } = {}) {
  const payload = { allowedMentions: { repliedUser: false } };
  if (content) payload.content = content;
  if (files.length) {
    payload.files = files.map((f) => new AttachmentBuilder(f.buffer, { name: f.name }));
  }
  return message.reply(payload);
}

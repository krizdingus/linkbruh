// Webhook mode: repost a fix as the original poster (their name + avatar) so it
// looks like they posted the working media all along. The webhook is created
// once per channel and cached. Thread messages post through the parent
// channel's webhook with a threadId.

import { AttachmentBuilder } from 'discord.js';
import { WEBHOOK_NAME } from './config.js';
import { sanitizeWebhookName } from './format.js';

// parentChannelId -> Webhook. Cleared on restart, rebuilt lazily.
const cache = new Map();

// A thread posts through its parent channel's webhook (with a threadId); a
// normal channel is its own parent.
function targetFor(channel) {
  if (typeof channel.isThread === 'function' && channel.isThread()) {
    return { parent: channel.parent, threadId: channel.id };
  }
  return { parent: channel, threadId: undefined };
}

async function getWebhook(channel, forceNew = false) {
  const { parent, threadId } = targetFor(channel);
  if (!parent) throw new Error('no parent channel for webhook');

  if (forceNew) cache.delete(parent.id);

  const cached = cache.get(parent.id);
  if (cached) return { webhook: cached, threadId };

  const hooks = await parent.fetchWebhooks();
  let hook = hooks.find((h) => h.owner?.id === parent.client.user.id && h.token);
  if (!hook) hook = await parent.createWebhook({ name: WEBHOOK_NAME });

  cache.set(parent.id, hook);
  return { webhook: hook, threadId };
}

// Repost as the message's author. `files` is [{ buffer, name }]. Returns the
// sent webhook Message. Throws if the bot lacks Manage Webhooks — callers fall
// back to reply mode.
export async function postAsUser(message, { content, files = [] } = {}) {
  const username = sanitizeWebhookName(message.member?.displayName ?? message.author.username);
  const avatarURL = (message.member ?? message.author).displayAvatarURL({ extension: 'png' });

  const payload = { username, avatarURL, allowedMentions: { parse: [] } };
  if (content) payload.content = content;
  if (files.length) {
    payload.files = files.map((f) => new AttachmentBuilder(f.buffer, { name: f.name }));
  }

  const send = async (forceNew) => {
    const { webhook, threadId } = await getWebhook(message.channel, forceNew);
    return webhook.send(threadId ? { ...payload, threadId } : payload);
  };

  try {
    return await send(false);
  } catch (err) {
    // Cached webhook was deleted server-side — drop it, recreate, retry once.
    if (err?.code === 10015) return send(true);
    throw err;
  }
}

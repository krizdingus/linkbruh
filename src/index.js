// Entry point. Build the client, wire the two handlers, log in.

import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import { onMessage, onReaction } from './handlers.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('missing DISCORD_TOKEN. set it in .env or the host environment.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged — enable in the Developer Portal
    GatewayIntentBits.GuildMessageReactions,
  ],
  // Partials let reactions fire on messages that aren't in the cache.
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, (c) => {
  console.log(`logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, onMessage);
client.on(Events.MessageReactionAdd, onReaction);

client.login(token);

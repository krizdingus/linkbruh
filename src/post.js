// The single place that decides HOW a fix appears. v0.1 is reply mode. Webhook
// mode (re-post as the original user) would be a localized change right here.

// Post the fixed link(s) as a reply to the original message. No user ping —
// the reply reference is enough, and the bot is supposed to be quiet.
export function postFix(message, fixes) {
  return message.reply({
    content: fixes.join('\n'),
    allowedMentions: { repliedUser: false },
  });
}

// Pure text helpers with no discord.js dependency, so they stay unit-testable.

// Discord rejects webhook usernames containing "discord" or "clyde", caps them
// at 80 chars, and won't accept an empty one. Neutralize the forbidden words,
// clamp the length, and fall back to a neutral name.
export function sanitizeWebhookName(name) {
  let out = (name || '')
    .replace(/discord/gi, 'disc0rd')
    .replace(/clyde/gi, 'clyd3')
    .trim();
  if (out.length > 80) out = out.slice(0, 80);
  return out || 'someone';
}

// Remove each replaced link verbatim from a reposted caption, then collapse the
// whitespace the removal leaves behind. split/join avoids regex-escaping the URL.
export function stripFixed(content, rawStrings) {
  let out = content || '';
  for (const raw of rawStrings) {
    out = out.split(raw).join(' ');
  }
  return out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

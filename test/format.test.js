import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeWebhookName, stripFixed } from '../src/format.js';

test('sanitizeWebhookName passes a normal name through', () => {
  assert.equal(sanitizeWebhookName('coolguy'), 'coolguy');
});

test('sanitizeWebhookName neutralizes forbidden substrings (case-insensitive)', () => {
  assert.equal(sanitizeWebhookName('discord mod'), 'disc0rd mod');
  assert.equal(sanitizeWebhookName('Clyde'), 'clyd3');
  assert.equal(sanitizeWebhookName('CLYDE'), 'clyd3');
});

test('sanitizeWebhookName clamps to 80 characters', () => {
  const long = 'a'.repeat(200);
  assert.equal(sanitizeWebhookName(long).length, 80);
});

test('sanitizeWebhookName falls back when empty', () => {
  assert.equal(sanitizeWebhookName(''), 'someone');
  assert.equal(sanitizeWebhookName('   '), 'someone');
  assert.equal(sanitizeWebhookName(null), 'someone');
});

test('stripFixed removes a single replaced link and trims', () => {
  assert.equal(
    stripFixed('check this https://instagram.com/reel/X out', ['https://instagram.com/reel/X']),
    'check this out',
  );
});

test('stripFixed removes multiple links', () => {
  assert.equal(
    stripFixed('a https://x.com/u/status/1 b https://x.com/u/status/2 c', [
      'https://x.com/u/status/1',
      'https://x.com/u/status/2',
    ]),
    'a b c',
  );
});

test('stripFixed leaves an un-replaced link in place', () => {
  assert.equal(
    stripFixed('keep https://x.com/u/status/keep drop https://x.com/u/status/drop', [
      'https://x.com/u/status/drop',
    ]),
    'keep https://x.com/u/status/keep drop',
  );
});

test('stripFixed returns empty string when nothing remains', () => {
  assert.equal(stripFixed('https://instagram.com/reel/X', ['https://instagram.com/reel/X']), '');
  assert.equal(stripFixed('', []), '');
  assert.equal(stripFixed(null, []), '');
});

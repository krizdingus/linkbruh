import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hasVideoEmbed } from '../src/embeds.js';

test('detects an og:video tag', () => {
  assert.equal(
    hasVideoEmbed('<meta property="og:video" content="https://x/v.mp4"/>'),
    true,
  );
});

test('detects og:video:secure_url', () => {
  assert.equal(
    hasVideoEmbed('<meta property="og:video:secure_url" content="https://x/v.mp4"/>'),
    true,
  );
});

test('detects a twitter:player:stream tag', () => {
  assert.equal(
    hasVideoEmbed('<meta name="twitter:player:stream" content="https://x/v.mp4"/>'),
    true,
  );
});

test('returns false for a bare player card with no video (the degraded case)', () => {
  const degraded =
    '<meta property="twitter:card" content="player"/>' +
    '<meta property="og:title" content="NEXTA"/>';
  assert.equal(hasVideoEmbed(degraded), false);
});

test('returns false for a photo-only post (og:image but no video)', () => {
  assert.equal(
    hasVideoEmbed('<meta property="og:image" content="https://x/photo.jpg"/>'),
    false,
  );
});

test('returns false for empty or missing html', () => {
  assert.equal(hasVideoEmbed(''), false);
  assert.equal(hasVideoEmbed(null), false);
});

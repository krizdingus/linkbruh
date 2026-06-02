import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hasVideoEmbed, parseVideoUrl } from '../src/embeds.js';

test('parseVideoUrl extracts an og:video URL', () => {
  assert.equal(
    parseVideoUrl('<meta property="og:video" content="https://x/v.mp4"/>'),
    'https://x/v.mp4',
  );
});

test('parseVideoUrl prefers og:video:secure_url', () => {
  const html =
    '<meta property="og:video" content="http://x/a.mp4"/>' +
    '<meta property="og:video:secure_url" content="https://x/b.mp4"/>';
  assert.equal(parseVideoUrl(html), 'https://x/b.mp4');
});

test('parseVideoUrl handles content-before-property ordering', () => {
  assert.equal(
    parseVideoUrl('<meta content="https://x/v.mp4" property="og:video">'),
    'https://x/v.mp4',
  );
});

test('parseVideoUrl reads a twitter:player:stream tag', () => {
  assert.equal(
    parseVideoUrl('<meta name="twitter:player:stream" content="https://x/v.mp4"/>'),
    'https://x/v.mp4',
  );
});

test('parseVideoUrl decodes HTML entities in the URL', () => {
  assert.equal(
    parseVideoUrl('<meta property="og:video" content="https://x/v.mp4?a=1&amp;b=2"/>'),
    'https://x/v.mp4?a=1&b=2',
  );
});

test('parseVideoUrl returns null for a bare player card (degraded case)', () => {
  const degraded =
    '<meta property="twitter:card" content="player"/>' +
    '<meta property="og:title" content="NEXTA"/>';
  assert.equal(parseVideoUrl(degraded), null);
});

test('parseVideoUrl returns null for a photo-only post', () => {
  assert.equal(
    parseVideoUrl('<meta property="og:image" content="https://x/photo.jpg"/>'),
    null,
  );
});

test('parseVideoUrl returns null for empty or missing html', () => {
  assert.equal(parseVideoUrl(''), null);
  assert.equal(parseVideoUrl(null), null);
});

test('hasVideoEmbed reflects whether a video URL is present', () => {
  assert.equal(hasVideoEmbed('<meta property="og:video" content="https://x/v.mp4"/>'), true);
  assert.equal(hasVideoEmbed('<meta property="og:image" content="https://x/p.jpg"/>'), false);
});

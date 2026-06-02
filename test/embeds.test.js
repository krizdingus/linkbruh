import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hasVideoEmbed, parseVideoUrl, parseImageUrls } from '../src/embeds.js';

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

test('parseImageUrls extracts a single og:image URL', () => {
  assert.deepEqual(
    parseImageUrls('<meta property="og:image" content="https://x/a.jpg"/>'),
    ['https://x/a.jpg'],
  );
});

test('parseImageUrls collects multiple carousel images in order', () => {
  const html =
    '<meta property="og:image" content="https://x/1.jpg"/>' +
    '<meta property="og:image" content="https://x/2.jpg"/>';
  assert.deepEqual(parseImageUrls(html), ['https://x/1.jpg', 'https://x/2.jpg']);
});

test('parseImageUrls dedupes identical image URLs', () => {
  const html =
    '<meta property="og:image" content="https://x/1.jpg"/>' +
    '<meta property="og:image" content="https://x/1.jpg"/>';
  assert.deepEqual(parseImageUrls(html), ['https://x/1.jpg']);
});

test('parseImageUrls reads a twitter:image tag', () => {
  assert.deepEqual(
    parseImageUrls('<meta name="twitter:image" content="https://x/t.jpg"/>'),
    ['https://x/t.jpg'],
  );
});

test('parseImageUrls decodes HTML entities', () => {
  assert.deepEqual(
    parseImageUrls('<meta property="og:image" content="https://x/a.jpg?a=1&amp;b=2"/>'),
    ['https://x/a.jpg?a=1&b=2'],
  );
});

test('parseImageUrls returns [] when there is no image', () => {
  assert.deepEqual(parseImageUrls('<meta property="og:video" content="https://x/v.mp4"/>'), []);
  assert.deepEqual(parseImageUrls(''), []);
  assert.deepEqual(parseImageUrls(null), []);
});

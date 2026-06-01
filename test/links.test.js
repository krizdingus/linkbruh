import { test } from 'node:test';
import assert from 'node:assert/strict';

import { findFixes } from '../src/links.js';

test('rewrites an x.com status link to the proxy', () => {
  assert.deepEqual(
    findFixes('look https://x.com/user/status/123'),
    ['https://vxtwitter.com/user/status/123'],
  );
});

test('rewrites twitter.com to the same x proxy', () => {
  assert.deepEqual(
    findFixes('https://twitter.com/user/status/123'),
    ['https://vxtwitter.com/user/status/123'],
  );
});

test('rewrites instagram reel/p/tv links', () => {
  assert.deepEqual(findFixes('https://instagram.com/reel/ABC'), [
    'https://kkinstagram.com/reel/ABC',
  ]);
  assert.deepEqual(findFixes('https://instagram.com/p/ABC'), [
    'https://kkinstagram.com/p/ABC',
  ]);
  assert.deepEqual(findFixes('https://instagram.com/tv/ABC'), [
    'https://kkinstagram.com/tv/ABC',
  ]);
});

test('handles www. / m. / mobile. subdomains', () => {
  assert.deepEqual(findFixes('https://www.x.com/u/status/1'), [
    'https://vxtwitter.com/u/status/1',
  ]);
  assert.deepEqual(findFixes('https://m.instagram.com/reel/X'), [
    'https://kkinstagram.com/reel/X',
  ]);
});

test('preserves query strings and trailing params', () => {
  assert.deepEqual(findFixes('https://x.com/u/status/1?s=20&t=abc'), [
    'https://vxtwitter.com/u/status/1?s=20&t=abc',
  ]);
});

test('works without a scheme', () => {
  assert.deepEqual(findFixes('x.com/u/status/1'), [
    'https://vxtwitter.com/u/status/1',
  ]);
});

test('skips profile / root links with no post segment', () => {
  assert.deepEqual(findFixes('https://x.com/someuser'), []);
  assert.deepEqual(findFixes('https://instagram.com/someuser'), []);
  assert.deepEqual(findFixes('https://x.com'), []);
});

test('does not re-fix links already on a proxy domain', () => {
  assert.deepEqual(findFixes('https://vxtwitter.com/u/status/1'), []);
  assert.deepEqual(findFixes('https://kkinstagram.com/reel/X'), []);
});

test('handles multiple links in one message', () => {
  assert.deepEqual(
    findFixes('a https://x.com/u/status/1 b https://instagram.com/reel/Y'),
    ['https://vxtwitter.com/u/status/1', 'https://kkinstagram.com/reel/Y'],
  );
});

test('dedupes identical links', () => {
  assert.deepEqual(
    findFixes('https://x.com/u/status/1 https://x.com/u/status/1'),
    ['https://vxtwitter.com/u/status/1'],
  );
});

test('skips links inside spoiler tags', () => {
  assert.deepEqual(findFixes('||https://x.com/u/status/1||'), []);
});

test('skips links inside inline code and code blocks', () => {
  assert.deepEqual(findFixes('`https://x.com/u/status/1`'), []);
  assert.deepEqual(
    findFixes('```\nhttps://x.com/u/status/1\n```'),
    [],
  );
});

test('skips angle-bracket-wrapped (embed-suppressed) links', () => {
  assert.deepEqual(findFixes('<https://x.com/u/status/1>'), []);
});

test('still fixes a real link alongside an ignored one', () => {
  assert.deepEqual(
    findFixes('||https://x.com/u/status/1|| https://x.com/u/status/2'),
    ['https://vxtwitter.com/u/status/2'],
  );
});

test('trims trailing sentence punctuation off the link', () => {
  assert.deepEqual(findFixes('watch this: https://x.com/u/status/1.'), [
    'https://vxtwitter.com/u/status/1',
  ]);
});

test('still matches a link right after punctuation', () => {
  assert.deepEqual(findFixes('(https://x.com/u/status/1)'), [
    'https://vxtwitter.com/u/status/1',
  ]);
});

test('returns [] for empty or linkless text', () => {
  assert.deepEqual(findFixes(''), []);
  assert.deepEqual(findFixes('just some words'), []);
  assert.deepEqual(findFixes(null), []);
});

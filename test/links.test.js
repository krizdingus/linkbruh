import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  findLinks,
  findLinkMatches,
  proxiesFor,
  buildProxyUrl,
  normalizeInstagramPath,
} from '../src/links.js';

test('detects an x.com status link', () => {
  assert.deepEqual(findLinks('look https://x.com/user/status/123'), [
    { host: 'x.com', pathAndQuery: '/user/status/123' },
  ]);
});

test('detects twitter.com', () => {
  assert.deepEqual(findLinks('https://twitter.com/user/status/123'), [
    { host: 'twitter.com', pathAndQuery: '/user/status/123' },
  ]);
});

test('detects instagram reel/p/tv links', () => {
  assert.deepEqual(findLinks('https://instagram.com/reel/ABC'), [
    { host: 'instagram.com', pathAndQuery: '/reel/ABC' },
  ]);
  assert.deepEqual(findLinks('https://instagram.com/p/ABC'), [
    { host: 'instagram.com', pathAndQuery: '/p/ABC' },
  ]);
  assert.deepEqual(findLinks('https://instagram.com/tv/ABC'), [
    { host: 'instagram.com', pathAndQuery: '/tv/ABC' },
  ]);
});

test('handles www. / m. / mobile. subdomains', () => {
  assert.deepEqual(findLinks('https://www.x.com/u/status/1'), [
    { host: 'x.com', pathAndQuery: '/u/status/1' },
  ]);
  assert.deepEqual(findLinks('https://m.instagram.com/reel/X'), [
    { host: 'instagram.com', pathAndQuery: '/reel/X' },
  ]);
});

test('preserves query strings and trailing params', () => {
  assert.deepEqual(findLinks('https://x.com/u/status/1?s=20&t=abc'), [
    { host: 'x.com', pathAndQuery: '/u/status/1?s=20&t=abc' },
  ]);
});

test('works without a scheme', () => {
  assert.deepEqual(findLinks('x.com/u/status/1'), [
    { host: 'x.com', pathAndQuery: '/u/status/1' },
  ]);
});

test('skips profile / root links with no post segment', () => {
  assert.deepEqual(findLinks('https://x.com/someuser'), []);
  assert.deepEqual(findLinks('https://instagram.com/someuser'), []);
  assert.deepEqual(findLinks('https://x.com'), []);
});

test('does not detect links already on a proxy domain', () => {
  assert.deepEqual(findLinks('https://vxtwitter.com/u/status/1'), []);
  assert.deepEqual(findLinks('https://fxtwitter.com/u/status/1'), []);
  assert.deepEqual(findLinks('https://kkinstagram.com/reel/X'), []);
});

test('handles multiple links in one message', () => {
  assert.deepEqual(
    findLinks('a https://x.com/u/status/1 b https://instagram.com/reel/Y'),
    [
      { host: 'x.com', pathAndQuery: '/u/status/1' },
      { host: 'instagram.com', pathAndQuery: '/reel/Y' },
    ],
  );
});

test('dedupes identical links', () => {
  assert.deepEqual(findLinks('https://x.com/u/status/1 https://x.com/u/status/1'), [
    { host: 'x.com', pathAndQuery: '/u/status/1' },
  ]);
});

test('skips links inside spoiler tags', () => {
  assert.deepEqual(findLinks('||https://x.com/u/status/1||'), []);
});

test('skips links inside inline code and code blocks', () => {
  assert.deepEqual(findLinks('`https://x.com/u/status/1`'), []);
  assert.deepEqual(findLinks('```\nhttps://x.com/u/status/1\n```'), []);
});

test('skips angle-bracket-wrapped (embed-suppressed) links', () => {
  assert.deepEqual(findLinks('<https://x.com/u/status/1>'), []);
});

test('still detects a real link alongside an ignored one', () => {
  assert.deepEqual(
    findLinks('||https://x.com/u/status/1|| https://x.com/u/status/2'),
    [{ host: 'x.com', pathAndQuery: '/u/status/2' }],
  );
});

test('trims trailing sentence punctuation off the path', () => {
  assert.deepEqual(findLinks('watch this: https://x.com/u/status/1.'), [
    { host: 'x.com', pathAndQuery: '/u/status/1' },
  ]);
});

test('still detects a link right after punctuation', () => {
  assert.deepEqual(findLinks('(https://x.com/u/status/1)'), [
    { host: 'x.com', pathAndQuery: '/u/status/1' },
  ]);
});

test('returns [] for empty or linkless text', () => {
  assert.deepEqual(findLinks(''), []);
  assert.deepEqual(findLinks('just some words'), []);
  assert.deepEqual(findLinks(null), []);
});

test('proxiesFor returns the candidate list for a source host', () => {
  assert.equal(proxiesFor('x.com')[0], 'vxtwitter.com');
  assert.equal(proxiesFor('twitter.com')[0], 'vxtwitter.com');
  assert.equal(proxiesFor('instagram.com')[0], 'kkinstagram.com');
  assert.deepEqual(proxiesFor('unknown.com'), []);
});

test('buildProxyUrl swaps the host and keeps the path', () => {
  assert.equal(
    buildProxyUrl('vxtwitter.com', '/u/status/1?s=20'),
    'https://vxtwitter.com/u/status/1?s=20',
  );
});

test('normalizeInstagramPath rewrites /reels/ to /reel/', () => {
  assert.equal(normalizeInstagramPath('/reels/ABC/'), '/reel/ABC/');
  assert.equal(normalizeInstagramPath('/reels/ABC/?x=1'), '/reel/ABC/?x=1');
});

test('normalizeInstagramPath leaves /reel/, /p/, /tv/ alone', () => {
  assert.equal(normalizeInstagramPath('/reel/ABC/'), '/reel/ABC/');
  assert.equal(normalizeInstagramPath('/p/ABC/'), '/p/ABC/');
  assert.equal(normalizeInstagramPath('/tv/ABC/'), '/tv/ABC/');
});

test('findLinkMatches returns raw matched text and index', () => {
  const text = 'look https://x.com/u/status/123 ok';
  assert.deepEqual(findLinkMatches(text), [
    { host: 'x.com', pathAndQuery: '/u/status/123', raw: 'https://x.com/u/status/123', index: 5 },
  ]);
});

test('findLinkMatches raw excludes trailing sentence punctuation', () => {
  assert.deepEqual(findLinkMatches('watch https://x.com/u/status/1.'), [
    { host: 'x.com', pathAndQuery: '/u/status/1', raw: 'https://x.com/u/status/1', index: 6 },
  ]);
});

test('findLinkMatches keeps the www. subdomain in raw', () => {
  assert.deepEqual(findLinkMatches('https://www.instagram.com/reel/X'), [
    {
      host: 'instagram.com',
      pathAndQuery: '/reel/X',
      raw: 'https://www.instagram.com/reel/X',
      index: 0,
    },
  ]);
});

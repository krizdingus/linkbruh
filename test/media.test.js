import { test } from 'node:test';
import assert from 'node:assert/strict';

import { filenameFor } from '../src/media.js';

test('keeps a real video filename from the URL', () => {
  assert.equal(
    filenameFor('https://video.twimg.com/amplify_video/123/vid/avc1/1280x720/abc.mp4'),
    'abc.mp4',
  );
  assert.equal(filenameFor('https://cdn/clip.webm'), 'clip.webm');
});

test('falls back to video.mp4 for URLs without a video filename', () => {
  assert.equal(filenameFor('https://kkinstagram.com/reel/ABC'), 'video.mp4');
  assert.equal(filenameFor('not a url'), 'video.mp4');
});

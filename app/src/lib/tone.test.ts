// Run: node --test src/lib/tone.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTone } from './tone.ts';

test('calm messages pass untouched', () => {
  const t = checkTone('Can we move pickup to 5:30 on Friday?');
  assert.equal(t.level, 'calm');
  assert.equal(t.calmer, 'Can we move pickup to 5:30 on Friday?');
});

test('heated messages get flagged and softened', () => {
  const t = checkTone('You ALWAYS show up LATE!!! This is your fault, idiot.');
  assert.equal(t.level, 'heated');
  assert.ok(t.issues.length >= 3);
  assert.doesNotMatch(t.calmer, /idiot|!|ALWAYS/);
  assert.match(t.calmer, /^It often feels like you/);
  assert.match(t.calmer, /\. Let's figure this out together\.$/);
});

test('one issue is just tense', () => {
  assert.equal(checkTone('You never answer on time.').level, 'tense');
});

test('judging words become an I-statement', () => {
  const t = checkTone('You ALWAYS forget the bag. This is ridiculous and you never listen.');
  assert.equal(t.level, 'heated');
  assert.equal(t.calmer, "It often feels like you forget the bag. I'm frustrated and it would really help if you listen.");
});

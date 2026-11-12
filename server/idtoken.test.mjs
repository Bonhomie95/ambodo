import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { verifyIdToken } from './idtoken.mjs';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwks = { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }] };
const fetchJson = async () => jwks;
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (claims, { kid = 'k1', key = privateKey } = {}) => {
  const head = `${enc({ alg: 'RS256', kid })}.${enc(claims)}`;
  return `${head}.${sign('RSA-SHA256', Buffer.from(head), key).toString('base64url')}`;
};
const now = Date.now();
const good = { iss: 'https://accounts.google.com', aud: 'web-client', sub: '123', email: 'a@b.co', email_verified: true, exp: now / 1000 + 600 };
const check = (t, provider = 'google') => verifyIdToken(t, provider, ['web-client'], { now, fetchJson });

test('accepts a valid Google token and returns its claims', async () => {
  assert.equal((await check(token(good))).sub, '123');
});

test('rejects wrong audience, issuer, expiry, signature, key and junk', async () => {
  await assert.rejects(check(token({ ...good, aud: 'someone-else' })), /audience/);
  await assert.rejects(check(token({ ...good, iss: 'https://evil.example' })), /issuer/);
  await assert.rejects(check(token({ ...good, exp: now / 1000 - 1 })), /expired/);
  await assert.rejects(check(token(good, { key: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey })), /signature/);
  await assert.rejects(check(token(good, { kid: 'nope' })), /signing key/);
  await assert.rejects(check('not-a-token'), /malformed/);
  await assert.rejects(check(undefined), /malformed/);
});

test('Apple tokens use Apple’s issuer', async () => {
  const apple = { ...good, iss: 'https://appleid.apple.com', email_verified: 'true' };
  assert.equal((await check(token(apple), 'apple')).iss, 'https://appleid.apple.com');
  await assert.rejects(check(token(good), 'apple'), /issuer/);
});

// Google and Apple sign-in hand the app an ID token (an RS256 JWT). We check it against the provider's published keys.
import { createPublicKey, verify } from 'node:crypto';

export const PROVIDERS = {
  google: { jwks: 'https://www.googleapis.com/oauth2/v3/certs', iss: ['accounts.google.com', 'https://accounts.google.com'] },
  apple: { jwks: 'https://appleid.apple.com/auth/keys', iss: ['https://appleid.apple.com'] },
};

const b64 = (s) => Buffer.from(s, 'base64url');
const cache = new Map(); // jwks url → { keys, at }
const getJson = (url) => fetch(url).then((r) => r.json());

// ponytail: keys cached for an hour; a rotated key misses the cache once and refetches
async function keyFor(url, kid, fetchJson) {
  let hit = cache.get(url);
  if (!hit || Date.now() - hit.at > 3600e3 || !hit.keys.some((k) => k.kid === kid)) {
    hit = { keys: (await fetchJson(url)).keys ?? [], at: Date.now() };
    cache.set(url, hit);
  }
  const jwk = hit.keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error('unknown signing key');
  return createPublicKey({ key: jwk, format: 'jwk' });
}

/** The token's claims if it's a valid, unexpired token from `provider` for one of `audiences`; throws otherwise. */
export async function verifyIdToken(token, provider, audiences, { now = Date.now(), fetchJson = getJson } = {}) {
  const p = PROVIDERS[provider];
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(b64(parts[0]));
  const claims = JSON.parse(b64(parts[1]));
  if (header.alg !== 'RS256') throw new Error('unexpected algorithm');
  const key = await keyFor(p.jwks, header.kid, fetchJson);
  if (!verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, b64(parts[2]))) throw new Error('bad signature');
  if (!p.iss.includes(claims.iss)) throw new Error('wrong issuer');
  if (!audiences.includes(claims.aud)) throw new Error('wrong audience');
  if (!(claims.exp * 1000 > now)) throw new Error('expired');
  return claims;
}

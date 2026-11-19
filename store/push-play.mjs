// Google Play in every language: store listing, the Ambodo Family subscription's text, and (optionally) a release.
//   node store/push-play.mjs                      validate only; the edit is thrown away
//   node store/push-play.mjs --commit             publish listings + subscription text (Play reviews listing changes)
//   node store/push-play.mjs --release 6 --commit also roll version code 6 out to production with localized notes
// Auth: app/play-service-account.json (gitignored).
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PLAY, playDescription, text } from './text/locales.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const sa = JSON.parse(readFileSync(`${ROOT}app/play-service-account.json`, 'utf8'));
const app = JSON.parse(readFileSync(`${ROOT}app/app.json`, 'utf8')).expo;
const PKG = app.android.package;
const SUB = 'dev.bonhomieinc.ambodo.family';
const args = process.argv.slice(2);
const commit = args.includes('--commit');
const release = args.includes('--release') ? args[args.indexOf('--release') + 1] : null;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
const { access_token } = await (await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url')}` }),
})).json();
async function play(method, path, body) {
  const r = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}${path}`, {
    method, headers: { Authorization: `Bearer ${access_token}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body),
  });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${j.error?.message}`);
  return j;
}

const langs = Object.keys(PLAY).filter((l) => text(l));
const failed = [];
const edit = await play('POST', '/edits', {});
let done = 0;
for (const l of langs) {
  const s = text(l);
  for (const code of PLAY[l]) {
    try {
      await play('PUT', `/edits/${edit.id}/listings/${code}`, { language: code, title: s.name, shortDescription: s.short, fullDescription: playDescription(s) });
      done++;
    } catch (e) { failed.push(`${code}: ${e.message}`); }
  }
}
if (release) {
  const releaseNotes = langs.flatMap((l) => PLAY[l].map((language) => ({ language, text: text(l).whatsNewPlay })));
  await play('PUT', `/edits/${edit.id}/tracks/production`, {
    track: 'production', releases: [{ name: `${app.version} (${release})`, versionCodes: [release], status: 'completed', releaseNotes }],
  });
}
await play('POST', `/edits/${edit.id}:validate`);
console.log(`${done} listings${release ? ` + release ${app.version} (${release})` : ''} valid${failed.length ? `; failed: ${failed.join(' | ')}` : ''}`);
if (!commit) { await play('DELETE', `/edits/${edit.id}`); console.log('not committed (pass --commit)'); process.exit(failed.length ? 1 : 0); }
await play('POST', `/edits/${edit.id}:commit`);
console.log('committed', new Date().toISOString());

// The subscription's title, benefits and description per language (monetization API, live right away).
const listings = langs.flatMap((l) => PLAY[l].map((languageCode) => ({ languageCode, title: 'Ambodo Family', benefits: text(l).playBenefits, description: text(l).playSubDesc })));
await play('PATCH', `/subscriptions/${SUB}?updateMask=listings&regionsVersion.version=2022/02`, { packageName: PKG, productId: SUB, listings });
console.log(`subscription text in ${listings.length} languages`);
process.exit(failed.length ? 1 : 0);

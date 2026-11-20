// App Store in every language for one editable version: version text, name & subtitle, subscription names.
// With --build it also attaches that build and submits the version (plus the new subscription text) for review.
//   node --env-file=store/.env store/push-apple.mjs 1.0.2 [--build 9]
// store/.env (gitignored): ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH (path to the .p8 key).
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { APPLE, PRIVACY_URL, SUPPORT_URL, appleDescription, text } from './text/locales.mjs';

const APP = '6832982834';
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH } = process.env;
const key = createPrivateKey(readFileSync(ASC_KEY_PATH));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' })}.${b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })}`;
  return `${unsigned}.${sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
async function asc(path, { method = 'GET', body } = {}) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, { method, headers: { Authorization: `Bearer ${jwt()}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${j.errors?.map((e) => e.detail ?? e.title).join('; ')}`);
  return j;
}
/** PATCH the localization for `locale` if it exists, else create it under `parent`. */
async function upsert(type, existing, locale, attributes, parent) {
  const cur = existing.find((x) => x.attributes.locale === locale);
  if (cur) return asc(`/v1/${type}/${cur.id}`, { method: 'PATCH', body: { data: { type, id: cur.id, attributes } } });
  return asc(`/v1/${type}`, { method: 'POST', body: { data: { type, attributes: { locale, ...attributes }, relationships: parent } } });
}

const version = process.argv[2];
const build = process.argv.includes('--build') ? process.argv[process.argv.indexOf('--build') + 1] : null;
const EDITABLE = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);
const failed = [];
const each = async (label, fn) => { try { await fn(); } catch (e) { failed.push(`${label}: ${e.message}`); } };
const pairs = Object.entries(APPLE).filter(([l]) => text(l)).flatMap(([l, locales]) => locales.map((locale) => [locale, text(l)]));

let v = (await asc(`/v1/apps/${APP}/appStoreVersions?filter[versionString]=${version}&filter[platform]=IOS`)).data[0];
v ??= (await asc('/v1/appStoreVersions', { method: 'POST', body: { data: { type: 'appStoreVersions',
  attributes: { platform: 'IOS', versionString: version, releaseType: 'AFTER_APPROVAL' }, relationships: { app: { data: { type: 'apps', id: APP } } } } } })).data;
if (!EDITABLE.has(v.attributes.appStoreState)) throw new Error(`${version} is ${v.attributes.appStoreState}, not editable`);
// "What's New" exists only once an earlier version has been on sale.
const update = (await asc(`/v1/apps/${APP}/appStoreVersions?filter[appStoreState]=READY_FOR_SALE,REPLACED_WITH_NEW_VERSION&filter[platform]=IOS`)).data.length > 0;

const vLocs = (await asc(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?limit=200`)).data;
for (const [locale, s] of pairs)
  await each(`${locale} text`, () => upsert('appStoreVersionLocalizations', vLocs, locale, {
    description: appleDescription(s), keywords: s.keywords, promotionalText: s.promo, supportUrl: SUPPORT_URL, ...(update ? { whatsNew: s.whatsNewApple } : {}),
  }, { appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } }));

const info = (await asc(`/v1/apps/${APP}/appInfos`)).data.find((i) => EDITABLE.has(i.attributes.state ?? i.attributes.appStoreState));
if (!info) failed.push('name/subtitle: no editable app info');
else {
  const iLocs = (await asc(`/v1/appInfos/${info.id}/appInfoLocalizations?limit=200`)).data;
  for (const [locale, s] of pairs)
    await each(`${locale} name`, () => upsert('appInfoLocalizations', iLocs, locale, { name: s.name, subtitle: s.subtitle, privacyPolicyUrl: PRIVACY_URL },
      { appInfo: { data: { type: 'appInfos', id: info.id } } }));
}

for (const g of (await asc(`/v1/apps/${APP}/subscriptionGroups`)).data) {
  const gLocs = (await asc(`/v1/subscriptionGroups/${g.id}/subscriptionGroupLocalizations?limit=200`)).data;
  for (const [locale] of pairs)
    await each(`${locale} group`, () => upsert('subscriptionGroupLocalizations', gLocs, locale, { name: 'Ambodo Family' },
      { subscriptionGroup: { data: { type: 'subscriptionGroups', id: g.id } } }));
  for (const sub of (await asc(`/v1/subscriptionGroups/${g.id}/subscriptions`)).data) {
    const yearly = sub.attributes.productId.endsWith('.annual');
    const sLocs = (await asc(`/v1/subscriptions/${sub.id}/subscriptionLocalizations?limit=200`)).data;
    for (const [locale, s] of pairs)
      await each(`${locale} ${sub.attributes.productId}`, () => upsert('subscriptionLocalizations', sLocs, locale,
        { name: yearly ? s.subYearlyName : s.subMonthlyName, description: yearly ? s.subYearlyDesc : s.subMonthlyDesc },
        { subscription: { data: { type: 'subscriptions', id: sub.id } } }));
  }
}
console.log(`${version}: text for ${pairs.length} locales${failed.length ? `; ${failed.length} failed:\n  ${failed.join('\n  ')}` : ''}`);

if (build) {
  const b = (await asc(`/v1/builds?filter[app]=${APP}&filter[version]=${build}&filter[preReleaseVersion.version]=${version}`)).data[0];
  if (b?.attributes.processingState !== 'VALID') throw new Error(`build ${build} not ready: ${b?.attributes.processingState ?? 'not uploaded'}`);
  await asc(`/v1/appStoreVersions/${v.id}/relationships/build`, { method: 'PATCH', body: { data: { type: 'builds', id: b.id } } });
  // Review contact and demo account: copy the last version's when this one has none (values never printed).
  const has = (await asc(`/v1/appStoreVersions/${v.id}/appStoreReviewDetail`).catch(() => ({ data: null }))).data;
  if (!has) {
    const prev = (await asc(`/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS&limit=10`)).data.find((x) => x.id !== v.id);
    const src = (await asc(`/v1/appStoreVersions/${prev.id}/appStoreReviewDetail`)).data.attributes;
    await asc('/v1/appStoreReviewDetails', { method: 'POST', body: { data: { type: 'appStoreReviewDetails', attributes: src,
      relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } } } } });
  }
  let sub = (await asc(`/v1/reviewSubmissions?filter[app]=${APP}&filter[state]=READY_FOR_REVIEW&filter[platform]=IOS`)).data[0];
  sub ??= (await asc('/v1/reviewSubmissions', { method: 'POST', body: { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' },
    relationships: { app: { data: { type: 'apps', id: APP } } } } } })).data;
  await asc('/v1/reviewSubmissionItems', { method: 'POST', body: { data: { type: 'reviewSubmissionItems',
    relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } }, appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } } } } })
    .catch((e) => { if (!/already/i.test(e.message)) throw e; });
  // Subscriptions not yet approved or in review go with this version (Apple requires it for the first ones).
  for (const g of (await asc(`/v1/apps/${APP}/subscriptionGroups`)).data) {
    const due = (await asc(`/v1/subscriptionGroups/${g.id}/subscriptions`)).data
      .filter((s) => ['READY_TO_SUBMIT', 'DEVELOPER_ACTION_NEEDED', 'REJECTED'].includes(s.attributes.state));
    if (!due.length) continue;
    await asc('/v1/subscriptionGroupSubmissions', { method: 'POST', body: { data: { type: 'subscriptionGroupSubmissions',
      relationships: { subscriptionGroup: { data: { type: 'subscriptionGroups', id: g.id } } } } } })
      .catch((e) => console.log(`group ${g.attributes.referenceName}: ${e.message}`));
    for (const s of due) await asc('/v1/subscriptionSubmissions', { method: 'POST', body: { data: { type: 'subscriptionSubmissions',
      relationships: { subscription: { data: { type: 'subscriptions', id: s.id } } } } } });
    console.log(`with subscriptions: ${due.map((s) => s.attributes.productId).join(', ')}`);
  }
  await asc(`/v1/reviewSubmissions/${sub.id}`, { method: 'PATCH', body: { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } } });
  console.log(`submitted ${version} (${build}) for review`, new Date().toISOString());
}
process.exit(failed.length ? 1 : 0);

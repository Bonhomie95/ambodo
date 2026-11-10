// End-to-end check against a running API: `npm run smoke` (uses throwaway accounts, cleans up after itself).
import assert from 'node:assert/strict';

const API = process.env.API ?? 'http://127.0.0.1:4000';
const call = async (method, path, token, body) => {
  const r = await fetch(API + path, {
    method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const type = r.headers.get('content-type') ?? '';
  return { status: r.status, data: type.includes('json') ? await r.json() : await r.text() };
};
const stamp = Date.now();
const signup = async (name) =>
  (await call('POST', '/auth/signup', null, { name, email: `${name}.${stamp}@smoke.test`, password: 'password123' })).data.token;

const a = await signup('ada');
const b = await signup('bo');
const fam = (await call('POST', '/family', a, { kids: [{ name: 'Mia' }], pattern: '2-2-3', anchor: '2026-11-09' })).data;
assert.match(fam.invite, /^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
const joined = (await call('POST', '/family/join', b, { code: fam.invite.toLowerCase().replace('-', ' ') })).data;
assert.equal(joined.members.length, 2);
const [ada, bo] = joined.members.map((m) => m.id);

await call('POST', '/messages', a, { text: 'Pickup at 5 works for me.' });
await call('POST', '/messages', b, { text: 'Great, see you then.' });
await call('POST', '/messages/read', b);
const msgs = (await call('GET', '/messages', a)).data;
assert.equal(msgs.length, 2);
assert.equal(msgs[0].seen, true);
assert.deepEqual((await call('GET', '/records/verify', a)).data.ok, true);

const week = (await call('GET', '/custody?from=2026-11-09&to=2026-11-15', a)).data.map((d) => (d.parent === ada ? 'A' : 'B')).join('');
assert.equal(week, 'AABBAAA');
const swap = (await call('POST', '/swaps', a, { dates: ['2026-11-09'], assignTo: bo, note: 'Work trip' })).data;
assert.equal((await call('POST', `/swaps/${swap.id}`, a, { accept: true })).status, 404, 'requester cannot self-approve');
assert.equal((await call('POST', `/swaps/${swap.id}`, b, { accept: true })).data.status, 'accepted');
assert.equal((await call('GET', '/custody?from=2026-11-09&to=2026-11-09', a)).data[0].parent, bo);

// Free plan: expenses + calendar feed are Family features; ToneGuard rewrites are capped.
assert.equal((await call('POST', '/expenses', b, { title: 'x', amount: 1 })).status, 402);
assert.equal((await call('GET', `/ics/${joined.ics}`)).status, 402);
for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/tone/rewrite', a)).status, 200);
assert.equal((await call('POST', '/tone/rewrite', a)).status, 402);
assert.equal((await call('GET', '/billing', b)).data.rewritesLeft, 5, 'quota is per parent');
// One purchase (test mode) unlocks the whole family — the other parent included.
assert.equal((await call('POST', '/billing/dev-grant', a, { period: 'annual' })).data.plan.active, true);
assert.equal((await call('GET', '/me', b)).data.family.plan.active, true);
assert.equal((await call('POST', '/tone/rewrite', a)).data.left, null);

const exp = (await call('POST', '/expenses', b, { title: 'Soccer cleats', amount: '64.50', category: 'activities' })).data;
assert.equal(exp.amount, 6450);
assert.equal((await call('POST', `/expenses/${exp.id}/settle`, a)).data.status, 'settled');
assert.match((await call('GET', `/ics/${joined.ics}`)).data, /SUMMARY:Kids with bo/);

assert.equal((await call('POST', '/auth/signin', null, { email: `ada.${stamp}@smoke.test`, password: 'nope' })).status, 401);
assert.equal((await call('GET', '/me', 'not-a-token')).status, 401);
assert.equal((await call('POST', '/messages', a, '[1]')).status, 400);

// Fee waivers queue for review — one open request per family.
assert.equal((await call('POST', '/billing/waiver', b, { reason: 'Court fee waiver granted' })).data.plan.waiver, 'pending');
assert.equal((await call('POST', '/billing/waiver', a, { reason: 'again' })).status, 409);

await call('DELETE', '/me', a);
await call('DELETE', '/me', b);
assert.equal((await call('GET', '/me', b)).status, 401);
console.log('smoke ok ✓');

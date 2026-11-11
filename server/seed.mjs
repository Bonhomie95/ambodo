// Demo family for trying the app: `npm run seed` (API must be running). Re-running resets it.
// Sign in as either parent — both use the password below.
const API = process.env.API ?? 'http://127.0.0.1:4000';
const PASSWORD = process.env.SEED_PASSWORD || 'ambodo-demo-2026';
// SEED_TAG=play seeds a second family (ada.play@…) so each store's reviewer gets their own.
const TAG = process.env.SEED_TAG ? `.${process.env.SEED_TAG}` : '';
const PARENTS = [{ name: 'Ada', email: `ada${TAG}@demo.ambodo.app` }, { name: 'Bo', email: `bo${TAG}@demo.ambodo.app` }];

const call = async (path, token, body, method) => {
  const r = await fetch(API + path, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`${path}: ${data.error}`);
  return data;
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const monday = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };

// Reset: delete existing demo accounts (their family goes with them).
for (const p of PARENTS) {
  const r = await fetch(`${API}/auth/signin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: p.email, password: PASSWORD }) });
  if (r.ok) await call('/me', (await r.json()).token, undefined, 'DELETE');
}

const tokens = [];
for (const p of PARENTS) tokens.push((await call('/auth/signup', null, { ...p, password: PASSWORD })).token);
const [a, b] = tokens;

const fam = await call('/family', a, { kids: [{ name: 'Mia', birthday: '2018-04-02' }], pattern: '2-2-3', anchor: monday() });
// A co-parent, a second kid, events, swaps and expenses are Family features: seed under a test plan, then drop back
// to Free at the end so the paywall shows. Production has no test plans (see STORE.md → "To reset it").
const testPlan = await call('/billing/dev-grant', a, { period: 'annual' }).then(() => true, () => false);
await call('/family/kids', a, { name: 'Leo', birthday: '2021-09-15' });
const joined = await call('/family/join', b, { code: fam.invite });
const boId = joined.members.find((m) => m.name === 'Bo').id;
await call(`/family/kids/${fam.kids[0].id}`, a, { school: 'Maple Elementary · Ms. Lee', allergies: 'Peanuts', sizes: 'Shoes 13 · Shirt 6', doctor: 'Dr. Okafor' }, 'PATCH');

for (const [t, text] of [
  [b, "Hey — can you grab Mia's soccer bag from my place on Thursday?"],
  [a, "Sure. I'll swing by at 5:30. Leo's inhaler is in the front pocket."],
  [b, 'Perfect, thanks. Dentist moved to next week — I’ll add it.'],
  [a, 'Got it. Thanks for the heads-up 🙏'],
]) await call('/messages', t, { text });

await call('/events', b, { title: 'Mia · dentist', date: inDays(8), time: '10:30', kind: 'health' });
await call('/events', a, { title: 'Spring recital', date: inDays(3), time: '18:00', kind: 'activity' });
await call('/events', a, { title: 'School picture day', date: inDays(5), kind: 'school' });
await call('/expenses', a, { title: 'Soccer cleats', amount: 64.5, category: 'activities', split: 50 });
await call('/expenses', b, { title: 'Field trip fee', amount: 30, category: 'school', split: 50 });
await call('/checkins', a, { kind: 'dropoff' });
const saturday = inDays(((6 - new Date().getDay() + 7) % 7) || 7);
await call('/swaps', b, { dates: [saturday], assignTo: boId, note: 'My parents are in town — can I have them Saturday?' });
if (testPlan) await call('/billing/dev-grant', a, { period: 'off' });

console.log(`demo family ready → ${PARENTS.map((p) => p.email).join(' / ')} (password: ${process.env.SEED_PASSWORD ? 'SEED_PASSWORD' : 'the default in server/seed.mjs'})`);

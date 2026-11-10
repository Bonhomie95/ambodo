// Ambodo API — Node stdlib http + MongoDB. Set MONGODB_URI to move from local to Atlas.
import http from 'node:http';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { MongoClient, ObjectId } from 'mongodb';
import { FREE_REWRITES, isPro, lapsed, month, planView, revenueCat, storePlan } from './billing.mjs';
import { PATTERNS, chainHash, custodyFor, icsFeed } from './custody.mjs';

const { MONGODB_URI = 'mongodb://127.0.0.1:27017', MONGODB_DB = 'ambodo', PORT = '4000', HOST = '127.0.0.1', REVENUECAT_SECRET_KEY, NODE_ENV } = process.env;
// Test purchases (no real charge) are on outside production unless BILLING_DEV=false.
const BILLING_DEV = process.env.BILLING_DEV ? process.env.BILLING_DEV === 'true' : NODE_ENV !== 'production';
const rcSubscriber = revenueCat(REVENUECAT_SECRET_KEY);
const client = new MongoClient(MONGODB_URI);
const db = client.db(MONGODB_DB);
const [users, sessions, families, messages, events, swaps, expenses, checkins] =
  ['users', 'sessions', 'families', 'messages', 'events', 'swaps', 'expenses', 'checkins'].map((n) => db.collection(n));

// ---------- helpers ----------
const fail = (status, error) => Object.assign(new Error(error), { status });
const sha = (s) => createHash('sha256').update(s).digest('hex');
const scryptAsync = promisify(scrypt);
const str = (v, label, max = 200) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw fail(400, `${label} is needed`);
  return v.trim();
};
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const day = (v, label) => { if (!isDay(v)) throw fail(400, `${label} must be YYYY-MM-DD`); return v; };
const oid = (v) => { if (!ObjectId.isValid(v)) throw fail(404, 'Not found'); return new ObjectId(v); };
const id = (doc) => doc._id.toString();

async function hashPass(p) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${(await scryptAsync(p, salt, 64)).toString('hex')}`;
}
async function checkPass(p, stored) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(await scryptAsync(p, Buffer.from(salt, 'hex'), 64), Buffer.from(hash, 'hex'));
}
async function newSession(userId) {
  const token = randomBytes(32).toString('base64url');
  await sessions.insertOne({ _id: sha(token), userId, expiresAt: new Date(Date.now() + 60 * 864e5) });
  return token;
}
const inviteCode = () => {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const raw = Array.from(randomBytes(6), (b) => abc[b % abc.length]).join('');
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
};
const pub = (u) => ({ id: id(u), name: u.name, email: u.email });

async function familyView(f) {
  const people = await users.find({ _id: { $in: f.members } }, { projection: { name: 1 } }).toArray();
  return {
    id: id(f), invite: f.invite, ics: f.icsToken, kids: f.kids,
    schedule: { ...f.schedule, first: f.schedule.first?.toString() ?? null },
    members: f.members.map((m) => ({ id: m.toString(), name: people.find((p) => p._id.equals(m))?.name ?? 'Co-parent' })),
    plan: planView(f),
  };
}
// RevenueCat is the source of truth for store plans; dev and waiver plans are ours.
async function syncStore(f) {
  if (!REVENUECAT_SECRET_KEY || f.plan?.source === 'waiver') return f;
  const plan = await storePlan(f.members.map(String), rcSubscriber).catch(() => { throw fail(503, 'Couldn’t reach the store — try again'); });
  if (plan) await families.updateOne({ _id: f._id }, { $set: { plan } });
  else if (f.plan?.source === 'store') await families.updateOne({ _id: f._id }, { $unset: { plan: '' } });
  return families.findOne({ _id: f._id });
}
// ponytail: renewals are picked up lazily once the stored expiry passes; add RevenueCat webhooks if refunds must cut access instantly
const fresh = async (f) => (f && lapsed(f) ? syncStore(f).catch(() => f) : f);
const familyOf = async (user) => fresh(await families.findOne({ members: user._id }));
async function famOf(user) {
  const f = await familyOf(user);
  if (!f) throw fail(409, 'Set up your family first');
  return f;
}
const requirePro = (f) => { if (!isPro(f)) throw fail(402, 'That’s part of Ambodo Family'); };
const msgView = (m, me) => ({
  id: id(m), author: m.authorId.toString(), text: m.text, at: m.createdAt, hash: m.hash,
  seen: m.authorId.equals(me) && m.readBy.some((r) => !r.equals(me)),
});
const swapView = (s) => ({ id: id(s), by: s.by.toString(), assignTo: s.assignTo.toString(), dates: s.dates, note: s.note, status: s.status, at: s.createdAt });
const expenseView = (e) => ({ id: id(e), title: e.title, category: e.category, amount: e.amount, split: e.split, paidBy: e.paidBy.toString(), status: e.status, at: e.createdAt });
const eventView = (e) => ({ id: id(e), title: e.title, date: e.date, time: e.time, kind: e.kind, by: e.by.toString() });

// ---------- routes ----------
const CAL = Symbol('calendar'); // marks a text/calendar response
const routes = [];
const on = (method, path, fn, open = false) =>
  routes.push({ method, re: new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`), fn, open });

on('GET', '/health', async () => ({ ok: true }), true);

on('POST', '/auth/signup', async ({ body }) => {
  const name = str(body.name, 'Your name', 60);
  const email = str(body.email, 'Email', 120).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw fail(400, 'That email looks off');
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 200) throw fail(400, 'Use 8+ characters for your password');
  if (await users.findOne({ email })) throw fail(409, 'That email already has an account');
  const { insertedId } = await users.insertOne({ name, email, pass: await hashPass(body.password), createdAt: new Date() });
  return { token: await newSession(insertedId), user: { id: insertedId.toString(), name, email } };
}, true);

on('POST', '/auth/signin', async ({ body }) => {
  const u = await users.findOne({ email: String(body.email ?? '').trim().toLowerCase() });
  if (!u || !(await checkPass(String(body.password ?? ''), u.pass))) throw fail(401, 'Email or password is wrong');
  return { token: await newSession(u._id), user: pub(u) };
}, true); // ponytail: no rate limiting yet — add per-IP throttling before going public

on('POST', '/auth/signout', async ({ session }) => { await sessions.deleteOne({ _id: session }); });

on('GET', '/me', async ({ user }) => {
  const f = await familyOf(user);
  return { user: pub(user), family: f ? await familyView(f) : null };
});

// App Store 5.1.1(v): accounts must be deletable in-app. Shared records stay with the co-parent.
on('DELETE', '/me', async ({ user }) => {
  const f = await families.findOne({ members: user._id });
  if (f) {
    const left = f.members.filter((m) => !m.equals(user._id));
    if (left.length) await families.updateOne({ _id: f._id }, { $set: { members: left } });
    else await Promise.all([families.deleteOne({ _id: f._id }),
      ...[messages, events, swaps, expenses, checkins].map((c) => c.deleteMany({ familyId: f._id }))]);
  }
  await Promise.all([users.deleteOne({ _id: user._id }), sessions.deleteMany({ userId: user._id })]);
});

const kid = (k) => ({
  id: randomBytes(6).toString('hex'), name: str(k?.name, 'Kid name', 40),
  birthday: isDay(k?.birthday) ? k.birthday : null, school: '', doctor: '', allergies: '', sizes: '', notes: '',
});

on('POST', '/family', async ({ body, user }) => {
  if (await families.findOne({ members: user._id })) throw fail(409, 'You already have a family');
  const kids = Array.isArray(body.kids) ? body.kids.slice(0, 8).map(kid) : [];
  if (!kids.length) throw fail(400, 'Add at least one kid');
  if (!PATTERNS[body.pattern]) throw fail(400, 'Pick a schedule');
  const f = {
    members: [user._id], kids, invite: inviteCode(), icsToken: randomBytes(18).toString('base64url'),
    schedule: { pattern: body.pattern, anchor: day(body.anchor, 'Start date'), first: body.youFirst === false ? null : user._id },
    overrides: {}, createdAt: new Date(),
  };
  await families.insertOne(f);
  return familyView(f);
});

on('POST', '/family/join', async ({ body, user }) => {
  if (await families.findOne({ members: user._id })) throw fail(409, 'You already have a family');
  const raw = String(body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const f = await families.findOneAndUpdate(
    { invite: `${raw.slice(0, 3)}-${raw.slice(3)}`, 'members.1': { $exists: false } },
    { $addToSet: { members: user._id } }, { returnDocument: 'after' });
  if (!f) throw fail(404, "That code didn't work");
  if (!f.schedule.first) await families.updateOne({ _id: f._id }, { $set: { 'schedule.first': user._id } });
  return familyView(await families.findOne({ _id: f._id }));
});

on('GET', '/family', async ({ user }) => familyView(await famOf(user)));

// ponytail: either parent can change the base schedule; route it through a swap-style approval if that causes fights
on('PATCH', '/family/schedule', async ({ body, user }) => {
  const f = await famOf(user);
  const set = {};
  if (body.pattern !== undefined) { if (!PATTERNS[body.pattern]) throw fail(400, 'Pick a schedule'); set['schedule.pattern'] = body.pattern; }
  if (body.anchor !== undefined) set['schedule.anchor'] = day(body.anchor, 'Start date');
  if (body.first !== undefined) {
    const m = f.members.find((x) => x.toString() === body.first);
    if (!m) throw fail(400, 'Pick a parent'); set['schedule.first'] = m;
  }
  if (Object.keys(set).length) await families.updateOne({ _id: f._id }, { $set: set });
  return familyView(await families.findOne({ _id: f._id }));
});

on('POST', '/family/kids', async ({ body, user }) => {
  const f = await famOf(user);
  if (f.kids.length >= 8) throw fail(400, 'Up to 8 kids for now');
  const k = kid(body);
  await families.updateOne({ _id: f._id }, { $push: { kids: k } });
  return k;
});

on('PATCH', '/family/kids/:id', async ({ body, params: [kidId], user }) => {
  const f = await famOf(user);
  const set = {};
  for (const k of ['school', 'doctor', 'allergies', 'sizes', 'notes']) if (typeof body[k] === 'string') set[`kids.$.${k}`] = body[k].trim().slice(0, 500);
  if (body.name !== undefined) set['kids.$.name'] = str(body.name, 'Kid name', 40);
  if (body.birthday === null || isDay(body.birthday)) set['kids.$.birthday'] = body.birthday;
  if (!Object.keys(set).length) return;
  const r = await families.updateOne({ _id: f._id, 'kids.id': kidId }, { $set: set });
  if (!r.matchedCount) throw fail(404, 'Not found');
});

on('DELETE', '/family/kids/:id', async ({ params: [kidId], user }) => {
  const f = await famOf(user);
  if (f.kids.length <= 1) throw fail(400, 'Keep at least one kid');
  await families.updateOne({ _id: f._id }, { $pull: { kids: { id: kidId } } });
});

on('GET', '/custody', async ({ query, user }) =>
  custodyFor(await famOf(user), day(query.from, 'from'), day(query.to, 'to')));

on('GET', '/messages', async ({ query, user }) => {
  const f = await famOf(user);
  let list;
  if (query.after) {
    const after = new Date(query.after);
    if (Number.isNaN(+after)) throw fail(400, 'Bad cursor');
    list = await messages.find({ familyId: f._id, createdAt: { $gt: after } }).sort({ createdAt: 1, _id: 1 }).limit(200).toArray();
  } else {
    list = (await messages.find({ familyId: f._id }).sort({ createdAt: -1, _id: -1 }).limit(300).toArray()).reverse();
  }
  return list.map((m) => msgView(m, user._id));
});

on('POST', '/messages', async ({ body, user }) => {
  const f = await famOf(user);
  const text = str(body.text, 'Message', 4000);
  // Unique (familyId, prevHash) keeps the chain linear; a concurrent send just retries on the new head.
  for (let i = 0; i < 5; i++) {
    const last = await messages.find({ familyId: f._id }).sort({ createdAt: -1, _id: -1 }).limit(1).next();
    const prevHash = last?.hash ?? `genesis:${id(f)}`;
    const createdAt = new Date(Math.max(Date.now(), (last?.createdAt.getTime() ?? 0) + 1));
    const m = { familyId: f._id, authorId: user._id, text, createdAt, prevHash, readBy: [], hash: chainHash(prevHash, id(user), createdAt, text) };
    try {
      const { insertedId } = await messages.insertOne(m);
      return msgView({ ...m, _id: insertedId }, user._id);
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  throw fail(503, 'Busy — try again');
});

on('GET', '/messages/unread', async ({ user }) => {
  const f = await families.findOne({ members: user._id });
  return { count: f ? await messages.countDocuments({ familyId: f._id, authorId: { $ne: user._id }, readBy: { $ne: user._id } }) : 0 };
});

on('POST', '/messages/read', async ({ user }) => {
  const f = await famOf(user);
  await messages.updateMany({ familyId: f._id, authorId: { $ne: user._id }, readBy: { $ne: user._id } }, { $addToSet: { readBy: user._id } });
});

on('GET', '/records/verify', async ({ user }) => {
  const f = await famOf(user);
  let prev = `genesis:${id(f)}`;
  let count = 0;
  for await (const m of messages.find({ familyId: f._id }).sort({ createdAt: 1, _id: 1 })) {
    if (m.prevHash !== prev || m.hash !== chainHash(prev, m.authorId.toString(), m.createdAt, m.text)) return { ok: false, count, brokenAt: id(m) };
    prev = m.hash;
    count++;
  }
  return { ok: true, count, head: prev };
});

const KINDS = ['school', 'health', 'activity', 'handoff', 'other'];
on('GET', '/events', async ({ query, user }) => {
  const f = await famOf(user);
  const list = await events.find({ familyId: f._id, date: { $gte: day(query.from, 'from'), $lte: day(query.to, 'to') } }).sort({ date: 1, time: 1 }).toArray();
  return list.map(eventView);
});
on('POST', '/events', async ({ body, user }) => {
  const f = await famOf(user);
  const e = {
    familyId: f._id, by: user._id, title: str(body.title, 'Title', 80), date: day(body.date, 'Date'),
    time: /^\d{2}:\d{2}$/.test(body.time ?? '') ? body.time : null, kind: KINDS.includes(body.kind) ? body.kind : 'other', createdAt: new Date(),
  };
  const { insertedId } = await events.insertOne(e);
  return eventView({ ...e, _id: insertedId });
});
on('DELETE', '/events/:id', async ({ params: [eid], user }) => {
  const f = await famOf(user);
  await events.deleteOne({ _id: oid(eid), familyId: f._id });
});

on('GET', '/swaps', async ({ user }) => {
  const f = await famOf(user);
  return (await swaps.find({ familyId: f._id }).sort({ createdAt: -1 }).limit(100).toArray()).map(swapView);
});
on('POST', '/swaps', async ({ body, user }) => {
  const f = await famOf(user);
  if (f.members.length < 2) throw fail(409, 'Invite your co-parent first');
  const dates = Array.isArray(body.dates) ? [...new Set(body.dates.filter(isDay))].sort().slice(0, 31) : [];
  if (!dates.length) throw fail(400, 'Pick at least one day');
  const assignTo = f.members.find((m) => m.toString() === body.assignTo);
  if (!assignTo) throw fail(400, 'Pick who has the kids');
  const s = { familyId: f._id, by: user._id, dates, assignTo, note: String(body.note ?? '').trim().slice(0, 300), status: 'pending', createdAt: new Date() };
  const { insertedId } = await swaps.insertOne(s);
  return swapView({ ...s, _id: insertedId });
});
on('POST', '/swaps/:id', async ({ body, params: [sid], user }) => {
  const f = await famOf(user);
  const s = await swaps.findOneAndUpdate(
    { _id: oid(sid), familyId: f._id, by: { $ne: user._id }, status: 'pending' },
    { $set: { status: body.accept ? 'accepted' : 'declined', respondedAt: new Date() } }, { returnDocument: 'after' });
  if (!s) throw fail(404, 'That request is no longer open');
  if (s.status === 'accepted') await families.updateOne({ _id: f._id }, { $set: Object.fromEntries(s.dates.map((d) => [`overrides.${d}`, s.assignTo])) });
  return swapView(s);
});

const CATEGORIES = ['school', 'health', 'activities', 'clothes', 'food', 'other'];
on('GET', '/expenses', async ({ user }) => {
  const f = await famOf(user);
  return (await expenses.find({ familyId: f._id }).sort({ createdAt: -1 }).limit(300).toArray()).map(expenseView);
});
on('POST', '/expenses', async ({ body, user }) => {
  const f = await famOf(user);
  requirePro(f);
  const amount = Math.round(Number(body.amount) * 100); // cents
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) throw fail(400, 'Enter an amount');
  const e = {
    familyId: f._id, paidBy: user._id, title: str(body.title, 'What it was for', 80), amount,
    category: CATEGORIES.includes(body.category) ? body.category : 'other',
    split: Number.isInteger(body.split) && body.split >= 0 && body.split <= 100 ? body.split : 50, // % the other parent covers
    status: 'open', createdAt: new Date(),
  };
  const { insertedId } = await expenses.insertOne(e);
  return expenseView({ ...e, _id: insertedId });
});
on('POST', '/expenses/:id/settle', async ({ params: [eid], user }) => {
  const f = await famOf(user);
  requirePro(f);
  const e = await expenses.findOneAndUpdate({ _id: oid(eid), familyId: f._id, status: 'open' },
    { $set: { status: 'settled', settledBy: user._id, settledAt: new Date() } }, { returnDocument: 'after' });
  if (!e) throw fail(404, 'Already settled');
  return expenseView(e);
});

on('GET', '/checkins', async ({ user }) => {
  const f = await famOf(user);
  return (await checkins.find({ familyId: f._id }).sort({ createdAt: -1 }).limit(200).toArray())
    .map((c) => ({ id: id(c), by: c.by.toString(), kind: c.kind, note: c.note, at: c.createdAt }));
});
on('POST', '/checkins', async ({ body, user }) => {
  const f = await famOf(user);
  const c = { familyId: f._id, by: user._id, kind: body.kind === 'pickup' ? 'pickup' : 'dropoff', note: String(body.note ?? '').trim().slice(0, 300), createdAt: new Date() };
  const { insertedId } = await checkins.insertOne(c);
  return { id: insertedId.toString(), by: id(user), kind: c.kind, note: c.note, at: c.createdAt };
});

// ---------- Ambodo Family ----------
const rewritesLeft = (user) => Math.max(0, FREE_REWRITES - (user.rewrites?.[month()] ?? 0));

on('GET', '/billing', async ({ user }) => {
  const f = await famOf(user);
  return { plan: planView(f), rewritesLeft: isPro(f) ? null : rewritesLeft(user), testMode: BILLING_DEV && !REVENUECAT_SECRET_KEY };
});

// After a store purchase/restore the app asks us to re-check; RevenueCat is the source of truth.
on('POST', '/billing/sync', async ({ user }) => familyView(await syncStore(await famOf(user))));

// Simulator/dev purchases: no store, no charge. Disabled in production.
on('POST', '/billing/dev-grant', async ({ body, user }) => {
  if (!BILLING_DEV) throw fail(404, 'Not found');
  const f = await famOf(user);
  const days = body.period === 'monthly' ? 31 : 366;
  if (body.period === 'off') await families.updateOne({ _id: f._id }, { $unset: { plan: '' } });
  else await families.updateOne({ _id: f._id }, { $set: { plan: { source: 'dev', expiresAt: new Date(Date.now() + days * 864e5), by: user._id } } });
  return familyView(await families.findOne({ _id: f._id }));
});

// ponytail: waivers are approved by hand in the DB (waiver.status = 'approved' + plan.source = 'waiver'); add an admin screen when volume needs it
on('POST', '/billing/waiver', async ({ body, user }) => {
  const f = await famOf(user);
  if (f.waiver?.status === 'pending') throw fail(409, 'Your request is already being reviewed');
  await families.updateOne({ _id: f._id }, { $set: { waiver: { status: 'pending', by: user._id, reason: str(body.reason, 'A short reason', 500), at: new Date() } } });
  return familyView(await families.findOne({ _id: f._id }));
});

// Free parents get FREE_REWRITES ToneGuard rewrites a month; Family is unlimited.
on('POST', '/tone/rewrite', async ({ user }) => {
  const f = await famOf(user);
  if (isPro(f)) return { left: null };
  const key = `rewrites.${month()}`;
  const u = await users.findOneAndUpdate(
    { _id: user._id, [key]: { $not: { $gte: FREE_REWRITES } } }, { $inc: { [key]: 1 } }, { returnDocument: 'after' });
  if (!u) throw fail(402, 'You’ve used this month’s free rewrites');
  return { left: rewritesLeft(u) };
});

// Subscribe in Apple/Google Calendar: webcal://<host>/ics/<token>. The token is the secret.
on('GET', '/ics/:token', async ({ params: [token] }) => {
  const f = await fresh(await families.findOne({ icsToken: token }));
  if (!f) throw fail(404, 'Not found');
  requirePro(f);
  const people = await users.find({ _id: { $in: f.members } }, { projection: { name: 1 } }).toArray();
  const evs = await events.find({ familyId: f._id }).toArray();
  return { [CAL]: icsFeed(f, Object.fromEntries(people.map((p) => [id(p), p.name])), evs) };
}, true);

// ---------- server ----------
async function readJson(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 100_000) throw fail(413, 'Too large'); }
  if (!raw) return {};
  let body;
  try { body = JSON.parse(raw); } catch { throw fail(400, 'Bad JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'Bad JSON');
  return body;
}

async function auth(req) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  const session = token && (await sessions.findOne({ _id: sha(token), expiresAt: { $gt: new Date() } }));
  const user = session && (await users.findOne({ _id: session.userId }));
  if (!user) throw fail(401, 'Please sign in again');
  return { user, session: session._id };
}

await client.connect();
await Promise.all([
  users.createIndex({ email: 1 }, { unique: true }),
  sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  families.createIndex({ members: 1 }),
  families.createIndex({ invite: 1 }, { unique: true }),
  families.createIndex({ icsToken: 1 }, { unique: true }),
  messages.createIndex({ familyId: 1, prevHash: 1 }, { unique: true }),
  messages.createIndex({ familyId: 1, createdAt: 1 }),
  events.createIndex({ familyId: 1, date: 1 }),
]);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!route) throw fail(404, 'Not found');
    const ctx = {
      params: url.pathname.match(route.re).slice(1).map(decodeURIComponent),
      query: Object.fromEntries(url.searchParams),
      body: ['POST', 'PATCH'].includes(req.method) ? await readJson(req) : {},
      ...(route.open ? {} : await auth(req)),
    };
    const out = (await route.fn(ctx)) ?? { ok: true };
    if (out[CAL]) { res.writeHead(200, { 'content-type': 'text/calendar; charset=utf-8' }); return res.end(out[CAL]); }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out));
  } catch (e) {
    if (!e.status && e.code !== 11000) console.error(e);
    res.writeHead(e.status ?? (e.code === 11000 ? 409 : 500), { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: e.status ? e.message : e.code === 11000 ? 'That already exists' : 'Something went wrong' }));
  }
}).listen(Number(PORT), HOST, () => console.log(`ambodo api → http://${HOST}:${PORT} (db: ${MONGODB_DB})`));

import test from 'node:test';
import assert from 'node:assert/strict';
import { isPro, lapsed, month, planView, revenueCat, storePlan } from './billing.mjs';

const now = Date.parse('2026-11-10T12:00:00Z');

test('plan is active until it expires; waivers never expire', () => {
  assert.equal(isPro({ plan: { source: 'store', expiresAt: new Date('2026-12-01') } }, now), true);
  assert.equal(isPro({ plan: { source: 'store', expiresAt: new Date('2026-11-01') } }, now), false);
  assert.equal(isPro({ plan: { source: 'waiver', expiresAt: null } }, now), true);
  assert.equal(isPro({}, now), false);
  assert.deepEqual(planView({ waiver: { status: 'pending' } }, now), { active: false, source: null, expiresAt: null, waiver: 'pending' });
});

test('either parent paying unlocks the family; the later expiry wins', async () => {
  const subs = {
    a: { subscriber: { entitlements: { family: { expires_date: '2026-12-10T00:00:00Z', product_identifier: 'monthly' } } } },
    b: { subscriber: { entitlements: { family: { expires_date: '2027-11-10T00:00:00Z', product_identifier: 'annual' } } } },
    c: { subscriber: { entitlements: { family: { expires_date: '2026-10-01T00:00:00Z' } } } },
  };
  const get = async (id) => subs[id] ?? null;
  assert.equal((await storePlan(['a', 'b'], get, now)).by, 'b');
  assert.equal((await storePlan(['a'], get, now)).product, 'monthly');
  assert.equal(await storePlan(['c', 'nobody'], get, now), null);
});

test('rewrite quota buckets by calendar month', () => {
  assert.equal(month(now), '2026-11');
});

test('a store plan past its expiry is re-checked; an outage never reads as "cancelled"', async () => {
  assert.equal(lapsed({ plan: { source: 'store', expiresAt: new Date('2026-11-01') } }, now), true);
  assert.equal(lapsed({ plan: { source: 'store', expiresAt: new Date('2026-12-01') } }, now), false);
  assert.equal(lapsed({ plan: { source: 'dev', expiresAt: new Date('2026-11-01') } }, now), false);
  await assert.rejects(storePlan(['a'], async () => { throw new Error('down'); }, now));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try { await assert.rejects(revenueCat('sk_test')('a'), /503/); } finally { globalThis.fetch = realFetch; }
});

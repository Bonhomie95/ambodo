// Ambodo Family: one subscription per family, whichever parent pays. Stores bill, RevenueCat verifies,
// the plan lives on the family doc so both parents unlock together.
export const ENTITLEMENT = 'family';
export const FREE_REWRITES = 5; // ToneGuard "calmer version" sends per parent per month on the free plan

/** plan: { source: 'store' | 'dev' | 'waiver', expiresAt: Date | null, by } */
export const isPro = (family, now = Date.now()) =>
  !!family?.plan && (family.plan.source === 'waiver' || +new Date(family.plan.expiresAt) > now);

export const planView = (family, now = Date.now()) => ({
  active: isPro(family, now),
  source: family?.plan?.source ?? null,
  expiresAt: family?.plan?.expiresAt ?? null,
  waiver: family?.waiver?.status ?? null,
});

/** Stores renew without telling us: a store plan past its stored expiry may just have renewed — ask again. */
export const lapsed = (family, now = Date.now()) => family?.plan?.source === 'store' && !isPro(family, now);

export const month = (now = Date.now()) => new Date(now).toISOString().slice(0, 7);

/**
 * Asks RevenueCat which family member (if any) holds an active `family` entitlement and returns the
 * plan to store, or null. `get(userId)` returns the parsed /v1/subscribers payload or null.
 */
export async function storePlan(memberIds, get, now = Date.now()) {
  let best = null;
  for (const by of memberIds) {
    const e = (await get(by))?.subscriber?.entitlements?.[ENTITLEMENT];
    if (!e) continue;
    const expiresAt = e.expires_date ? new Date(e.expires_date) : new Date('9999-12-31T00:00:00Z'); // null = lifetime
    if (+expiresAt > now && (!best || expiresAt > best.expiresAt)) best = { source: 'store', expiresAt, by, product: e.product_identifier ?? null };
  }
  return best;
}

/** RevenueCat REST v1 lookup; null when not configured. Throws when RevenueCat can't answer, so an outage never reads as "cancelled". */
export const revenueCat = (secret) => async (userId) => {
  if (!secret) return null;
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!r.ok) throw new Error(`RevenueCat ${r.status}`);
  return r.json();
};

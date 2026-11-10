// Ambodo Family purchases. StoreKit / Play Billing via RevenueCat when keys are set;
// otherwise a no-charge test mode backed by the API (simulators, local dev).
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { api, type Family } from './api';

const KEY = Platform.select({ ios: process.env.EXPO_PUBLIC_RC_IOS_KEY, android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY });
export const testMode = !KEY;

export type Period = 'annual' | 'monthly';
export type Offer = { period: Period; price: string; amount: number | null; perMonth: string | null; pkg?: PurchasesPackage };

// Shown in test mode and as a fallback if the store can't be reached. Keep in sync with the store products.
const FALLBACK: Offer[] = [
  { period: 'annual', price: '$89.00', amount: 89, perMonth: '$7.42' },
  { period: 'monthly', price: '$9.99', amount: 9.99, perMonth: null },
];

let configuredFor: string | null = null;
export async function startBilling(userId: string) {
  if (!KEY || configuredFor === userId) return;
  if (configuredFor) await Purchases.logIn(userId);
  else Purchases.configure({ apiKey: KEY, appUserID: userId });
  configuredFor = userId;
}

export async function getOffers(): Promise<Offer[]> {
  if (!KEY) return FALLBACK;
  try {
    const current = (await Purchases.getOfferings()).current;
    const offers = ([['annual', current?.annual], ['monthly', current?.monthly]] as const)
      .filter(([, pkg]) => pkg)
      .map(([period, pkg]) => ({
        period, pkg: pkg!, price: pkg!.product.priceString, amount: pkg!.product.price,
        perMonth: period === 'annual' ? pkg!.product.pricePerMonthString ?? null : null,
      }));
    return offers.length ? offers : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Returns the updated family, or null if the person cancelled the store sheet. */
export async function buy(offer: Offer): Promise<Family | null> {
  if (!KEY || !offer.pkg) return api<Family>('/billing/dev-grant', { body: { period: offer.period } });
  try {
    await Purchases.purchasePackage(offer.pkg);
  } catch (e) {
    if ((e as { code?: string }).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return null;
    throw e;
  }
  return api<Family>('/billing/sync', { method: 'POST' });
}

export async function restore(): Promise<Family> {
  if (KEY) await Purchases.restorePurchases();
  return api<Family>('/billing/sync', { method: 'POST' });
}

export const manageUrl = Platform.OS === 'ios'
  ? 'https://apps.apple.com/account/subscriptions'
  : 'https://play.google.com/store/account/subscriptions';

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Simulators reach the Mac at localhost (iOS) / 10.0.2.2 (Android). Set EXPO_PUBLIC_API_URL for devices & prod.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

const KEY = 'ambodo.session';
let token: string | null = SecureStore.getItem(KEY);

export const hasToken = () => !!token;
export async function setToken(t: string | null) {
  token = t;
  if (t) await SecureStore.setItemAsync(KEY, t, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
/** 402 = a Family-plan feature; callers open the paywall. */
export const needsPlan = (e: unknown) => e instanceof ApiError && e.status === 402;

export async function api<T = { ok: true }>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach Ambodo right now. Check your connection.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong', res.status);
  return data as T;
}

/** The tab badge registers its refresher here so Talk can clear it the moment messages are read. */
export const unreadBadge = { refresh: () => {} };

export const calendarFeedUrl = (icsToken: string) => `${API_URL.replace(/^https?/, 'webcal')}/ics/${icsToken}`;

export type User = { id: string; name: string; email: string };
export type Kid = { id: string; name: string; birthday: string | null; school: string; doctor: string; allergies: string; sizes: string; notes: string };
export type Family = {
  id: string; invite: string; ics: string; kids: Kid[];
  schedule: { pattern: string; anchor: string; first: string | null };
  members: { id: string; name: string }[];
  plan: { active: boolean; source: 'store' | 'dev' | 'waiver' | null; expiresAt: string | null; waiver: 'pending' | 'approved' | 'declined' | null };
};
export type Message = { id: string; author: string; text: string; at: string; hash: string; seen: boolean };
export type Day = { date: string; parent: string | null };
export type CalEvent = { id: string; title: string; date: string; time: string | null; kind: string; by: string };
export type Swap = { id: string; by: string; assignTo: string; dates: string[]; note: string; status: 'pending' | 'accepted' | 'declined'; at: string };
export type Expense = { id: string; title: string; category: string; amount: number; split: number; paidBy: string; status: 'open' | 'settled'; at: string };
export type Checkin = { id: string; by: string; kind: 'dropoff' | 'pickup'; note: string; at: string };

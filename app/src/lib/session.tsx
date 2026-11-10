import { useFocusEffect } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { api, ApiError, hasToken, setToken, type Family, type User } from './api';
import { startBilling } from './billing';

type Me = { user: User | null; family: Family | null };
type State = Me & { ready: boolean; offline: boolean };
type Ctx = State & {
  meId: string;
  pro: boolean;
  other: { id: string; name: string } | null;
  nameOf: (id: string | null | undefined) => string;
  refresh: () => Promise<void>;
  signIn: (token: string) => Promise<Me>;
  signOut: () => Promise<void>;
  setFamily: (f: Family) => void;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>({ ready: !hasToken(), offline: false, user: null, family: null });

  const refresh = useCallback(async () => {
    try {
      const me = await (hasToken() ? api<Me>('/me') : Promise.resolve<Me>({ user: null, family: null }));
      set({ ready: true, offline: false, ...me });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await setToken(null);
        set({ ready: true, offline: false, user: null, family: null });
      } else set((p) => ({ ...p, ready: true, offline: true }));
    }
  }, []);

  // No token → initial state is already final; otherwise fetch /me on launch and on every return to the app,
  // so the co-parent's changes (their purchase, new kids, a new schedule) show up without a restart.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is only set after the network call resolves
    if (hasToken()) void refresh();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && hasToken() && refresh());
    return () => sub.remove();
  }, [refresh]);

  // Store purchases belong to the signed-in parent; the API turns them into a family plan.
  useEffect(() => { if (s.user) startBilling(s.user.id).catch(() => {}); }, [s.user]);

  const value = useMemo<Ctx>(() => {
    const meId = s.user?.id ?? '';
    return {
      ...s,
      meId,
      pro: !!s.family?.plan?.active,
      other: s.family?.members.find((m) => m.id !== meId) ?? null,
      nameOf: (id) => (id && id === meId ? 'You' : s.family?.members.find((m) => m.id === id)?.name ?? 'Co-parent'),
      refresh,
      signIn: async (token) => {
        await setToken(token);
        const me = await api<Me>('/me');
        set({ ready: true, offline: false, ...me });
        return me;
      },
      signOut: async () => {
        await api('/auth/signout', { method: 'POST' }).catch(() => {});
        await setToken(null);
        set({ ready: true, offline: false, user: null, family: null });
      },
      setFamily: (family) => set((p) => ({ ...p, family })),
    };
  }, [s, refresh]);

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const c = use(SessionContext);
  if (!c) throw new Error('useSession needs <SessionProvider>');
  return c;
}

/** Loads data when the screen gains focus; `reload` for pull-to-refresh. */
export function useLoad<T>(fn: () => Promise<T>, key?: unknown) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await fnRef.current()); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  // Re-runs on focus and whenever `key` changes while focused.
  useFocusEffect(useCallback(() => { reload(); }, [reload, key])); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, loading, reload, setData };
}

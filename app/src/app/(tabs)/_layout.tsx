import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api, unreadBadge } from '@/lib/api';
import { useSession } from '@/lib/session';
import { tint, useColors } from '@/lib/theme';

// ponytail: polls the unread count; switch to push notifications once APNs/FCM keys exist
function useUnread() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const tick = () => api<{ count: number }>('/messages/unread').then((r) => setN(r.count)).catch(() => {});
    unreadBadge.refresh = tick;
    tick();
    const id = setInterval(tick, 12000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => { clearInterval(id); sub.remove(); };
  }, []);
  return n;
}

export default function Tabs() {
  const c = useColors();
  const unread = useUnread();
  const { ready, user, family } = useSession();
  // A session can end while the app is open (expired, or the account was deleted): leave the tabs, don't render them empty.
  if (ready && !user) return <Redirect href="/welcome" />;
  if (ready && !family) return <Redirect href="/setup" />;
  return (
    <NativeTabs
      tintColor={c.me}
      indicatorColor={tint(c.me, 0.16)}
      badgeBackgroundColor={c.me}
      minimizeBehavior="onScrollDown"
      // iOS keeps the system Liquid Glass bar; Android gets the brand surface + always-on labels (M3).
      backgroundColor={Platform.OS === 'android' ? c.card : undefined}
      labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} md="wb_sunny" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="talk">
        <NativeTabs.Trigger.Label>Talk</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} md="forum" />
        {unread > 0 && <NativeTabs.Trigger.Badge>{unread > 9 ? '9+' : String(unread)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="money">
        <NativeTabs.Trigger.Label>Expenses</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} md="payments" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>Family</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="family_restroom" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

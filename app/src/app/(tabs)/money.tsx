import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Button, Card, Chip, Icon, Row, Screen, T, Tap, toast } from '@/components/ui';
import { api, type Expense } from '@/lib/api';
import { relative, ymd } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { CATEGORY_ICON, money } from '@/lib/meta';
import { useLoad, useSession } from '@/lib/session';
import { font, tint, useColors } from '@/lib/theme';

function useCountUp(target: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const from = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / 700);
      setV(Math.round(from + (target - from) * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

export default function Money() {
  const c = useColors();
  const { meId, other, nameOf, pro, family } = useSession();
  const cur = family?.currency;
  const [tab, setTab] = useState<'open' | 'settled'>('open');
  const { data, reload, loading } = useLoad(() => api<Expense[]>('/expenses'));
  const list = data ?? [];
  // Positive = your co-parent owes you. Tracking only — no money moves through Ambodo.
  const balance = list.filter((e) => e.status === 'open')
    .reduce((sum, e) => sum + (e.paidBy === meId ? 1 : -1) * Math.round((e.amount * e.split) / 100), 0);
  const shown = useCountUp(Math.abs(balance));
  const otherName = other?.name ?? t('your co-parent');

  async function settle(e: Expense) {
    if (!pro) return router.push('/plan');
    try {
      await api(`/expenses/${e.id}/settle`, { method: 'POST' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(t('Marked settled. Nice teamwork.'));
      reload();
    } catch (err) { toast((err as Error).message); }
  }

  const rows = list.filter((e) => e.status === tab);
  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <T v="title">{t('Expenses')}</T>
      <Animated.View entering={FadeInDown.springify().damping(15)}
        style={[st.hero, { backgroundImage: `linear-gradient(140deg, ${c.text}, ${tint(c.text, 0.82)})` }]}>
        <Text style={[st.heroLabel, { color: tint(c.bg, 0.7) }]}>
          {balance > 0 ? t('{name} OWES YOU', { name: otherName.toUpperCase() }) : balance < 0 ? t('YOU OWE {name}', { name: otherName.toUpperCase() }) : t('BALANCE')}
        </Text>
        <Text style={[st.heroAmount, { color: c.bg }]}>{!data ? '…' : balance === 0 ? t('All square') : money(shown, cur)}</Text>
        <Text style={[st.heroSub, { color: tint(c.bg, 0.7) }]}>
          {data ? `${t('{n} open', { n: list.filter((e) => e.status === 'open').length })} · ` : ''}{t('splits are tracked, never charged')}
        </Text>
      </Animated.View>

      {!pro && (
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Tap onPress={() => router.push('/plan')} style={[st.upsell, { backgroundColor: tint(c.sun, 0.14), borderColor: tint(c.sun, 0.4) }]}>
            <Icon ios="sparkles" android="auto_awesome" size={22} color={c.sun} />
            <View style={{ flex: 1 }}>
              <T v="strong">{t('Split it. Settle it. Done.')}</T>
              <T v="small" muted>{t('Expenses are part of Ambodo Family — one plan covers both homes.')}</T>
            </View>
            <Icon ios="chevron.right" android="chevron_right" size={14} color={c.muted} />
          </Tap>
        </Animated.View>
      )}

      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Chip label={t('Open')} on={tab === 'open'} onPress={() => setTab('open')} />
          <Chip label={t('Settled')} on={tab === 'settled'} onPress={() => setTab('settled')} />
        </Row>
        <Button title={t('Add')} kind="accent" style={{ height: 40, paddingHorizontal: 16 }} onPress={() => router.push(pro ? '/expense' : '/plan')}
          icon={<Icon ios={pro ? 'plus' : 'lock.fill'} android={pro ? 'add' : 'lock'} size={16} color="#fff" />} />
      </Row>

      {rows.map((e, i) => {
        const [ios, android] = CATEGORY_ICON[e.category] ?? CATEGORY_ICON.other;
        const mine = e.paidBy === meId;
        return (
          <Animated.View key={e.id} entering={FadeInDown.delay(i * 50)} layout={LinearTransition}>
            <Card style={{ gap: 12 }}>
              <Row style={{ gap: 14 }}>
                <View style={[st.icon, { backgroundColor: tint(mine ? c.me : c.them, 0.14) }]}>
                  <Icon ios={ios} android={android} size={20} color={mine ? c.me : c.them} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="strong">{e.title}</T>
                  <T v="small" muted>{mine ? t('You paid') : t('{name} paid', { name: nameOf(e.paidBy) })} · {relative(ymd(new Date(e.at)))}</T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="strong">{money(e.amount, cur)}</T>
                  <T v="small" muted>{mine ? t('{pct}% from {name}', { pct: e.split, name: otherName }) : t('{pct}% from you', { pct: e.split })}</T>
                </View>
              </Row>
              {e.status === 'open' && e.split > 0 && (
                <Button title={t('Settle {amount}', { amount: money(Math.round((e.amount * e.split) / 100), cur) })} kind="soft" style={{ height: 44 }} onPress={() => settle(e)} />
              )}
            </Card>
          </Animated.View>
        );
      })}
      {data && !rows.length && (
        <T muted style={{ textAlign: 'center', marginTop: 20 }}>
          {tab === 'open' ? t('Nothing open. Log a receipt when it happens — it’s easier than remembering.') : t('Settled expenses show up here.')}
        </T>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { borderRadius: 30, padding: 22, gap: 6, boxShadow: '0 18px 40px rgba(20,26,51,0.18)' },
  heroLabel: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.2 },
  heroAmount: { fontFamily: font.display, fontSize: 46, lineHeight: 54, letterSpacing: -1 },
  heroSub: { fontFamily: font.semi, fontSize: 13 },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  upsell: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, borderWidth: 1 },
});

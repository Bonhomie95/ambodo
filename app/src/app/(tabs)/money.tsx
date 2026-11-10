import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Button, Card, Chip, Icon, Row, Screen, T, toast } from '@/components/ui';
import { api, type Expense } from '@/lib/api';
import { relative, ymd } from '@/lib/dates';
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
  const { meId, other, nameOf } = useSession();
  const [tab, setTab] = useState<'open' | 'settled'>('open');
  const { data, reload, loading } = useLoad(() => api<Expense[]>('/expenses'));
  const list = data ?? [];
  // Positive = your co-parent owes you. Tracking only — no money moves through Ambodo.
  const balance = list.filter((e) => e.status === 'open')
    .reduce((sum, e) => sum + (e.paidBy === meId ? 1 : -1) * Math.round((e.amount * e.split) / 100), 0);
  const shown = useCountUp(Math.abs(balance));
  const otherName = other?.name ?? 'your co-parent';

  async function settle(e: Expense) {
    try {
      await api(`/expenses/${e.id}/settle`, { method: 'POST' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('Marked settled. Nice teamwork.');
      reload();
    } catch (err) { toast((err as Error).message); }
  }

  const rows = list.filter((e) => e.status === tab);
  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <T v="title">Expenses</T>
      <Animated.View entering={FadeInDown.springify().damping(15)}
        style={[st.hero, { backgroundImage: `linear-gradient(140deg, ${c.text}, ${tint(c.text, 0.82)})` }]}>
        <Text style={[st.heroLabel, { color: tint(c.bg, 0.7) }]}>
          {balance > 0 ? `${otherName.toUpperCase()} OWES YOU` : balance < 0 ? `YOU OWE ${otherName.toUpperCase()}` : 'BALANCE'}
        </Text>
        <Text style={[st.heroAmount, { color: c.bg }]}>{balance === 0 ? 'All square' : money(shown)}</Text>
        <Text style={[st.heroSub, { color: tint(c.bg, 0.7) }]}>
          {list.filter((e) => e.status === 'open').length} open · splits are tracked, never charged
        </Text>
      </Animated.View>

      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Chip label="Open" on={tab === 'open'} onPress={() => setTab('open')} />
          <Chip label="Settled" on={tab === 'settled'} onPress={() => setTab('settled')} />
        </Row>
        <Button title="Add" kind="accent" style={{ height: 40, paddingHorizontal: 16 }} onPress={() => router.push('/expense')}
          icon={<Icon ios="plus" android="add" size={16} color="#fff" />} />
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
                  <T v="small" muted>{nameOf(e.paidBy)} paid · {relative(ymd(new Date(e.at)))}</T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="strong">{money(e.amount)}</T>
                  <T v="small" muted>{e.split}% {mine ? `from ${otherName}` : 'from you'}</T>
                </View>
              </Row>
              {e.status === 'open' && e.split > 0 && (
                <Button title={`Settle ${money(Math.round((e.amount * e.split) / 100))}`} kind="soft" style={{ height: 44 }} onPress={() => settle(e)} />
              )}
            </Card>
          </Animated.View>
        );
      })}
      {data && !rows.length && (
        <T muted style={{ textAlign: 'center', marginTop: 20 }}>
          {tab === 'open' ? 'Nothing open. Log a receipt when it happens — it’s easier than remembering.' : 'Settled expenses show up here.'}
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
});

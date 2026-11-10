import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, PanResponder, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { MonthGrid } from '@/components/month';
import { SwapCard } from '@/components/swap-card';
import { Button, Card, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { api, calendarFeedUrl, type CalEvent, type Day, type Swap } from '@/lib/api';
import { monthGrid, nice, parse, today } from '@/lib/dates';
import { KIND_ICON } from '@/lib/meta';
import { patternName } from '@/lib/patterns';
import { useLoad, useSession } from '@/lib/session';
import { tint, useColors } from '@/lib/theme';

export default function Calendar() {
  const c = useColors();
  const { meId, other, family, nameOf } = useSession();
  const now = parse(today());
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth(), dir: 0 });
  const [selected, setSelected] = useState(today());
  const grid = monthGrid(view.y, view.m);
  const from = grid[0];
  const to = grid[grid.length - 1];

  const { data, reload, loading } = useLoad(async () => {
    const [days, events, swaps] = await Promise.all([
      api<Day[]>(`/custody?from=${from}&to=${to}`), api<CalEvent[]>(`/events?from=${from}&to=${to}`), api<Swap[]>('/swaps'),
    ]);
    return { days, events, swaps };
  }, from);

  const shift = (dir: number) => {
    const d = new Date(view.y, view.m + dir, 1);
    setView({ y: d.getFullYear(), m: d.getMonth(), dir });
  };
  const [pan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 60) shift(g.dx < 0 ? 1 : -1); },
  }));

  const custody = Object.fromEntries((data?.days ?? []).map((d) => [d.date, d.parent]));
  const dots: Record<string, number> = {};
  for (const e of data?.events ?? []) dots[e.date] = (dots[e.date] ?? 0) + 1;
  const dayEvents = (data?.events ?? []).filter((e) => e.date === selected);
  const who = custody[selected];
  const swaps = (data?.swaps ?? []).slice(0, 6);

  async function subscribe() {
    if (!family) return;
    const url = calendarFeedUrl(family.ics);
    if (await Linking.canOpenURL(url).catch(() => false)) Linking.openURL(url);
    else Share.share({ message: `Subscribe to our Ambodo calendar: ${url}`, url });
  }

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T v="label">{family ? patternName(family.schedule.pattern) : ''}</T>
          <Animated.View key={`${view.y}-${view.m}`} entering={FadeIn.duration(220)}>
            <T v="title">{new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</T>
          </Animated.View>
        </View>
        <Row style={{ gap: 6 }}>
          <Tap onPress={() => shift(-1)} style={[st.nav, { backgroundColor: c.soft }]} accessibilityLabel="Previous month"><Icon ios="chevron.left" android="chevron_left" size={18} /></Tap>
          <Tap onPress={() => shift(1)} style={[st.nav, { backgroundColor: c.soft }]} accessibilityLabel="Next month"><Icon ios="chevron.right" android="chevron_right" size={18} /></Tap>
        </Row>
      </Row>

      <Card style={{ padding: 10 }}>
        <Animated.View key={`${view.y}-${view.m}`} entering={view.dir > 0 ? SlideInRight.springify().damping(18) : view.dir < 0 ? SlideInLeft.springify().damping(18) : FadeIn}
          {...pan.panHandlers}>
          <MonthGrid year={view.y} month={view.m} custody={custody} meId={meId} dots={dots} selected={[selected]} onPress={setSelected} />
        </Animated.View>
        <Row style={{ justifyContent: 'center', gap: 18, paddingTop: 6 }}>
          <Row style={{ gap: 6 }}><View style={[st.key, { backgroundColor: c.me }]} /><T v="small">You</T></Row>
          <Row style={{ gap: 6 }}><View style={[st.key, { backgroundColor: c.them }]} /><T v="small">{other?.name ?? 'Co-parent'}</T></Row>
          {(view.y !== now.getFullYear() || view.m !== now.getMonth()) && (
            <Tap onPress={() => { setView({ y: now.getFullYear(), m: now.getMonth(), dir: 0 }); setSelected(today()); }}><T v="small" color={c.me}>Today</T></Tap>
          )}
        </Row>
      </Card>

      <Animated.View key={selected} entering={FadeInDown.springify().damping(16)}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h2">{nice(selected)}</T>
            {who !== undefined && (
              <View style={[st.who, { backgroundColor: tint(who === meId ? c.me : c.them, 0.16) }]}>
                <T v="small" color={who === meId ? c.me : c.them}>{who === meId ? 'With you' : who ? `With ${nameOf(who)}` : 'Not set'}</T>
              </View>
            )}
          </Row>
          {dayEvents.map((e) => {
            const [ios, android] = KIND_ICON[e.kind] ?? KIND_ICON.other;
            return (
              <Row key={e.id}>
                <Icon ios={ios} android={android} size={18} color={c.muted} />
                <T style={{ flex: 1 }}>{e.title}</T>
                {e.time && <T v="small" muted>{e.time}</T>}
              </Row>
            );
          })}
          {!dayEvents.length && <T muted>No plans yet.</T>}
          <Row>
            <Button title="Add event" kind="soft" style={{ flex: 1, height: 46 }} onPress={() => router.push({ pathname: '/event', params: { date: selected } })} />
            <Button title="Ask to swap" kind="soft" style={{ flex: 1, height: 46 }} disabled={!other}
              onPress={() => router.push({ pathname: '/swap', params: { date: selected } })} />
          </Row>
        </Card>
      </Animated.View>

      {!!swaps.length && <T v="label">Swap requests</T>}
      {swaps.map((s, i) => <SwapCard key={s.id} swap={s} onChange={reload} index={i} />)}

      <Tap onPress={subscribe}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Icon ios="calendar.badge.clock" android="event_repeat" size={24} color={c.them} />
          <View style={{ flex: 1 }}>
            <T v="strong">Sync to your calendar</T>
            <T v="small" muted>Custody days & events in Apple or Google Calendar.</T>
          </View>
          <Icon ios="chevron.right" android="chevron_right" size={16} color={c.muted} />
        </Card>
      </Tap>
    </Screen>
  );
}

const st = StyleSheet.create({
  nav: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  key: { width: 10, height: 10, borderRadius: 5 },
  who: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
});

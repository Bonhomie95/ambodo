import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SwapCard } from '@/components/swap-card';
import { Avatar, Button, Card, Icon, Row, Screen, T, Tap, toast } from '@/components/ui';
import { api, type CalEvent, type Day, type Swap } from '@/lib/api';
import { addDays, greeting, parse, relative, today, weekday } from '@/lib/dates';
import { useLoad, useSession } from '@/lib/session';
import { KIND_ICON, shareInvite } from '@/lib/meta';
import { brand, font, tint, useColors } from '@/lib/theme';

export default function Today() {
  const c = useColors();
  const { user, family, meId, other, nameOf } = useSession();
  const t = today();
  const { data, reload, loading } = useLoad(async () => {
    const [days, events, swaps] = await Promise.all([
      api<Day[]>(`/custody?from=${addDays(t, -21)}&to=${addDays(t, 45)}`),
      api<CalEvent[]>(`/events?from=${t}&to=${addDays(t, 30)}`),
      api<Swap[]>('/swaps'),
    ]);
    return { days, events, swaps };
  });

  const days = data?.days ?? [];
  const i = days.findIndex((d) => d.date === t);
  const now = days[i];
  let start = i;
  let end = i;
  if (now) {
    while (start > 0 && days[start - 1].parent === now.parent) start--;
    while (end < days.length - 1 && days[end + 1].parent === now.parent) end++;
  }
  const next = now && end + 1 < days.length ? days[end + 1] : null;
  const mine = now?.parent === meId;
  const hero = !now?.parent ? [brand.ink, brand.ink2] : mine ? ['#FF6B5B', '#FF9A76'] : ['#0E8C80', '#2EC4B6'];
  const blockLen = end - start + 1;
  const dayN = i - start + 1;
  const pending = (data?.swaps ?? []).filter((s) => s.status === 'pending');

  async function handoff(kind: 'dropoff' | 'pickup') {
    try {
      await api('/checkins', { body: { kind } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(`${kind === 'dropoff' ? 'Drop-off' : 'Pickup'} logged · ${new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`);
    } catch (e) { toast((e as Error).message); }
  }

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T v="label">{parse(t).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</T>
          <T v="title">{greeting()}, {user?.name}</T>
        </View>
        <Tap onPress={() => router.navigate('/(tabs)/more')} accessibilityLabel="Family"><Avatar name={user?.name ?? '?'} color={c.me} size={44} /></Tap>
      </Row>

      <Animated.View entering={FadeInDown.springify().damping(15)} style={[st.hero, { backgroundImage: `linear-gradient(135deg, ${hero[0]}, ${hero[1]})` }]}>
        <View style={[st.heroGlow, { backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)' }]} />
        <Text style={st.heroLabel}>TODAY THE KIDS ARE</Text>
        <Text style={st.heroTitle} adjustsFontSizeToFit numberOfLines={1}>
          {!now ? '…' : !now.parent ? 'not set yet' : mine ? 'with you' : `with ${nameOf(now.parent)}`}
        </Text>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          {family?.kids.map((k) => <View key={k.id} style={st.kid}><Text style={st.kidText}>{k.name}</Text></View>)}
        </Row>
        {next && (
          <View style={{ gap: 8, marginTop: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={st.heroSmall}>Day {dayN} of {blockLen}</Text>
              <Text style={st.heroSmall}>Handoff {relative(next.date).toLowerCase()} → {next.parent === meId ? 'you' : nameOf(next.parent)}</Text>
            </Row>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: Math.min(blockLen, 14) }, (_, k) => (
                <Animated.View key={k} entering={ZoomIn.delay(250 + k * 60)}
                  style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: k < dayN ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </View>
          </View>
        )}
      </Animated.View>

      <Row style={{ gap: 6 }}>
        {days.slice(Math.max(i, 0), Math.max(i, 0) + 7).map((d, k) => {
          const col = d.parent === meId ? c.me : d.parent ? c.them : c.muted;
          return (
            <Animated.View key={d.date} entering={ZoomIn.delay(100 + k * 45).springify()} style={[st.dayPill, { backgroundColor: tint(col, 0.16), borderColor: k === 0 ? col : 'transparent' }]}>
              <Text style={[st.dayName, { color: col }]}>{weekday(d.date).slice(0, 2)}</Text>
              <Text style={[st.dayNum, { color: c.text }]}>{parse(d.date).getDate()}</Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: col }} />
            </Animated.View>
          );
        })}
      </Row>

      {!other && family && (
        <Animated.View entering={FadeInDown.delay(120)}>
          <Card style={{ backgroundColor: tint(c.them, 0.1), borderColor: tint(c.them, 0.3) }}>
            <Row>
              <Animated.View style={{ animationName: { from: { transform: [{ scale: 1 }] }, to: { transform: [{ scale: 1.12 }] } }, animationDuration: 900, animationIterationCount: 'infinite', animationDirection: 'alternate' }}>
                <Icon ios="person.badge.plus" android="person_add" size={26} color={c.them} />
              </Animated.View>
              <T v="strong" style={{ flex: 1 }}>Bring your co-parent in</T>
            </Row>
            <T muted>Share code <Text style={{ fontFamily: font.heavy, color: c.text }}>{family.invite}</Text>. Ambodo works best with both homes on it.</T>
            <Button title="Share invite" kind="primary" style={{ height: 48 }} onPress={() => shareInvite(family.invite, user?.name)} />
          </Card>
        </Animated.View>
      )}

      {pending.map((s, k) => <SwapCard key={s.id} swap={s} onChange={reload} index={k} />)}

      <Animated.View entering={FadeInDown.delay(160)}>
        <Card>
          <T v="label">Handoff</T>
          <T v="h2">Log it while it happens.</T>
          <Row>
            <Button title="Dropped off" kind="soft" style={{ flex: 1, height: 48 }} onPress={() => handoff('dropoff')} />
            <Button title="Picked up" kind="soft" style={{ flex: 1, height: 48 }} onPress={() => handoff('pickup')} />
          </Row>
        </Card>
      </Animated.View>

      <Row style={{ gap: 10 }}>
        {([['New event', 'calendar.badge.plus', 'event', '/event'], ['Add expense', 'plus.circle.fill', 'add_card', '/expense'], ['Swap days', 'arrow.triangle.swap', 'swap_horiz', '/swap']] as const)
          .map(([label, ios, android, href], k) => (
            <Animated.View key={label} entering={FadeInDown.delay(200 + k * 60)} style={{ flex: 1 }}>
              <Tap onPress={() => router.push(href)} style={[st.quick, { backgroundColor: c.card, borderColor: c.line }]}>
                <Icon ios={ios} android={android} size={24} color={[c.me, c.sun, c.them][k]} />
                <T v="small">{label}</T>
              </Tap>
            </Animated.View>
          ))}
      </Row>

      <View style={{ gap: 10 }}>
        <T v="label">Coming up</T>
        {(data?.events ?? []).slice(0, 4).map((e, k) => {
          const [ios, android] = KIND_ICON[e.kind] ?? KIND_ICON.other;
          return (
            <Animated.View key={e.id} entering={FadeInDown.delay(240 + k * 50)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                <View style={[st.eventIcon, { backgroundColor: c.soft }]}><Icon ios={ios} android={android} size={20} /></View>
                <View style={{ flex: 1 }}>
                  <T v="strong">{e.title}</T>
                  <T v="small" muted>{relative(e.date)}{e.time ? ` · ${e.time}` : ''}</T>
                </View>
              </Card>
            </Animated.View>
          );
        })}
        {data && !data.events.length && <T muted>Nothing on the books. Enjoy the quiet. ☀️</T>}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { borderRadius: 32, padding: 22, gap: 10, overflow: 'hidden', boxShadow: '0 18px 40px rgba(20,26,51,0.18)' },
  heroGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -80, top: -90 },
  heroLabel: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.2, color: 'rgba(255,255,255,0.85)' },
  heroTitle: { fontFamily: font.display, fontSize: 44, lineHeight: 50, color: '#FFFFFF', letterSpacing: -0.8 },
  heroSmall: { fontFamily: font.bold, fontSize: 13, color: '#FFFFFF' },
  kid: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  kidText: { fontFamily: font.bold, fontSize: 14, color: '#FFFFFF' },
  dayPill: { flex: 1, borderRadius: 18, paddingVertical: 10, alignItems: 'center', gap: 4, borderWidth: 2 },
  dayName: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 0.6 },
  dayNum: { fontFamily: font.display, fontSize: 19 },
  quick: { borderRadius: 22, paddingVertical: 16, alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth },
  eventIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

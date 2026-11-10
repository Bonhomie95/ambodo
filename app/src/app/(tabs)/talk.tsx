import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mark } from '@/components/brand';
import { Button, Icon, Row, T, Tap, toast } from '@/components/ui';
import { api, needsPlan, unreadBadge, type Message } from '@/lib/api';
import { relative, time, ymd } from '@/lib/dates';
import { shareInvite } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { font, tint, useColors } from '@/lib/theme';
import { checkTone, type Tone } from '@/lib/tone';

const dayOf = (iso: string) => ymd(new Date(iso));

export default function Talk() {
  const c = useColors();
  const { meId, other, family, user, pro } = useSession();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [review, setReview] = useState<Tone | null>(null);
  const [sending, setSending] = useState(false);
  const lastAt = useRef<string | undefined>(undefined);
  useEffect(() => { lastAt.current = msgs.at(-1)?.at; }, [msgs]);

  // ponytail: 4s polling while the tab is open (full refresh every 5th tick keeps "Seen" fresh); swap for websockets at scale
  useFocusEffect(useCallback(() => {
    let alive = true;
    let n = 0;
    const tick = async () => {
      const full = n++ % 5 === 0 || !lastAt.current;
      try {
        const list = await api<Message[]>(full ? '/messages' : `/messages?after=${encodeURIComponent(lastAt.current!)}`);
        if (!alive) return;
        setMsgs((prev) => (full ? list : list.length ? [...prev, ...list.filter((m) => !prev.some((p) => p.id === m.id))] : prev));
        setLoaded(true);
        if (list.some((m) => m.author !== meId)) api('/messages/read', { method: 'POST' }).then(() => unreadBadge.refresh(), () => {});
      } catch { /* offline: keep what we have */ }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [meId]));

  // Free parents get a few calmer rewrites a month; the API meters them.
  async function sendCalmer(calmer: string) {
    try {
      const { left } = await api<{ left: number | null }>('/tone/rewrite', { method: 'POST' });
      await send(calmer, true);
      if (left !== null) toast(left ? `${left} free rewrite${left === 1 ? '' : 's'} left this month` : 'That was your last free rewrite this month');
    } catch (e) {
      if (!needsPlan(e)) return toast((e as Error).message);
      toast('You’ve used this month’s free rewrites');
      router.push('/plan');
    }
  }

  async function send(body: string, force = false) {
    const t = checkTone(body);
    if (!force && t.level !== 'calm') {
      Keyboard.dismiss(); // give the pause card the whole screen
      setReview(t);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSending(true);
    try {
      const m = await api<Message>('/messages', { body: { text: body.trim() } });
      setMsgs((p) => [...p, m]);
      setText('');
      setReview(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const live = text.trim() ? checkTone(text) : null;
  const toneColor = (l: Tone['level']) => ({ calm: c.good, tense: c.sun, heated: c.danger })[l];
  const data = [...msgs].reverse();
  const lastMine = msgs.findLast((m) => m.author === meId)?.id;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Row style={[st.header, { borderColor: c.line }]}>
          <View style={{ flex: 1 }}>
            <T v="title">Talk</T>
            <T v="small" muted>{other ? `with ${other.name}` : 'Waiting for your co-parent'}</T>
          </View>
          <Tap onPress={() => router.push('/records')} style={[st.sealed, { backgroundColor: tint(c.them, 0.14) }]} accessibilityLabel="Sealed record. Open records">
            <Icon ios="lock.fill" android="lock" size={14} color={c.them} />
            <Text style={{ fontFamily: font.heavy, fontSize: 12, color: c.them }}>SEALED</Text>
          </Tap>
        </Row>

        <FlatList
          inverted
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 6, flexGrow: 1 }}
          keyboardDismissMode="interactive"
          ListEmptyComponent={loaded ? (
            <View style={[st.empty, { transform: [{ scaleY: -1 }] }]}>
              <Mark size={90} />
              <T v="h2" style={{ textAlign: 'center' }}>{other ? 'Say it kind.\nIt’s on the record.' : 'Talk starts when they join.'}</T>
              <T muted style={{ textAlign: 'center' }}>
                {other ? 'Every message is timestamped and sealed — nobody can edit or delete it.' : 'Share your family code so your co-parent can join.'}
              </T>
              {!other && family && <Button title={`Share code ${family.invite}`} kind="accent" onPress={() => shareInvite(family.invite, user?.name)} />}
            </View>
          ) : undefined}
          renderItem={({ item: m, index }) => {
            const mine = m.author === meId;
            const older = data[index + 1];
            const newDay = !older || dayOf(older.at) !== dayOf(m.at);
            return (
              <Animated.View entering={FadeInUp.springify().damping(16)} layout={LinearTransition}>
                {newDay && <T v="label" style={{ textAlign: 'center', marginVertical: 12 }}>{relative(dayOf(m.at))}</T>}
                <Tap haptic={false} onLongPress={() => { Haptics.selectionAsync(); toast(`Sealed · #${m.hash.slice(0, 8)}`); }}
                  style={[st.bubble, mine
                    ? { alignSelf: 'flex-end', backgroundColor: c.me, borderBottomRightRadius: 6 }
                    : { alignSelf: 'flex-start', backgroundColor: c.card, borderBottomLeftRadius: 6, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
                  <Text style={[st.msg, { color: mine ? '#FFFFFF' : c.text }]}>{m.text}</Text>
                  <Text style={[st.meta, { color: mine ? 'rgba(255,255,255,0.75)' : c.muted }]}>{time(m.at)}</Text>
                </Tap>
                {m.id === lastMine && <T v="small" muted style={{ alignSelf: 'flex-end', marginTop: 2 }}>{m.seen ? 'Seen' : 'Delivered'}</T>}
              </Animated.View>
            );
          }}
        />

        {review && (
          <Animated.View entering={FadeInDown.springify().damping(15)} exiting={FadeOutDown} style={[st.review, { backgroundColor: c.card, borderColor: tint(toneColor(review.level), 0.55) }]}>
            <Row>
              <Icon ios="wind" android="air" size={20} color={toneColor(review.level)} />
              <T v="strong" style={{ flex: 1 }}>Breathe. This might land hard.</T>
              <Tap onPress={() => setReview(null)} accessibilityLabel="Close"><Icon ios="xmark" android="close" size={16} color={c.muted} /></Tap>
            </Row>
            {review.issues.map((i) => <T key={i} v="small" muted>• {i}</T>)}
            {!pro && <T v="small" color={c.sun}>Free plan · 5 calmer rewrites a month</T>}
            {!!review.calmer && (
              <View style={[st.calmer, { backgroundColor: c.soft }]}>
                <T v="label">Calmer version</T>
                <T>{review.calmer}</T>
              </View>
            )}
            <Row>
              <Button title="Send calmer" kind="accent" style={{ flex: 1, height: 46 }} disabled={!review.calmer} loading={sending} onPress={() => sendCalmer(review.calmer)} />
              <Button title="Edit" kind="soft" style={{ height: 46 }} onPress={() => { if (review.calmer) setText(review.calmer); setReview(null); }} />
            </Row>
            <Tap haptic={false} onPress={() => send(text, true)}><T v="small" muted style={{ textAlign: 'center' }}>Send mine anyway</T></Tap>
          </Animated.View>
        )}

        {!!other && (
          <View style={[st.composer, { backgroundColor: c.card, borderColor: c.line }]}>
            <TextInput value={text} onChangeText={setText} placeholder="Keep it brief, kind and clear…" placeholderTextColor={c.muted}
              multiline maxLength={4000} selectionColor={c.me} accessibilityLabel="Message" style={[st.input, { color: c.text }]} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Animated.View style={[st.tone, { backgroundColor: live ? tint(toneColor(live.level), 0.16) : 'transparent', transitionProperty: 'backgroundColor', transitionDuration: 250 }]}>
                {live && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: toneColor(live.level) }} />}
                <Text style={{ fontFamily: font.heavy, fontSize: 11, letterSpacing: 0.8, color: live ? toneColor(live.level) : c.muted }}>
                  {live ? `TONE · ${live.level.toUpperCase()}` : 'TONEGUARD ON'}
                </Text>
              </Animated.View>
              <Tap onPress={() => send(text)} disabled={!text.trim() || sending} accessibilityLabel="Send" style={[st.send, { backgroundColor: c.me }]}>
                <Icon ios="arrow.up" android="arrow_upward" size={20} color="#FFFFFF" />
              </Tap>
            </Row>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sealed: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  bubble: { maxWidth: '82%', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 8, borderRadius: 22 },
  msg: { fontFamily: font.body, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: font.semi, fontSize: 11, alignSelf: 'flex-end', marginTop: 3 },
  review: { marginHorizontal: 14, marginBottom: 8, padding: 16, borderRadius: 24, borderWidth: 1.5, gap: 8, boxShadow: '0 10px 30px rgba(20,26,51,0.12)' },
  calmer: { borderRadius: 16, padding: 12, gap: 4 },
  composer: { marginHorizontal: 12, marginBottom: 8, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 10, gap: 6, boxShadow: '0 6px 24px rgba(20,26,51,0.08)' },
  input: { fontFamily: font.body, fontSize: 16, maxHeight: 120, paddingHorizontal: 8, paddingTop: 6 },
  tone: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

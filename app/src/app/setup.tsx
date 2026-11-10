import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, Icon, Row, T, Tap } from '@/components/ui';
import { api, type Family } from '@/lib/api';
import { addDays, monday, nice, today } from '@/lib/dates';
import { shareInvite } from '@/lib/meta';
import { PATTERNS } from '@/lib/patterns';
import { useSession } from '@/lib/session';
import { font, tint, useColors } from '@/lib/theme';

export default function Setup() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user, setFamily, signOut } = useSession();
  const [mode, setMode] = useState<'new' | 'join'>('new');
  const [kids, setKids] = useState<string[]>([]);
  const [kidName, setKidName] = useState('');
  const [pattern, setPattern] = useState<string>('2-2-3');
  const thisMonday = monday(today());
  const [anchor, setAnchor] = useState(thisMonday);
  const [youFirst, setYouFirst] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [made, setMade] = useState<Family | null>(null);

  const addKid = () => {
    const n = kidName.trim();
    if (n && !kids.includes(n)) { setKids([...kids, n]); Haptics.selectionAsync(); }
    setKidName('');
  };

  async function run(fn: () => Promise<Family>, after: (f: Family) => void) {
    setBusy(true); setErr('');
    try { const f = await fn(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); after(f); }
    catch (e) { setErr((e as Error).message); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
    finally { setBusy(false); }
  }
  const create = () => run(
    () => api<Family>('/family', { body: { kids: [...kids, kidName.trim()].filter(Boolean).map((name) => ({ name })), pattern, anchor, youFirst } }),
    (f) => setMade(f),
  );
  const join = () => run(() => api<Family>('/family/join', { body: { code } }), (f) => { setFamily(f); router.replace('/(tabs)'); });

  if (made) {
    return (
      <View style={[st.done, { backgroundColor: c.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={[st.badge, { backgroundColor: tint(c.them, 0.16) }]}>
          <Icon ios="house.and.flag.fill" android="family_restroom" size={44} color={c.them} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150)} style={{ gap: 10, alignItems: 'center' }}>
          <T v="title" style={{ textAlign: 'center' }}>Your family is ready.</T>
          <T muted style={{ textAlign: 'center' }}>Send this code to your co-parent. One code, both homes.</T>
        </Animated.View>
        <Animated.View entering={ZoomIn.delay(300).springify()}>
          <Text selectable style={[st.code, { color: c.text, backgroundColor: c.card, borderColor: c.line }]}>{made.invite}</Text>
        </Animated.View>
        <View style={{ alignSelf: 'stretch', gap: 12 }}>
          <Button title="Share code" kind="accent" onPress={() => shareInvite(made.invite, user?.name)}
            icon={<Icon ios="square.and.arrow.up" android="share" size={18} color="#fff" />} />
          <Button title="Go to Today" kind="ghost" onPress={() => { setFamily(made); router.replace('/(tabs)'); }} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 22, gap: 20 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="label">Hi {user?.name ?? 'there'}</T>
          <Tap onPress={async () => { await signOut(); router.replace('/welcome'); }} haptic={false}><T v="small" muted>Sign out</T></Tap>
        </Row>
        <T v="hero">Set up your family.</T>
        <Row>
          <Chip label="Start fresh" on={mode === 'new'} onPress={() => setMode('new')} />
          <Chip label="I have a code" on={mode === 'join'} onPress={() => setMode('join')} />
        </Row>

        {mode === 'join' ? (
          <Animated.View key="join" entering={FadeIn} style={{ gap: 16 }}>
            <T muted>Your co-parent shared a 6-character code. Pop it in.</T>
            <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ABC-123" placeholderTextColor={c.muted}
              autoCapitalize="characters" autoCorrect={false} maxLength={7} accessibilityLabel="Invite code"
              style={[st.code, { color: c.text, backgroundColor: c.card, borderColor: c.line }]} />
            <Button title="Join family" kind="accent" loading={busy} disabled={code.replace(/[^A-Z0-9]/gi, '').length < 6} onPress={join} />
          </Animated.View>
        ) : (
          <Animated.View key="new" entering={FadeIn} style={{ gap: 22 }}>
            <View style={{ gap: 10 }}>
              <Field label="Your kids" value={kidName} onChangeText={setKidName} placeholder="Name, then return" onSubmitEditing={addKid}
                returnKeyType="done" submitBehavior="submit" autoCapitalize="words" />
              <Row style={{ flexWrap: 'wrap' }}>
                {kids.map((k) => (
                  <Animated.View key={k} entering={ZoomIn.springify()}>
                    <Chip label={`${k}  ✕`} on color={c.me} onPress={() => setKids(kids.filter((x) => x !== k))} />
                  </Animated.View>
                ))}
                {!!kidName.trim() && <Chip label={`+ Add ${kidName.trim()}`} onPress={addKid} />}
              </Row>
            </View>

            <View style={{ gap: 10 }}>
              <T v="label">Custody schedule</T>
              {PATTERNS.map((p, i) => {
                const on = pattern === p.key;
                return (
                  <Animated.View key={p.key} entering={FadeInDown.delay(i * 50)}>
                    <Tap onPress={() => setPattern(p.key)} accessibilityState={{ selected: on }}>
                      <Card style={{ borderWidth: on ? 2 : StyleSheet.hairlineWidth, borderColor: on ? c.text : c.line }}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <T v="strong">{p.name}</T>
                          {on && <Icon ios="checkmark.circle.fill" android="check_circle" size={20} color={c.text} />}
                        </Row>
                        <T v="small" muted>{p.blurb}</T>
                        <View style={{ flexDirection: 'row', gap: 3 }}>
                          {[...p.seq].map((x, j) => (
                            <View key={j} style={{ flex: 1, height: 10, borderRadius: 3, backgroundColor: (x === 'A') === youFirst ? c.me : c.them, marginRight: j === 6 ? 6 : 0 }} />
                          ))}
                        </View>
                      </Card>
                    </Tap>
                  </Animated.View>
                );
              })}
            </View>

            <View style={{ gap: 10 }}>
              <T v="label">Starts</T>
              <Row style={{ flexWrap: 'wrap' }}>
                <Chip label={`This Monday · ${nice(thisMonday)}`} on={anchor === thisMonday} onPress={() => setAnchor(thisMonday)} />
                <Chip label={`Next Monday · ${nice(addDays(thisMonday, 7))}`} on={anchor === addDays(thisMonday, 7)} onPress={() => setAnchor(addDays(thisMonday, 7))} />
              </Row>
              <T v="label" style={{ marginTop: 6 }}>Who has them first?</T>
              <Row>
                <Chip label="Me" on={youFirst} color={c.me} onPress={() => setYouFirst(true)} />
                <Chip label="My co-parent" on={!youFirst} color={c.them} onPress={() => setYouFirst(false)} />
              </Row>
            </View>

            <Button title="Create our family" kind="accent" loading={busy} disabled={!kids.length && !kidName.trim()} onPress={create} />
          </Animated.View>
        )}
        {!!err && <T v="strong" color={c.danger}>{err}</T>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26, paddingHorizontal: 24 },
  badge: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  code: { fontFamily: font.heavy, fontSize: 40, letterSpacing: 6, textAlign: 'center', paddingVertical: 18, paddingHorizontal: 26, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});

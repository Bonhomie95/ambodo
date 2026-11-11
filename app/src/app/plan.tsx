import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '@/components/brand';
import { Button, Field, Icon, Row, T, Tap, toast } from '@/components/ui';
import { api, openPage, type Family } from '@/lib/api';
import { buy, getOffers, manageUrl, restore, testMode, type Offer } from '@/lib/billing';
import { useSession } from '@/lib/session';
import { brand, font, tint, useColors } from '@/lib/theme';

const store = Platform.OS === 'ios' ? 'Apple Account' : 'Google Play account';

const PERKS: [string, string, string, string][] = [
  ['doc.richtext', 'picture_as_pdf', 'Court-ready PDF records', 'Messages, handoffs, expenses and swaps in one sealed report.'],
  ['wind', 'air', 'Unlimited calmer rewrites', 'ToneGuard turns heat into “let’s figure this out.”'],
  ['creditcard.fill', 'payments', 'Expenses, splits & settle-ups', 'Every receipt logged, every share clear.'],
  ['calendar.badge.clock', 'event_repeat', 'Sync to Apple & Google Calendar', 'Custody days show up where you already look.'],
  ['person.2.fill', 'group', 'One plan for both homes', 'Whoever pays, you both get everything.'],
  ['bolt.heart.fill', 'support_agent', 'Priority support', 'Real humans, fast — when it matters most.'],
];

export default function Plan() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { family, other, setFamily, refresh } = useSession();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [period, setPeriod] = useState<Offer['period']>('annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | 'waiver' | null>(null);
  const [done, setDone] = useState(false);
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [reason, setReason] = useState('');
  // Offers (and so the buy button) appear only once the plan is fresh — the co-parent may have bought it already.
  useEffect(() => { Promise.all([getOffers(), refresh()]).then(([o]) => setOffers(o)); }, [refresh]);
  // Android: a dark strip fades in behind the status bar once the hero scrolls away, so its light icons stay readable.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const scrim = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [80, 220], [0, 1], 'clamp') }));

  const plan = family?.plan;
  const chosen = offers.find((o) => o.period === period) ?? offers[0];
  const annual = offers.find((o) => o.period === 'annual');
  const monthly = offers.find((o) => o.period === 'monthly');
  const save = annual?.amount && monthly?.amount ? Math.round((1 - annual.amount / (monthly.amount * 12)) * 100) : null;

  async function run(kind: 'buy' | 'restore' | 'waiver', fn: () => Promise<Family | null>, ok: string) {
    setBusy(kind);
    try {
      const f = await fn();
      if (!f) return; // cancelled the store sheet
      setFamily(f);
      if (f.plan.active) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDone(true);
        setTimeout(() => router.back(), 1600);
      } else toast(ok);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // Android draws the paywall full-screen under the status bar, over a dark hero.
  const lightBar = Platform.OS === 'android' ? <StatusBar style="light" /> : null;

  if (done) {
    return (
      <View style={[st.done, { backgroundImage: `linear-gradient(160deg, ${brand.ink2}, ${brand.ink})` }]}>
        {lightBar}
        <Animated.View entering={ZoomIn.springify().damping(10)}><Mark size={150} animated /></Animated.View>
        <Animated.Text entering={FadeInDown.delay(500)} style={st.doneTitle}>Welcome to{'\n'}Ambodo Family.</Animated.Text>
        <Animated.Text entering={FadeIn.delay(800)} style={st.doneSub}>Both homes are unlocked.</Animated.Text>
      </View>
    );
  }

  return (
    // iOS: the scroll view moves the waiver field above the keyboard; Android needs the padding.
    <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {lightBar}
        <View style={[st.hero, { paddingTop: 22 + (Platform.OS === 'android' ? insets.top : 0), backgroundImage: `linear-gradient(160deg, ${brand.ink2}, ${brand.ink})` }]}>
          <View style={[st.glow, { backgroundImage: `radial-gradient(circle, ${tint(brand.sun, 0.35)} 0%, ${tint(brand.sun, 0)} 70%)` }]} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Mark size={70} animated />
            <Tap onPress={() => router.back()} accessibilityLabel="Close" style={st.close}>
              <Icon ios="xmark" android="close" size={15} color="#FFFFFF" />
            </Tap>
          </Row>
          <Text style={st.kicker}>AMBODO FAMILY</Text>
          <Animated.Text entering={FadeInDown.delay(150).springify()} style={st.title}>One plan.{'\n'}Both homes.</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250)} style={st.sub}>
            Covers you and {other?.name ?? 'your co-parent'} — other apps bill each parent separately. We don’t.
          </Animated.Text>
        </View>

        <View style={{ padding: 22, gap: 16 }}>
          {plan?.active ? (
            <Animated.View entering={FadeInDown} style={[st.active, { backgroundColor: tint(c.good, 0.12), borderColor: tint(c.good, 0.4) }]}>
              <Row><Icon ios="checkmark.seal.fill" android="verified" size={22} color={c.good} /><T v="strong">You’re on Ambodo Family</T></Row>
              <T v="small" muted>
                {plan.source === 'waiver' ? 'Fee waiver approved — no charge.' : plan.expiresAt ? `Covered through ${new Date(plan.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.` : ''}
                {plan.source === 'dev' ? ' Test plan — no real charge.' : ''}
              </T>
              {plan.source === 'store' && <Button title="Manage subscription" kind="soft" style={{ height: 46 }} onPress={() => Linking.openURL(manageUrl)} />}
              {plan.source === 'dev' && testMode && (
                <Button title="End test plan" kind="soft" style={{ height: 46 }}
                  onPress={async () => { setFamily(await api<Family>('/billing/dev-grant', { body: { period: 'off' } })); toast('Back on Free.'); }} />
              )}
            </Animated.View>
          ) : null}

          {PERKS.map(([ios, android, title, sub], i) => (
            <Animated.View key={title} entering={FadeInDown.delay(300 + i * 70).springify()}>
              <Row style={{ gap: 14, alignItems: 'flex-start' }}>
                <View style={[st.perk, { backgroundColor: tint([c.them, c.sun, c.me][i % 3], 0.15) }]}>
                  <Icon ios={ios} android={android} size={19} color={[c.them, c.sun, c.me][i % 3]} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="strong">{title}</T>
                  <T v="small" muted>{sub}</T>
                </View>
              </Row>
            </Animated.View>
          ))}

          {!plan?.active && (
            <>
              <View style={{ gap: 10, marginTop: 6 }}>
                {offers.map((o) => {
                  const on = o.period === chosen?.period;
                  return (
                    <Tap key={o.period} onPress={() => setPeriod(o.period)} accessibilityState={{ selected: on }} accessibilityLabel={`${o.period} plan ${o.price}`}
                      style={[st.option, { backgroundColor: c.card, borderColor: on ? c.text : c.line, borderWidth: on ? 2 : 1 }]}>
                      <View style={[st.radio, { borderColor: on ? c.text : c.line }]}>{on && <View style={[st.dot, { backgroundColor: c.text }]} />}</View>
                      <View style={{ flex: 1 }}>
                        <T v="strong">{o.period === 'annual' ? 'Yearly' : 'Monthly'}</T>
                        <T v="small" muted>{o.period === 'annual' ? `${o.price} a year${o.perMonth ? ` · ${o.perMonth}/mo` : ''}` : `${o.price} a month`}</T>
                      </View>
                      {o.period === 'annual' && save ? (
                        <View style={[st.save, { backgroundColor: c.me }]}><Text style={st.saveText}>SAVE {save}%</Text></View>
                      ) : null}
                    </Tap>
                  );
                })}
              </View>

              <Button title={chosen ? `Start Family · ${chosen.price}${chosen.period === 'annual' ? '/yr' : '/mo'}` : 'Start Ambodo Family'} kind="accent"
                loading={busy === 'buy' || !offers.length} disabled={!chosen || !!busy} onPress={() => chosen && run('buy', () => buy(chosen), 'Not active yet — try Restore.')} />

              {testMode && (
                <View style={[st.test, { backgroundColor: tint(c.sun, 0.14) }]}>
                  <Icon ios="testtube.2" android="science" size={16} color={c.sun} />
                  <T v="small" style={{ flex: 1 }}>Test mode — no charge. Add your RevenueCat keys to sell for real.</T>
                </View>
              )}
            </>
          )}

          <Row style={{ justifyContent: 'center', gap: 22 }}>
            <Tap haptic={false} disabled={!!busy} onPress={() => run('restore', restore, 'No purchases to restore on this account.')}>
              <T v="small" color={c.text}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</T>
            </Tap>
            {!plan?.active && family?.plan?.waiver !== 'pending' && (
              <Tap haptic={false} onPress={() => setWaiverOpen(!waiverOpen)}><T v="small" color={c.text}>Need a fee waiver?</T></Tap>
            )}
          </Row>

          {family?.plan?.waiver === 'pending' && <T v="small" muted style={{ textAlign: 'center' }}>Your fee-waiver request is being reviewed.</T>}
          {waiverOpen && family?.plan?.waiver !== 'pending' && (
            <Animated.View entering={FadeInDown} style={{ gap: 10 }}>
              <T v="small" muted>Money shouldn’t stop a family from co-parenting calmly. Tell us briefly — court fee waiver, hardship, or safety.</T>
              <Field label="Your situation" value={reason} onChangeText={setReason} multiline maxLength={500} placeholder="e.g. court fee waiver granted in October" />
              <Button title="Request waiver" kind="soft" loading={busy === 'waiver'} disabled={!reason.trim()}
                onPress={() => run('waiver', () => api<Family>('/billing/waiver', { body: { reason } }), 'Request sent. We’ll reply within 2 days.').then(() => setWaiverOpen(false))} />
            </Animated.View>
          )}

          <T v="small" muted style={{ textAlign: 'center', fontSize: 11, lineHeight: 16 }}>
            Billed to your {store}. Auto-renews at the price above until cancelled. Cancel anytime at least 24 hours before renewal in your {store} settings.{' '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => openPage('terms')}>Terms</Text>
            {' · '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => openPage('privacy')}>Privacy</Text>
          </T>
        </View>
      </Animated.ScrollView>
      {Platform.OS === 'android' && <Animated.View pointerEvents="none" style={[st.scrim, { height: insets.top }, scrim]} />}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingBottom: 28, gap: 10, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -110, top: -120 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: brand.ink },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.6, color: brand.sun, marginTop: 10 },
  title: { fontFamily: font.display, fontSize: 42, lineHeight: 48, color: '#FFFFFF', letterSpacing: -0.8 },
  sub: { fontFamily: font.semi, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.78)' },
  perk: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  save: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  saveText: { fontFamily: font.heavy, fontSize: 11, color: '#FFFFFF', letterSpacing: 0.6 },
  active: { borderRadius: 22, borderWidth: 1.5, padding: 16, gap: 8 },
  test: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 },
  doneTitle: { fontFamily: font.display, fontSize: 36, lineHeight: 42, color: '#FFFFFF', textAlign: 'center' },
  doneSub: { fontFamily: font.semi, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
});

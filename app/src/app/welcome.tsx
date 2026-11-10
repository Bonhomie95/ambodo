import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '@/components/brand';
import { Button, Icon, T } from '@/components/ui';
import { font, tint, useColors, type Palette } from '@/lib/theme';

const bob = (ms: number, px: number, delay = 0) => ({
  animationName: { from: { transform: [{ translateY: -px }] }, to: { transform: [{ translateY: px }] } },
  animationDuration: ms, animationDelay: delay, animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const, animationTimingFunction: 'ease-in-out' as const,
});

function TalkArt({ c }: { c: Palette }) {
  return (
    <View style={{ width: 280, height: 220 }}>
      <Animated.View style={[a.bubble, { backgroundColor: c.card, left: 0, top: 18, borderBottomLeftRadius: 6 }, bob(2600, 5)]}>
        <Text style={[a.bubbleText, { color: c.text }]}>Can we swap Friday?</Text>
      </Animated.View>
      <Animated.View style={[a.bubble, { backgroundColor: c.me, right: 0, top: 92, borderBottomRightRadius: 6 }, bob(3000, 6, 400)]}>
        <Text style={[a.bubbleText, { color: '#fff' }]}>Sure, I&apos;ll do pickup 👍</Text>
      </Animated.View>
      <Animated.View style={[a.seal, { backgroundColor: tint(c.them, 0.16) }, bob(2200, 3, 800)]}>
        <Icon ios="lock.fill" android="lock" size={13} color={c.them} />
        <Text style={{ fontFamily: font.heavy, fontSize: 12, color: c.them }}>SEALED · ON THE RECORD</Text>
      </Animated.View>
    </View>
  );
}

function PlanArt({ c }: { c: Palette }) {
  const seq = 'AABBAAABBAABBB';
  return (
    <View style={{ width: 280, height: 220, justifyContent: 'center', gap: 10 }}>
      {[0, 1].map((row) => (
        <View key={row} style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {[...seq.slice(row * 7, row * 7 + 7)].map((p, i) => (
            <Animated.View key={i} style={{
              width: 32, height: 44, borderRadius: 12, backgroundColor: p === 'A' ? c.me : c.them, alignItems: 'center', justifyContent: 'center',
              animationName: { '0%': { transform: [{ scale: 0.6 }], opacity: 0 }, '18%': { transform: [{ scale: 1 }], opacity: 1 }, '100%': { transform: [{ scale: 1 }], opacity: 1 } },
              animationDuration: 3600, animationDelay: (row * 7 + i) * 90, animationIterationCount: 'infinite', animationTimingFunction: 'ease-out',
            }}>
              <Text style={{ fontFamily: font.heavy, fontSize: 13, color: '#fff' }}>{'MTWTFSS'[i]}</Text>
            </Animated.View>
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 8 }}>
        <T v="small" color={c.me}>● You</T><T v="small" color={c.them}>● Co-parent</T>
      </View>
    </View>
  );
}

function ProofArt({ c }: { c: Palette }) {
  return (
    <View style={{ width: 280, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[a.doc, { backgroundColor: c.card, borderColor: c.line }, bob(3200, 4)]}>
        {[90, 70, 84, 56, 76].map((w, i) => <View key={i} style={{ height: 8, width: `${w}%`, borderRadius: 4, backgroundColor: c.soft }} />)}
      </Animated.View>
      <Animated.View style={[a.stamp, { borderColor: c.them }, {
        animationName: { from: { transform: [{ rotate: '-30deg' }, { scale: 1.6 }], opacity: 0 }, '30%': { transform: [{ rotate: '-12deg' }, { scale: 1 }], opacity: 1 }, to: { transform: [{ rotate: '-12deg' }, { scale: 1 }], opacity: 1 } },
        animationDuration: 3000, animationIterationCount: 'infinite', animationTimingFunction: 'ease-out',
      }]}>
        <Icon ios="checkmark.seal.fill" android="verified" size={26} color={c.them} />
        <Text style={{ fontFamily: font.heavy, fontSize: 11, color: c.them, letterSpacing: 1 }}>VERIFIED</Text>
      </Animated.View>
    </View>
  );
}

const SLIDES = [
  { title: 'Talk calm.', body: 'ToneGuard checks every message before it lands. Kind words, on the record.', Art: TalkArt },
  { title: 'Plan fair.', body: 'One custody calendar you both see the same way. Swaps in two taps.', Art: PlanArt },
  { title: 'Keep proof.', body: 'Messages, handoffs and expenses — sealed and court-ready in one tap.', Art: ProofArt },
];

function Dot({ x, i, width, color }: { x: SharedValue<number>; i: number; width: number; color: string }) {
  const st = useAnimatedStyle(() => {
    const d = Math.abs(x.get() / width - i);
    return { width: interpolate(d, [0, 1], [28, 8], 'clamp'), opacity: interpolate(d, [0, 1], [1, 0.3], 'clamp') };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: color }, st]} />;
}

function Slide({ x, i, width, c, slide }: { x: SharedValue<number>; i: number; width: number; c: Palette; slide: (typeof SLIDES)[number] }) {
  const parallax = useAnimatedStyle(() => ({ transform: [{ translateX: (x.get() - i * width) * 0.35 }] }));
  return (
    <View style={{ width, paddingHorizontal: 28, justifyContent: 'center', gap: 18 }}>
      <Animated.View style={[{ alignItems: 'center', marginBottom: 12 }, parallax]}><slide.Art c={c} /></Animated.View>
      <T v="hero">{slide.title}</T>
      <T v="body" muted style={{ fontSize: 18, lineHeight: 26 }}>{slide.body}</T>
    </View>
  );
}

export default function Welcome() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { x.set(e.contentOffset.x); });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
      <View style={{ paddingHorizontal: 28 }}><Mark size={64} /></View>
      <Animated.ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }}>
        {SLIDES.map((slide, i) => <Slide key={slide.title} x={x} i={i} width={width} c={c} slide={slide} />)}
      </Animated.ScrollView>
      <View style={{ paddingHorizontal: 24, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center', marginBottom: 10 }}>
          {SLIDES.map((sl, i) => <Dot key={sl.title} x={x} i={i} width={width} color={c.text} />)}
        </View>
        <Button title="Create your account" kind="accent" onPress={() => router.push('/auth?mode=signup')} />
        <Button title="I already have one" kind="ghost" onPress={() => router.push('/auth?mode=signin')} />
      </View>
    </View>
  );
}

const a = StyleSheet.create({
  bubble: { position: 'absolute', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 22, boxShadow: '0 10px 30px rgba(20,26,51,0.12)' },
  bubbleText: { fontFamily: font.bold, fontSize: 16 },
  seal: { position: 'absolute', left: 30, bottom: 8, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  doc: { width: 190, height: 200, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 22, gap: 14, boxShadow: '0 14px 40px rgba(20,26,51,0.12)', transform: [{ rotate: '-4deg' }] },
  stamp: { position: 'absolute', right: 30, bottom: 14, width: 96, height: 96, borderRadius: 48, borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: 'transparent' },
});

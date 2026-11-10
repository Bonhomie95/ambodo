import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cubicBezier, type CSSAnimationKeyframes } from 'react-native-reanimated';
import { brand, font, tint } from '@/lib/theme';

export type MarkColors = { b: string; o: string; d: string };
const BRAND: MarkColors = { b: brand.coral, o: brand.sun, d: brand.teal };

const pop = cubicBezier(0.34, 1.56, 0.64, 1);
const glide = cubicBezier(0.2, 0.8, 0.2, 1);

/** The "b·d" mark — same geometry as scripts/brand.mjs, in its own 696×422 box. */
export function Mark({ size = 120, colors = BRAND, animated = false, delay = 0 }: {
  size?: number; colors?: MarkColors; animated?: boolean; delay?: number;
}) {
  const s = size / 696;
  const half = (color: string, ringLeft: number, stemLeft: number, dir: 1 | -1) => (
    <Animated.View style={[StyleSheet.absoluteFill, animated && {
      animationName: {
        from: { opacity: 0, transform: [{ translateX: -dir * 120 * s }, { rotate: `${-dir * 18}deg` }] },
        to: { opacity: 1, transform: [{ translateX: 0 }, { rotate: '0deg' }] },
      },
      animationDuration: 950, animationDelay: delay, animationFillMode: 'both', animationTimingFunction: pop,
    }]}>
      <View style={{ position: 'absolute', left: ringLeft * s, top: 178 * s, width: 244 * s, height: 244 * s, borderRadius: 122 * s, borderWidth: 60 * s, borderColor: color }} />
      <View style={{ position: 'absolute', left: stemLeft * s, top: 0, width: 60 * s, height: 300 * s, backgroundColor: color, borderTopLeftRadius: 30 * s, borderTopRightRadius: 30 * s }} />
    </Animated.View>
  );
  return (
    <View style={{ width: 696 * s, height: 422 * s }} accessible accessibilityRole="image" accessibilityLabel="Ambodo">
      {animated && (
        <Animated.View style={{
          position: 'absolute', left: 88 * s, top: 40 * s, width: 520 * s, height: 520 * s, borderRadius: 260 * s,
          backgroundImage: `radial-gradient(circle, ${tint(colors.o, 0.6)} 0%, ${tint(colors.o, 0)} 68%)`,
          animationName: { from: { opacity: 0, transform: [{ scale: 0.3 }] }, '40%': { opacity: 1 }, to: { opacity: 0, transform: [{ scale: 1.9 }] } },
          animationDuration: 1800, animationDelay: delay + 450, animationFillMode: 'both', animationTimingFunction: glide,
        }} />
      )}
      {half(colors.b, 0, 0, 1)}
      {half(colors.d, 452, 636, -1)}
      <Animated.View style={[
        { position: 'absolute', left: 278 * s, top: 230 * s, width: 140 * s, height: 140 * s, borderRadius: 70 * s, backgroundColor: colors.o },
        animated && {
          animationName: { from: { opacity: 0, transform: [{ scale: 0 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } },
          animationDuration: 700, animationDelay: delay + 380, animationFillMode: 'both', animationTimingFunction: pop,
        },
      ]} />
    </View>
  );
}

/** "ambodo" with the mirrored b·o·d picked out in the mark's colours. */
export function Wordmark({ size = 44, color, colors = BRAND, animated = false, delay = 0 }: {
  size?: number; color: string; colors?: MarkColors; animated?: boolean; delay?: number;
}) {
  const tone = [color, color, colors.b, colors.o, colors.d, color];
  return (
    <View style={{ flexDirection: 'row' }} accessible accessibilityLabel="ambodo">
      {[...'ambodo'].map((l, i) => (
        <Animated.Text key={i} style={[{ fontFamily: font.display, fontSize: size, lineHeight: size * 1.2, color: tone[i], letterSpacing: -0.5 }, animated && {
          animationName: { from: { opacity: 0, transform: [{ translateY: size * 0.55 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
          animationDuration: 650, animationDelay: delay + i * 70, animationFillMode: 'both', animationTimingFunction: glide,
        }]}>{l}</Animated.Text>
      ))}
    </View>
  );
}

// ---------- randomized intro backdrops: palette × pattern × layout × tagline ----------
type Pattern = 'aurora' | 'sonar' | 'orbit' | 'beams' | 'ripple';
type Palette = { g: [string, string]; blobs: [string, string, string]; mark: MarkColors; text: string; light: boolean };
export type Look = Palette & { bg: string; pattern: Pattern; tagline: string; seed: number[] };

const PALETTES: Palette[] = [
  { g: ['#141A33', '#2B2F63'], blobs: [brand.coral, brand.teal, brand.sun], mark: BRAND, text: '#FFF6EC', light: true },
  { g: ['#FF9A8B', '#FF5E7E'], blobs: ['#FFD3A5', '#FFF1EB', '#B83280'], mark: { b: '#FFFFFF', o: '#FFE29A', d: '#2B2F63' }, text: '#FFFFFF', light: true },
  { g: ['#0B4F6C', '#20BF9F'], blobs: ['#A7F3D0', brand.sun, '#01BAEF'], mark: { b: '#FFFFFF', o: brand.sun, d: '#A7F3D0' }, text: '#FFFFFF', light: true },
  { g: ['#FFE066', '#FF9F1C'], blobs: ['#FFF7CC', brand.coral, '#FFFFFF'], mark: { b: brand.ink, o: '#FFFFFF', d: '#C2410C' }, text: brand.ink, light: false },
  { g: ['#5B4BD6', '#A29BFE'], blobs: ['#FFC6FF', '#81ECEC', '#FFEAA7'], mark: { b: '#FFFFFF', o: '#FFEAA7', d: '#81ECEC' }, text: '#FFFFFF', light: true },
  { g: ['#1F4D3A', '#5C8D5A'], blobs: ['#C7E59C', brand.sun, '#9BE7C4'], mark: { b: '#FFF6EC', o: brand.sun, d: '#C7E59C' }, text: '#FFF6EC', light: true },
  { g: ['#2D0B2E', '#7A1F3D'], blobs: [brand.coral, '#FFB347', '#6C63FF'], mark: { b: '#FF8A7A', o: brand.sun, d: '#FFFFFF' }, text: '#FFF6EC', light: true },
  { g: ['#FFF6EC', '#FFDCC8'], blobs: ['#FFB8A8', '#A8EDE4', '#FFE29A'], mark: { b: brand.coral, o: '#F2B022', d: '#17A396' }, text: brand.ink, light: false },
];
const PATTERNS: Pattern[] = ['aurora', 'sonar', 'orbit', 'beams', 'ripple'];
const TAGLINES = [
  'Two homes. One team.', 'Same kids. Same page.', 'Plans, not fights.', 'Less drama. More dinner.',
  'Kind words. Clear days.', 'Both homes, one heartbeat.', 'Co-parent like a pro.',
];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export function pickLook(): Look {
  const p = pick(PALETTES);
  return {
    ...p, bg: `linear-gradient(${100 + Math.round(Math.random() * 140)}deg, ${p.g[0]}, ${p.g[1]})`,
    pattern: pick(PATTERNS), tagline: pick(TAGLINES), seed: Array.from({ length: 12 }, () => Math.random()),
  };
}

const loop = (animationName: CSSAnimationKeyframes, ms: number, delay = 0, alternate = true, ease: 'ease-in-out' | 'linear' | 'ease-out' = 'ease-in-out') => ({
  animationName, animationDuration: ms, animationDelay: delay, animationIterationCount: 'infinite' as const,
  animationDirection: alternate ? ('alternate' as const) : ('normal' as const), animationTimingFunction: ease,
});

export function Backdrop({ look }: { look: Look }) {
  const { width: w, height: h } = useWindowDimensions();
  const r = look.seed;
  const cx = w / 2;
  const cy = h * 0.42;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundImage: look.bg, overflow: 'hidden' }]} pointerEvents="none">
      {look.pattern === 'aurora' && look.blobs.map((col, i) => {
        const size = w * (1 + r[i] * 0.7);
        return (
          <Animated.View key={i} style={[
            { position: 'absolute', width: size, height: size, borderRadius: size / 2, left: r[i + 3] * w - size / 2, top: r[i + 6] * h - size / 2,
              backgroundImage: `radial-gradient(circle, ${tint(col, 0.8)} 0%, ${tint(col, 0)} 70%)` },
            loop({ from: { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] },
              to: { transform: [{ translateX: (r[i + 1] - 0.5) * 180 }, { translateY: (r[i + 2] - 0.5) * 260 }, { scale: 1.3 }] } }, 6000 + i * 1800),
          ]} />
        );
      })}

      {look.pattern === 'sonar' && [0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={[
          { position: 'absolute', width: 220, height: 220, borderRadius: 110, left: cx - 110, top: cy - 110, borderWidth: 1.5, borderColor: tint(look.text, 0.55) },
          loop({ from: { opacity: 0.9, transform: [{ scale: 0.4 }] }, to: { opacity: 0, transform: [{ scale: 4.2 }] } }, 4400, i * 1100, false, 'ease-out'),
        ]} />
      ))}

      {look.pattern === 'orbit' && [130, 210, 300].map((R, i) => (
        <Animated.View key={i} style={[
          { position: 'absolute', width: R * 2, height: R * 2, left: cx - R, top: cy - R, borderRadius: R, borderWidth: 1, borderColor: tint(look.text, 0.16) },
          loop({ from: { transform: [{ rotate: `${r[i] * 360}deg` }] }, to: { transform: [{ rotate: `${r[i] * 360 + (i % 2 ? -360 : 360)}deg` }] } }, 11000 + i * 5000, 0, false, 'linear'),
        ]}>
          <View style={{ position: 'absolute', top: -8, left: R - 8, width: 16, height: 16, borderRadius: 8, backgroundColor: look.blobs[i] }} />
          <View style={{ position: 'absolute', bottom: -5, left: R - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: look.blobs[(i + 1) % 3] }} />
        </Animated.View>
      ))}

      {look.pattern === 'beams' && [0, 1, 2, 3].map((i) => {
        const col = look.blobs[i % 3];
        return (
          <Animated.View key={i} style={[
            { position: 'absolute', top: -h * 0.25, left: (i / 4) * w - w * 0.05, width: w * (0.14 + r[i] * 0.18), height: h * 1.5, borderRadius: 999,
              backgroundImage: `linear-gradient(180deg, ${tint(col, 0)} 0%, ${tint(col, 0.5)} 50%, ${tint(col, 0)} 100%)` },
            loop({ from: { transform: [{ rotate: '24deg' }, { translateX: -50 }] }, to: { transform: [{ rotate: '24deg' }, { translateX: 70 }] } }, 5200 + i * 900, i * 250),
          ]} />
        );
      })}

      {look.pattern === 'ripple' && Array.from({ length: 9 * 17 }, (_, i) => {
        const x = ((i % 9) + 0.5) * (w / 9);
        const y = (Math.floor(i / 9) + 0.5) * (h / 17);
        const dist = Math.hypot(x - cx, y - cy);
        return (
          <Animated.View key={i} style={[
            { position: 'absolute', left: x - 3, top: y - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: look.text },
            loop({ from: { opacity: 0.12, transform: [{ scale: 0.6 }] }, to: { opacity: 0.7, transform: [{ scale: 1.7 }] } }, 1500, dist * 5),
          ]} />
        );
      })}

      <View style={[StyleSheet.absoluteFill, { backgroundImage: 'radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.24) 100%)' }]} />
    </View>
  );
}

export function Tagline({ look, delay }: { look: Look; delay: number }) {
  return (
    <Animated.View style={{
      animationName: { from: { opacity: 0, transform: [{ translateY: 10 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
      animationDuration: 700, animationDelay: delay, animationFillMode: 'both', animationTimingFunction: glide,
    }}>
      <Text style={{ fontFamily: font.italic, fontSize: 19, color: look.text, opacity: 0.92 }}>{look.tagline}</Text>
    </Animated.View>
  );
}

import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Backdrop, Mark, Tagline, Wordmark, pickLook } from '@/components/brand';
import { Button, T } from '@/components/ui';
import { useSession } from '@/lib/session';

// Every launch draws a fresh look: 8 palettes × 5 patterns × random layout × 7 taglines.
export default function Intro() {
  const { ready, offline, user, family, refresh } = useSession();
  const [look] = useState(pickLook);
  const [shown, setShown] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const stuck = timeUp && ready && offline && !user;

  // Start the clock only once the splash is gone, so slow launches still see the whole show.
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setTimeUp(true), 2800);
    return () => clearTimeout(t);
  }, [shown]);
  useEffect(() => {
    if (timeUp && ready && !stuck) router.replace(!user ? '/welcome' : !family ? '/setup' : '/(tabs)');
  }, [timeUp, ready, stuck, user, family]);

  return (
    <Pressable style={{ flex: 1 }} onPress={() => setTimeUp(true)} accessibilityHint="Tap to skip the intro"
      onLayout={() => { if (!shown) { SplashScreen.hide(); setShown(true); } }}>
      <StatusBar style={look.light ? 'light' : 'dark'} />
      <Backdrop look={look} />
      {shown && <View style={s.center}>
        <Mark size={210} colors={look.mark} animated delay={150} />
        <View style={{ height: 26 }} />
        <Wordmark size={54} color={look.text} colors={look.mark} animated delay={850} />
        <Tagline look={look} delay={1500} />
      </View>}
      {stuck && (
        <Animated.View entering={FadeInDown.springify()} style={s.offline}>
          <T v="strong" color={look.text}>Can&apos;t reach Ambodo right now.</T>
          <Button title="Try again" kind="primary" onPress={refresh} style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, gap: 8 },
  offline: { position: 'absolute', left: 24, right: 24, bottom: 60, gap: 14, alignItems: 'center' },
});

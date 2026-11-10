import { Fraunces_600SemiBold, Fraunces_600SemiBold_Italic, useFonts } from '@expo-google-fonts/fraunces';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastHost } from '@/components/ui';
import { SessionProvider } from '@/lib/session';
import { useColors } from '@/lib/theme';

// Known-benign RN dev warning from native-driven scroll events; not ours to fix.
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered']);

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 250, fade: true });

const modal = { presentation: 'modal', animation: 'slide_from_bottom' } as const;

export default function RootLayout() {
  const c = useColors();
  // Segments, not the path: the Today tab is "/" too, but only the intro has no segments.
  const intro = !useSegments()[0]; // typed routes omit the root's [] at runtime
  const [loaded] = useFonts({
    Fraunces_600SemiBold, Fraunces_600SemiBold_Italic, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  });
  // The intro hides the splash itself once its first frame is laid out; any other entry point hides it here.
  useEffect(() => { if (loaded && !intro) SplashScreen.hide(); }, [loaded, intro]);
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SessionProvider>
        {/* The intro picks its own bar style per random backdrop; everything else follows the theme. */}
        {!intro && <StatusBar style="auto" />}
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="setup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="event" options={modal} />
          <Stack.Screen name="expense" options={modal} />
          <Stack.Screen name="swap" options={modal} />
          <Stack.Screen name="kid/[id]" options={modal} />
          <Stack.Screen name="records" options={modal} />
          <Stack.Screen name="plan" options={modal} />
        </Stack>
        <ToastHost />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '@/components/brand';
import { Button, Field, Icon, T, Tap } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { font, useColors } from '@/lib/theme';

type Mode = 'signup' | 'signin';

export default function Auth() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signin' ? 'signin' : 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ id: number; text: string } | null>(null);
  const signup = mode === 'signup';

  async function submit() {
    setBusy(true);
    try {
      const { token } = await api<{ token: string }>(`/auth/${mode}`, { body: signup ? { name, email, password } : { email, password } });
      const me = await signIn(token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
      router.replace(me.family ? '/(tabs)' : '/setup');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErr({ id: Date.now(), text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 22 }}>
        <Tap onPress={() => router.back()} accessibilityLabel="Back" style={[st.back, { backgroundColor: c.soft }]}>
          <Icon ios="chevron.left" android="arrow_back" size={18} />
        </Tap>
        <Mark size={72} />
        <Animated.View key={mode} entering={FadeIn.duration(260)} style={{ gap: 8 }}>
          <T v="hero">{signup ? 'Let’s get you set.' : 'Welcome back.'}</T>
          <T muted>{signup ? 'One account. Two homes. Zero drama.' : 'Pick up right where you left off.'}</T>
        </Animated.View>

        <View style={[st.toggle, { backgroundColor: c.soft }]}>
          <Animated.View style={[st.thumb, { backgroundColor: c.card, left: signup ? 4 : '50%', transitionProperty: 'left', transitionDuration: 260 }]} />
          {(['signup', 'signin'] as const).map((m) => (
            <Tap key={m} onPress={() => { setMode(m); setErr(null); }} style={st.toggleItem} accessibilityState={{ selected: mode === m }}>
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: mode === m ? c.text : c.muted }}>{m === 'signup' ? 'New here' : 'Sign in'}</Text>
            </Tap>
          ))}
        </View>

        <View style={{ gap: 14 }}>
          {signup && <Field label="Your name" value={name} onChangeText={setName} placeholder="First name is fine" autoComplete="name" textContentType="givenName" returnKeyType="next" />}
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address"
            autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder={signup ? '8+ characters' : 'Your password'} secureTextEntry
            autoComplete={signup ? 'new-password' : 'current-password'} textContentType={signup ? 'newPassword' : 'password'} returnKeyType="go" onSubmitEditing={submit} />
        </View>

        {err && (
          <Animated.View key={err.id} style={{
            animationName: { '0%': { transform: [{ translateX: 0 }] }, '20%': { transform: [{ translateX: -10 }] }, '40%': { transform: [{ translateX: 10 }] }, '60%': { transform: [{ translateX: -6 }] }, '80%': { transform: [{ translateX: 6 }] }, '100%': { transform: [{ translateX: 0 }] } },
            animationDuration: 420,
          }}>
            <T v="strong" color={c.danger} accessibilityLiveRegion="assertive">{err.text}</T>
          </Animated.View>
        )}

        <Button title={signup ? 'Create account' : 'Sign in'} kind="accent" loading={busy} onPress={submit}
          disabled={!email || !password || (signup && !name)} />
        <T v="small" muted style={{ textAlign: 'center' }}>
          Your messages are sealed and only shared with your co-parent and anyone you export them to.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  toggle: { height: 50, borderRadius: 25, flexDirection: 'row', padding: 4 },
  thumb: { position: 'absolute', top: 4, bottom: 4, width: '50%', borderRadius: 21, boxShadow: '0 2px 10px rgba(20,26,51,0.10)' },
  toggleItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

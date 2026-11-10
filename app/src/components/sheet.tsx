import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Row, T, Tap } from '@/components/ui';
import { useColors } from '@/lib/theme';

/** Shared chrome for the form modals: title, close button, keyboard-safe scroll, pinned footer. */
export function Sheet({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 6 }}>
        <T v="title">{title}</T>
        <Tap onPress={() => router.back()} accessibilityLabel="Close" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios="xmark" android="close" size={15} />
        </Tap>
      </Row>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 18 }}>{children}</ScrollView>
      <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: insets.bottom + 14 }}>{footer}</View>
    </KeyboardAvoidingView>
  );
}

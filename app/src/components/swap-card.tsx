import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Card, Row, T, toast } from '@/components/ui';
import { api, type Swap } from '@/lib/api';
import { nice } from '@/lib/dates';
import { useSession } from '@/lib/session';
import { tint, useColors } from '@/lib/theme';

export function SwapCard({ swap, onChange, index = 0 }: { swap: Swap; onChange: () => void; index?: number }) {
  const c = useColors();
  const { meId, nameOf } = useSession();
  const [busy, setBusy] = useState<boolean | null>(null);
  const incoming = swap.by !== meId && swap.status === 'pending';
  const first = swap.dates[0];
  const last = swap.dates[swap.dates.length - 1];
  const pill = { pending: c.sun, accepted: c.good, declined: c.muted }[swap.status];

  async function respond(accept: boolean) {
    setBusy(accept);
    try {
      await api(`/swaps/${swap.id}`, { body: { accept } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(accept ? 'Swap accepted. Calendar updated.' : 'Declined — no changes made.');
      onChange();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="label">{incoming ? `${nameOf(swap.by)} asks to swap` : swap.by === meId ? 'You asked' : `${nameOf(swap.by)} asked`}</T>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: tint(pill, 0.18) }}>
            <T v="small" color={pill}>{swap.status}</T>
          </View>
        </Row>
        <T v="h2">{first === last ? nice(first) : `${nice(first)} – ${nice(last)}`}</T>
        <T muted>
          Kids with {swap.assignTo === meId ? 'you' : nameOf(swap.assignTo)}
          {swap.dates.length > 1 ? ` · ${swap.dates.length} days` : ''}{swap.note ? ` · “${swap.note}”` : ''}
        </T>
        {incoming && (
          <Row style={{ marginTop: 4 }}>
            <Button title="Accept" kind="accent" style={{ flex: 1, height: 48 }} loading={busy === true} onPress={() => respond(true)} />
            <Button title="Decline" kind="soft" style={{ flex: 1, height: 48 }} loading={busy === false} onPress={() => respond(false)} />
          </Row>
        )}
      </Card>
    </Animated.View>
  );
}

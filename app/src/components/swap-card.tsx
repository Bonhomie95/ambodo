import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Card, Row, T, toast } from '@/components/ui';
import { api, type Swap } from '@/lib/api';
import { nice } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { tint, useColors } from '@/lib/theme';

export const SWAP_STATUS = { pending: t('pending'), accepted: t('accepted'), declined: t('declined') };

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
      toast(accept ? t('Swap accepted. Calendar updated.') : t('Declined — no changes made.'));
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
          <T v="label">{incoming ? t('{name} asks to swap', { name: nameOf(swap.by) }) : swap.by === meId ? t('You asked') : t('{name} asked', { name: nameOf(swap.by) })}</T>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: tint(pill, 0.18) }}>
            <T v="small" color={pill}>{SWAP_STATUS[swap.status]}</T>
          </View>
        </Row>
        <T v="h2">{first === last ? nice(first) : `${nice(first)} – ${nice(last)}`}</T>
        <T muted>
          {swap.assignTo === meId ? t('Kids with you') : t('Kids with {name}', { name: nameOf(swap.assignTo) })}
          {swap.dates.length > 1 ? ` · ${t('{n} days', { n: swap.dates.length })}` : ''}{swap.note ? ` · “\u2068${swap.note}\u2069”` : ''}
        </T>
        {incoming && (
          <Row style={{ marginTop: 4 }}>
            <Button title={t('Accept')} kind="accent" style={{ flex: 1, height: 48 }} loading={busy === true} onPress={() => respond(true)} />
            <Button title={t('Decline')} kind="soft" style={{ flex: 1, height: 48 }} loading={busy === false} onPress={() => respond(false)} />
          </Row>
        )}
      </Card>
    </Animated.View>
  );
}

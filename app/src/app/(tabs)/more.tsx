import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Mark } from '@/components/brand';
import { Avatar, Button, Card, Field, Icon, Row, Screen, T, Tap, toast } from '@/components/ui';
import { api, openPage, type Checkin, type Kid } from '@/lib/api';
import { nice, time, ymd } from '@/lib/dates';
import { shareInvite } from '@/lib/meta';
import { useLoad, useSession } from '@/lib/session';
import { font, useColors } from '@/lib/theme';

function Item({ ios, android, title, sub, onPress, color }: { ios: string; android: string; title: string; sub?: string; onPress: () => void; color?: string }) {
  const c = useColors();
  return (
    <Tap onPress={onPress} style={st.item}>
      <View style={[st.itemIcon, { backgroundColor: c.soft }]}><Icon ios={ios} android={android} size={19} color={color ?? c.text} /></View>
      <View style={{ flex: 1 }}>
        <T v="strong" color={color}>{title}</T>
        {sub && <T v="small" muted>{sub}</T>}
      </View>
      <Icon ios="chevron.right" android="chevron_right" size={14} color={c.muted} />
    </Tap>
  );
}

export default function Family() {
  const c = useColors();
  const { user, family, other, meId, refresh, signOut, nameOf, pro } = useSession();
  const [kidName, setKidName] = useState('');
  const [showLog, setShowLog] = useState(false);
  const { data: log, reload } = useLoad(() => api<Checkin[]>('/checkins'));

  async function addKid() {
    if (!kidName.trim()) return;
    try {
      await api<Kid>('/family/kids', { body: { name: kidName.trim() } });
      setKidName('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch (e) { toast((e as Error).message); }
  }

  function deleteAccount() {
    Alert.alert('Delete your account?', 'Your login and profile are erased for good. Shared family records stay with your co-parent.', [
      { text: 'Keep my account', style: 'cancel' },
      {
        text: 'Delete forever', style: 'destructive', onPress: async () => {
          try {
            await api('/me', { method: 'DELETE' });
            await signOut();
            router.replace('/welcome');
          } catch (e) { toast((e as Error).message); }
        },
      },
    ]);
  }

  return (
    <Screen onRefresh={() => { refresh(); reload(); }}>
      <Row style={{ gap: 14 }}>
        <Avatar name={user?.name ?? '?'} color={c.me} size={58} />
        <View style={{ flex: 1 }}>
          <T v="title">{user?.name}</T>
          <T v="small" muted>{user?.email}</T>
        </View>
      </Row>

      <Animated.View entering={FadeInDown.springify()}>
        <Card>
          <T v="label">The kids</T>
          {family?.kids.map((k, i) => (
            <Animated.View key={k.id} entering={ZoomIn.delay(i * 60)}>
              <Tap onPress={() => router.push({ pathname: '/kid/[id]', params: { id: k.id } })} style={st.item}>
                <Avatar name={k.name} color={[c.sun, c.them, c.me][i % 3]} size={40} />
                <View style={{ flex: 1 }}>
                  <T v="strong">{k.name}</T>
                  <T v="small" muted>{[k.school, k.allergies && `Allergies: ${k.allergies}`].filter(Boolean).join(' · ') || 'Tap to add school, doctor, sizes…'}</T>
                </View>
                <Icon ios="chevron.right" android="chevron_right" size={14} color={c.muted} />
              </Tap>
            </Animated.View>
          ))}
          <Row>
            <View style={{ flex: 1 }}><Field label="Add a kid" value={kidName} onChangeText={setKidName} placeholder="Name" onSubmitEditing={addKid} autoCapitalize="words" /></View>
            <Button title="Add" kind="soft" style={{ height: 54, marginTop: 24 }} disabled={!kidName.trim()} onPress={addKid} />
          </Row>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()}>
        <Card>
          <T v="label">Co-parent</T>
          {other ? (
            <Row><Avatar name={other.name} color={c.them} /><T v="strong" style={{ flex: 1 }}>{other.name}</T><T v="small" muted>Connected</T></Row>
          ) : (
            <>
              <T muted>Not joined yet. Their code:</T>
              <Text selectable style={[st.code, { color: c.text }]}>{family?.invite}</Text>
              <Button title="Share invite" kind="accent" style={{ height: 48 }} onPress={() => family && shareInvite(family.invite, user?.name)} />
            </>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).springify()}>
        <Card style={{ gap: 2 }}>
          <Item ios={pro ? 'sparkles' : 'lock.open.fill'} android={pro ? 'auto_awesome' : 'lock_open'} title={pro ? 'Ambodo Family' : 'Upgrade to Ambodo Family'}
            sub={pro ? 'Active for both homes' : 'One plan covers you and your co-parent'} onPress={() => router.push('/plan')} color={c.sun} />
          <Item ios="checkmark.seal.fill" android="verified" title="Court-ready records" sub={pro ? 'Verify the seal, export a PDF' : 'Verify the seal · PDF export with Family'} onPress={() => router.push('/records')} color={c.them} />
          <Item ios="arrow.left.arrow.right" android="swap_horiz" title="Handoff log" sub={log ? `${log.length} check-in${log.length === 1 ? '' : 's'}` : '…'} onPress={() => setShowLog(!showLog)} />
          {showLog && (log ?? []).slice(0, 20).map((h) => (
            <Row key={h.id} style={{ paddingLeft: 52, paddingVertical: 4 }}>
              <T v="small" style={{ flex: 1 }}>{nameOf(h.by)} {h.kind === 'dropoff' ? 'dropped off' : 'picked up'}</T>
              <T v="small" muted>{nice(ymd(new Date(h.at)))} · {time(h.at)}</T>
            </Row>
          ))}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(170).springify()}>
        <Card style={{ gap: 2 }}>
          <Item ios="questionmark.bubble.fill" android="support_agent" title="Help & support" sub="Real people, fast answers" onPress={() => openPage('support')} />
          <Item ios="hand.raised.fill" android="privacy_tip" title="Privacy policy" onPress={() => openPage('privacy')} />
          <Item ios="doc.text.fill" android="description" title="Terms of use" onPress={() => openPage('terms')} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Card style={{ gap: 2 }}>
          <Item ios="rectangle.portrait.and.arrow.right" android="logout" title="Sign out" onPress={async () => { await signOut(); router.replace('/welcome'); }} />
          <Item ios="trash" android="delete" title="Delete account" sub="Permanently remove your login" onPress={deleteAccount} color={c.danger} />
        </Card>
      </Animated.View>

      <View style={{ alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Mark size={54} />
        <T v="small" muted>Ambodo {Constants.expoConfig?.version} · Made for two homes</T>
        <T v="small" muted style={{ fontSize: 11 }}>{meId ? `ID ${meId.slice(-6)}` : ''}</T>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  itemIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  code: { fontFamily: font.heavy, fontSize: 30, letterSpacing: 5 },
});

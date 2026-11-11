import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { MonthGrid } from '@/components/month';
import { Sheet } from '@/components/sheet';
import { Button, Chip, Field, Icon, Row, T, Tap, toast } from '@/components/ui';
import { api, type Day } from '@/lib/api';
import { monthGrid, parse, today } from '@/lib/dates';
import { useLoad, useSession } from '@/lib/session';
import { useColors } from '@/lib/theme';

export default function SwapRequest() {
  const c = useColors();
  const params = useLocalSearchParams<{ date?: string }>();
  const { meId, other, pro } = useSession();
  const first = params.date ?? today();
  const [dates, setDates] = useState<string[]>(params.date ? [params.date] : []);
  const [view, setView] = useState(() => ({ y: parse(first).getFullYear(), m: parse(first).getMonth() }));
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const grid = monthGrid(view.y, view.m);
  const { data } = useLoad(() => api<Day[]>(`/custody?from=${grid[0]}&to=${grid[41]}`), grid[0]);
  const custody = Object.fromEntries((data ?? []).map((d) => [d.date, d.parent]));
  // Default: flip whoever has the first picked day.
  const target = assignTo ?? (dates[0] && custody[dates[0]] === meId ? other?.id : meId) ?? meId;

  const toggle = (d: string) => setDates((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort()));
  const step = (n: number) => { const d = new Date(view.y, view.m + n, 1); setView({ y: d.getFullYear(), m: d.getMonth() }); };
  if (!pro) return <Redirect href="/plan" />; // swap requests are part of Ambodo Family

  async function send() {
    setBusy(true);
    try {
      await api('/swaps', { body: { dates, assignTo: target, note } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(`Request sent to ${other?.name ?? 'your co-parent'}.`);
      router.back();
    } catch (e) { toast((e as Error).message); setBusy(false); }
  }

  return (
    <Sheet title="Swap days" footer={
      <Button title={dates.length ? `Ask for ${dates.length} day${dates.length > 1 ? 's' : ''}` : 'Pick days'} kind="accent" loading={busy} disabled={!dates.length || !other} onPress={send} />
    }>
      <T muted>Tap the days you want to trade. Nothing changes until {other?.name ?? 'your co-parent'} says yes.</T>
      <View style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">{new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</T>
          <Row>
            <Tap onPress={() => step(-1)} accessibilityLabel="Previous month"><Icon ios="chevron.left" android="chevron_left" size={18} /></Tap>
            <Tap onPress={() => step(1)} accessibilityLabel="Next month"><Icon ios="chevron.right" android="chevron_right" size={18} /></Tap>
          </Row>
        </Row>
        <MonthGrid year={view.y} month={view.m} meId={meId} custody={custody} selected={dates} onPress={toggle} />
      </View>
      <View style={{ gap: 10 }}>
        <T v="label">Who has the kids those days?</T>
        <Row>
          <Chip label="Me" on={target === meId} color={c.me} onPress={() => setAssignTo(meId)} />
          {other && <Chip label={other.name} on={target === other.id} color={c.them} onPress={() => setAssignTo(other.id)} />}
        </Row>
      </View>
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Work trip — happy to trade next weekend" maxLength={300} />
    </Sheet>
  );
}

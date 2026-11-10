import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { MonthGrid } from '@/components/month';
import { Sheet } from '@/components/sheet';
import { Button, Chip, Field, Icon, Row, T, Tap, toast } from '@/components/ui';
import { api, type Day } from '@/lib/api';
import { monthGrid, nice, parse, today } from '@/lib/dates';
import { useLoad, useSession } from '@/lib/session';

const KINDS = [['school', 'School'], ['health', 'Health'], ['activity', 'Activity'], ['handoff', 'Handoff'], ['other', 'Other']] as const;

export default function NewEvent() {
  const params = useLocalSearchParams<{ date?: string }>();
  const { meId } = useSession();
  const [day, setDay] = useState(params.date ?? today());
  const [view, setView] = useState(() => ({ y: parse(day).getFullYear(), m: parse(day).getMonth() }));
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<string>('school');
  const [at, setAt] = useState('');
  const [busy, setBusy] = useState(false);
  const grid = monthGrid(view.y, view.m);
  const { data } = useLoad(() => api<Day[]>(`/custody?from=${grid[0]}&to=${grid[41]}`), grid[0]);
  const clock = at.trim().match(/^(\d{1,2})[:.]?(\d{2})$/);
  const timeOk = !at.trim() || (clock && +clock[1] < 24 && +clock[2] < 60);

  async function save() {
    setBusy(true);
    try {
      await api('/events', { body: { title, date: day, kind, time: clock ? `${clock[1].padStart(2, '0')}:${clock[2]}` : null } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('On the calendar. Both homes can see it.');
      router.back();
    } catch (e) { toast((e as Error).message); setBusy(false); }
  }

  const step = (n: number) => { const d = new Date(view.y, view.m + n, 1); setView({ y: d.getFullYear(), m: d.getMonth() }); };
  return (
    <Sheet title="New event" footer={<Button title={`Add for ${nice(day)}`} kind="accent" loading={busy} disabled={!title.trim() || !timeOk} onPress={save} />}>
      <Field label="What’s happening" value={title} onChangeText={setTitle} placeholder="Dentist, recital, field trip…" autoFocus />
      <View style={{ gap: 10 }}>
        <T v="label">Kind</T>
        <Row style={{ flexWrap: 'wrap' }}>{KINDS.map(([k, label]) => <Chip key={k} label={label} on={kind === k} onPress={() => setKind(k)} />)}</Row>
      </View>
      <Field label="Time (optional)" value={at} onChangeText={setAt} placeholder="15:30" keyboardType="numbers-and-punctuation" maxLength={5} />
      <View style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">{new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</T>
          <Row>
            <Tap onPress={() => step(-1)} accessibilityLabel="Previous month"><Icon ios="chevron.left" android="chevron_left" size={18} /></Tap>
            <Tap onPress={() => step(1)} accessibilityLabel="Next month"><Icon ios="chevron.right" android="chevron_right" size={18} /></Tap>
          </Row>
        </Row>
        <MonthGrid year={view.y} month={view.m} meId={meId} selected={[day]} onPress={setDay}
          custody={Object.fromEntries((data ?? []).map((d) => [d.date, d.parent]))} />
      </View>
    </Sheet>
  );
}

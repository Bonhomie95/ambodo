import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Sheet } from '@/components/sheet';
import { Button, Field, Row, T, toast } from '@/components/ui';
import { api, type Kid } from '@/lib/api';
import { useSession } from '@/lib/session';

const FIELDS: [keyof Kid, string, string][] = [
  ['birthday', 'Birthday', 'YYYY-MM-DD'], ['school', 'School & teacher', 'Maple Elementary · Ms. Lee'],
  ['doctor', 'Doctor & dentist', 'Dr. Okafor · 555-0134'], ['allergies', 'Allergies & meds', 'Peanuts · inhaler in backpack'],
  ['sizes', 'Sizes', 'Shoes 13 · Shirt 6'], ['notes', 'Notes', 'Bedtime 8pm, loves dinosaurs'],
];

export default function KidProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { family, refresh } = useSession();
  const kid = family?.kids.find((k) => k.id === id);
  const [form, setForm] = useState<Kid | undefined>(kid);
  const [busy, setBusy] = useState(false);
  if (!kid || !form) return null;

  const birthdayOk = !form.birthday || /^\d{4}-\d{2}-\d{2}$/.test(form.birthday);
  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      await api(`/family/kids/${id}`, { method: 'PATCH', body: { ...form, birthday: form.birthday || null } });
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(`${form.name}'s info is shared with both homes.`);
      router.back();
    } catch (e) { toast((e as Error).message); setBusy(false); }
  }
  function remove() {
    Alert.alert(`Remove ${kid?.name}?`, 'Their profile is removed from both homes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api(`/family/kids/${id}`, { method: 'DELETE' }); await refresh(); router.back(); }
        catch (e) { toast((e as Error).message); }
      } },
    ]);
  }

  return (
    <Sheet title={kid.name} footer={
      <Row>
        <Button title="Save" kind="accent" style={{ flex: 1 }} loading={busy} disabled={!form.name.trim() || !birthdayOk} onPress={save} />
        {(family?.kids.length ?? 0) > 1 && <Button title="Remove" kind="danger" onPress={remove} />}
      </Row>
    }>
      <T muted>Everything here is shared with your co-parent, so nobody has to ask twice.</T>
      <Field label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoCapitalize="words" />
      {FIELDS.map(([k, label, ph]) => (
        <Field key={k} label={label} placeholder={ph} value={(form[k] as string | null) ?? ''} multiline={k === 'notes'}
          keyboardType={k === 'birthday' ? 'numbers-and-punctuation' : 'default'} onChangeText={(v) => setForm({ ...form, [k]: v })} />
      ))}
    </Sheet>
  );
}

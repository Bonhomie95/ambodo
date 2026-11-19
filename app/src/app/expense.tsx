import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Sheet } from '@/components/sheet';
import { Button, Chip, Field, Row, T, toast } from '@/components/ui';
import { api } from '@/lib/api';
import { locale, t } from '@/lib/i18n';
import { money } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { font, useColors } from '@/lib/theme';

const CATS = [['school', t('School')], ['health', t('Health')], ['activities', t('Activities')], ['clothes', t('Clothes')], ['food', t('Food')], ['other', t('Other')]] as const;
const SPLITS = [[50, '50 / 50'], [60, '60%'], [70, '70%'], [100, t('All of it')], [0, t('Just log it')]] as const;

export default function NewExpense() {
  const c = useColors();
  const { other, pro, family } = useSession();
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('school');
  const [split, setSplit] = useState<number>(50);
  const [busy, setBusy] = useState(false);
  const value = Number(amount.replace(',', '.'));
  const cents = Math.round(value * 100);

  if (!pro) return <Redirect href="/plan" />;

  async function save() {
    setBusy(true);
    try {
      await api('/expenses', { body: { title, amount: value, category, split } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(t('Logged. No more “I don’t remember that”.'));
      router.back();
    } catch (e) { toast((e as Error).message); setBusy(false); }
  }

  return (
    <Sheet title={t('Add expense')} footer={
      <Button title={!(cents > 0 && split > 0) ? t('Log expense') : other
        ? t('Log · {name} owes {amount}', { name: other.name, amount: money(Math.round((cents * split) / 100), family?.currency) })
        : t('Log · They owe {amount}', { amount: money(Math.round((cents * split) / 100), family?.currency) })}
        kind="accent" loading={busy} disabled={!title.trim() || !(cents > 0)} onPress={save} />
    }>
      <View style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}>
        <T v="label">{t('Amount')}</T>
        <TextInput value={amount} onChangeText={setAmount} placeholder={(0).toLocaleString(locale, { minimumFractionDigits: 2 })} placeholderTextColor={c.line} keyboardType="decimal-pad" autoFocus
          accessibilityLabel={t('Amount')} style={{ fontFamily: font.display, fontSize: 56, color: c.text, minWidth: 160, textAlign: 'center' }} />
      </View>
      <Field label={t('What for')} value={title} onChangeText={setTitle} placeholder={t('Soccer cleats, school trip…')} />
      <View style={{ gap: 10 }}>
        <T v="label">{t('Category')}</T>
        <Row style={{ flexWrap: 'wrap' }}>{CATS.map(([k, l]) => <Chip key={k} label={l} on={category === k} onPress={() => setCategory(k)} />)}</Row>
      </View>
      <View style={{ gap: 10 }}>
        <T v="label">{t('{name} covers', { name: other?.name ?? t('Your co-parent') })}</T>
        <Row style={{ flexWrap: 'wrap' }}>{SPLITS.map(([k, l]) => <Chip key={k} label={l} on={split === k} color={c.them} onPress={() => setSplit(k)} />)}</Row>
      </View>
    </Sheet>
  );
}

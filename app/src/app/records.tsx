import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Sheet } from '@/components/sheet';
import { Button, Card, Chip, Icon, Row, T, toast } from '@/components/ui';
import { api, type Checkin, type Expense, type Message, type Swap } from '@/lib/api';
import { money } from '@/lib/meta';
import { useLoad, useSession } from '@/lib/session';
import { font, tint, useColors } from '@/lib/theme';

type Verify = { ok: boolean; count: number; head?: string; brokenAt?: string };
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function Records() {
  const c = useColors();
  const { family, pro } = useSession();
  const { data: v } = useLoad(() => api<Verify>('/records/verify'));
  const [parts, setParts] = useState({ messages: true, handoffs: true, expenses: true, swaps: true });
  const [busy, setBusy] = useState(false);
  const name = (id: string) => family?.members.find((m) => m.id === id)?.name ?? 'Former member';

  async function exportPdf() {
    // ponytail: gated in the app only; the PDF is built here from endpoints Free also uses. A server-rendered
    // export endpoint would make it airtight if that ever matters.
    if (!pro) return router.push('/plan');
    setBusy(true);
    try {
      const [msgs, checks, exps, swaps, check] = await Promise.all([
        parts.messages ? api<Message[]>('/messages') : [], parts.handoffs ? api<Checkin[]>('/checkins') : [],
        parts.expenses ? api<Expense[]>('/expenses') : [], parts.swaps ? api<Swap[]>('/swaps') : [], api<Verify>('/records/verify'),
      ]);
      const table = (head: string[], rows: string[][]) =>
        `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}">None</td></tr>`}</table>`;
      const html = `<html><head><meta charset="utf-8"><style>
        body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#141A33;padding:32px;font-size:12px}
        h1{font-size:26px;margin:0 0 4px} h2{font-size:15px;margin:26px 0 6px} .m{color:#6E7189}
        .seal{margin-top:14px;padding:12px;border:1.5px solid ${check.ok ? '#17A396' : '#E5484D'};border-radius:10px;color:${check.ok ? '#17A396' : '#E5484D'}}
        table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #EFE4D8;vertical-align:top} th{background:#F7EDE2}
        code{font-size:10px;color:#6E7189;word-break:break-all}</style></head><body>
        <h1>Ambodo family record</h1>
        <div class="m">Parents: ${esc(family?.members.map((m) => m.name).join(' & ') ?? '')} · Kids: ${esc(family?.kids.map((k) => k.name).join(', ') ?? '')} · Generated ${when(new Date().toISOString())}</div>
        <div class="seal"><b>${check.ok ? '✔ Message chain intact' : '✖ Message chain broken'}</b> — ${check.count} messages. Each message is SHA-256 sealed to the one before it; changing any message breaks every seal after it.<br/><code>Chain head: ${check.head ?? check.brokenAt ?? ''}</code></div>
        ${parts.messages ? `<h2>Messages</h2>${table(['When', 'From', 'Message', 'Seal'], msgs.map((m) => [when(m.at), esc(name(m.author)), esc(m.text).replace(/\n/g, '<br/>'), `<code>${m.hash.slice(0, 12)}</code>`]))}` : ''}
        ${parts.handoffs ? `<h2>Handoffs</h2>${table(['When', 'Who', 'What'], checks.map((h) => [when(h.at), esc(name(h.by)), h.kind === 'dropoff' ? 'Dropped off' : 'Picked up']))}` : ''}
        ${parts.expenses ? `<h2>Expenses</h2>${table(['Logged', 'Item', 'Paid by', 'Amount', 'Other parent share', 'Status'], exps.map((e) => [when(e.at), esc(e.title), esc(name(e.paidBy)), money(e.amount), `${e.split}% · ${money(Math.round((e.amount * e.split) / 100))}`, e.status]))}` : ''}
        ${parts.swaps ? `<h2>Swap requests</h2>${table(['Asked', 'By', 'Days', 'Kids with', 'Status', 'Note'], swaps.map((s) => [when(s.at), esc(name(s.by)), s.dates.join(', '), esc(name(s.assignTo)), s.status, esc(s.note)]))}` : ''}
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share your Ambodo record' });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const sealColor = v?.ok === false ? c.danger : c.them;
  return (
    <Sheet title="Records" footer={<Button title="Export court-ready PDF" kind="accent" loading={busy} onPress={exportPdf}
      icon={<Icon ios={pro ? 'doc.richtext' : 'lock.fill'} android={pro ? 'picture_as_pdf' : 'lock'} size={18} color="#fff" />} />}>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center', gap: 12, paddingVertical: 10 }}>
        <View style={st.sealWrap}>
          <Animated.View style={[st.ring, { borderColor: tint(sealColor, 0.35), borderTopColor: sealColor },
            { animationName: { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } }, animationDuration: 2400, animationIterationCount: 'infinite', animationTimingFunction: 'linear' }]} />
          <Icon ios={v?.ok === false ? 'exclamationmark.shield.fill' : 'checkmark.seal.fill'} android={v?.ok === false ? 'gpp_bad' : 'verified'} size={54} color={sealColor} />
        </View>
        <T v="h2" style={{ textAlign: 'center' }}>{!v ? 'Checking the seal…' : v.ok ? 'Every message intact.' : 'Something changed.'}</T>
        <T muted style={{ textAlign: 'center' }}>
          {v ? `${v.count} messages, each sealed to the one before it. Nobody — not us, not them — can quietly edit history.` : ' '}
        </T>
      </Animated.View>
      {v?.head && (
        <Animated.View entering={FadeInDown.delay(150)}>
          <Card style={{ padding: 14 }}>
            <T v="label">Chain head</T>
            <T v="small" style={{ fontFamily: font.semi }} selectable>{v.head}</T>
          </Card>
        </Animated.View>
      )}
      <View style={{ gap: 10 }}>
        <T v="label">Include</T>
        <Row style={{ flexWrap: 'wrap' }}>
          {(Object.keys(parts) as (keyof typeof parts)[]).map((k) => (
            <Chip key={k} label={k[0].toUpperCase() + k.slice(1)} on={parts[k]} onPress={() => setParts({ ...parts, [k]: !parts[k] })} />
          ))}
        </Row>
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  sealWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
});

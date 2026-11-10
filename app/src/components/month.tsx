import { StyleSheet, Text, View } from 'react-native';
import { Tap, T } from '@/components/ui';
import { monthGrid, nice, parse, today } from '@/lib/dates';
import { font, tint, useColors } from '@/lib/theme';

/** Month view where each parent's days join into one continuous band. */
export function MonthGrid({ year, month, custody, meId, dots = {}, selected = [], onPress }: {
  year: number; month: number; custody: Record<string, string | null>; meId: string;
  dots?: Record<string, number>; selected?: string[]; onPress?: (day: string) => void;
}) {
  const c = useColors();
  const days = monthGrid(year, month);
  const t = today();
  const colorOf = (d?: string) => {
    if (!d || !(d in custody)) return null;
    const p = custody[d];
    return p === meId ? c.me : p ? c.them : c.muted;
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <T key={i} v="label" style={{ flex: 1, textAlign: 'center' }}>{d}</T>)}
      </View>
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {days.slice(row * 7, row * 7 + 7).map((d, i) => {
            const col = colorOf(d);
            const joinL = i > 0 && colorOf(days[row * 7 + i - 1]) === col;
            const joinR = i < 6 && colorOf(days[row * 7 + i + 1]) === col;
            const sel = selected.includes(d);
            const inMonth = parse(d).getMonth() === month;
            return (
              <Tap key={d} onPress={onPress && (() => onPress(d))} accessibilityLabel={nice(d)} accessibilityState={{ selected: sel }}
                style={[g.cell, { opacity: inMonth ? 1 : 0.32 }]}>
                {col && (
                  <View style={[g.band, {
                    backgroundColor: tint(col, 0.22), left: joinL ? 0 : 3, right: joinR ? 0 : 3,
                    borderTopLeftRadius: joinL ? 0 : 15, borderBottomLeftRadius: joinL ? 0 : 15,
                    borderTopRightRadius: joinR ? 0 : 15, borderBottomRightRadius: joinR ? 0 : 15,
                  }]} />
                )}
                <View style={[g.num, { backgroundColor: sel ? c.text : 'transparent', borderWidth: d === t && !sel ? 2 : 0, borderColor: c.text }]}>
                  <Text style={{ fontFamily: font.bold, fontSize: 15, color: sel ? c.bg : c.text }}>{parse(d).getDate()}</Text>
                </View>
                {!!dots[d] && <View style={[g.dot, { backgroundColor: col ?? c.text }]} />}
              </Tap>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const g = StyleSheet.create({
  cell: { flex: 1, height: 50, justifyContent: 'center' },
  band: { position: 'absolute', top: 7, height: 36 },
  num: { alignSelf: 'center', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 2, alignSelf: 'center', width: 5, height: 5, borderRadius: 3 },
});

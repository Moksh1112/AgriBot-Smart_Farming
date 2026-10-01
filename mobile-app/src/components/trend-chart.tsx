import { StyleSheet, Text, View } from 'react-native';

import { AgriColors } from '@/constants/agri-theme';

type TrendChartProps = { values: (number | null)[]; startLabel?: string; endLabel?: string; height?: number };

const LIGHT = [184, 230, 160]; // #B8E6A0
const DARK = [21, 70, 45]; // #15462D

function blend(t: number) {
  const [r, g, b] = LIGHT.map((channel, i) => Math.round(channel + (DARK[i] - channel) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Bar chart with a light-to-dark gradient over time, as in the reference "Growth rate" card. */
export function TrendChart({ values, startLabel, endLabel, height = 120 }: TrendChartProps) {
  const numbers = values.filter((value): value is number => typeof value === 'number');
  if (numbers.length === 0) {
    return <View style={[styles.empty, { height }]}><Text style={styles.emptyText}>Not enough readings yet</Text></View>;
  }
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const span = max - min || 1;

  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {values.map((value, index) => {
          const t = values.length > 1 ? index / (values.length - 1) : 1;
          const ratio = value == null ? 0 : 0.18 + 0.82 * ((value - min) / span);
          return <View key={index} style={[styles.bar, { backgroundColor: value == null ? AgriColors.border : blend(t), height: value == null ? 4 : `${ratio * 100}%` }]} />;
        })}
      </View>
      {(startLabel || endLabel) && (
        <View style={styles.axis}>
          <Text style={styles.axisText}>{startLabel}</Text>
          <Text style={styles.axisText}>{endLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { alignItems: 'flex-end', flexDirection: 'row', gap: 3 },
  bar: { borderRadius: 4, flex: 1, minHeight: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisText: { color: AgriColors.textMuted, fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', backgroundColor: AgriColors.surfaceMuted, borderRadius: 14, justifyContent: 'center' },
  emptyText: { color: AgriColors.textFaint, fontSize: 12, fontWeight: '600' },
});

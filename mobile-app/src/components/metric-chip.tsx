import { StyleSheet, Text, View } from 'react-native';

import { IconCircle, type IconName } from '@/components/icon-circle';
import { AgriColors, AgriRadius, AgriShadow } from '@/constants/agri-theme';

type MetricChipProps = { icon: IconName; label: string; value: string; unit?: string; caption?: string };

export function MetricChip({ icon, label, value, unit, caption }: MetricChipProps) {
  return (
    <View style={styles.card}>
      <IconCircle name={icon} size={38} />
      <Text numberOfLines={1} style={styles.label}>{label}</Text>
      <Text numberOfLines={1} style={styles.value}>
        {value}
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </Text>
      {caption ? <Text numberOfLines={1} style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...AgriShadow, alignItems: 'center', backgroundColor: AgriColors.surface, borderRadius: AgriRadius.lg, gap: 6, minWidth: 98, paddingHorizontal: 14, paddingVertical: 16 },
  label: { color: AgriColors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  value: { color: AgriColors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  unit: { color: AgriColors.textMuted, fontSize: 12, fontWeight: '700' },
  caption: { color: AgriColors.textFaint, fontSize: 10, fontWeight: '600' },
});

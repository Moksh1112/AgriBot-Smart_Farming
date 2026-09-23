import { StyleSheet, Text, View } from 'react-native';

import { AgriColors, AgriRadius, AgriSpacing } from '@/constants/agri-theme';

type SensorCardProps = {
  label: string;
  value: string;
  detail: string;
  accentColor?: string;
  featured?: boolean;
  meterValue?: number;
};

export function SensorCard({ label, value, detail, accentColor, featured = false, meterValue }: SensorCardProps) {
  const safeMeterValue = Math.min(Math.max(meterValue ?? 0, 0), 100);
  return <View style={[styles.card, featured && styles.featuredCard]}><View style={[styles.accent, { backgroundColor: accentColor ?? AgriColors.primary }]} /><Text style={styles.label}>{label}</Text><Text style={[styles.value, featured && styles.featuredValue]}>{value}</Text><Text style={styles.detail}>{detail}</Text>{featured && <View style={styles.meterTrack}><View style={[styles.meterFill, { backgroundColor: accentColor ?? AgriColors.primary, width: `${safeMeterValue}%` }]} /><View style={[styles.meterMarker, { left: `${safeMeterValue}%` }]} /></View>}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: AgriColors.surface, borderColor: AgriColors.border, borderRadius: AgriRadius.lg, borderWidth: 1, flexBasis: '48%', flexGrow: 0, minHeight: 138, overflow: 'hidden', padding: AgriSpacing.md },
  featuredCard: { flexBasis: '100%', minHeight: 174, padding: AgriSpacing.lg },
  accent: { backgroundColor: AgriColors.primary, height: 4, left: 0, position: 'absolute', right: 0, top: 0 },
  label: { color: AgriColors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 16, textTransform: 'uppercase' },
  value: { color: AgriColors.text, fontSize: 26, fontWeight: '800', marginBottom: AgriSpacing.xs },
  featuredValue: { fontSize: 38, letterSpacing: -0.8 },
  detail: { color: AgriColors.textFaint, fontSize: 12 },
  meterTrack: { backgroundColor: AgriColors.surfaceMuted, borderRadius: 4, height: 7, marginTop: AgriSpacing.lg, overflow: 'visible', position: 'relative' },
  meterFill: { borderRadius: 4, height: 7 },
  meterMarker: { backgroundColor: AgriColors.surface, borderColor: AgriColors.text, borderRadius: 7, borderWidth: 2, height: 14, marginLeft: -7, marginTop: -3.5, position: 'absolute', width: 14 },
});

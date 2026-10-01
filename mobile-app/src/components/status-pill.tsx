import { StyleSheet, Text, View } from 'react-native';

import { AgriColors } from '@/constants/agri-theme';

type Tone = 'good' | 'warn' | 'bad' | 'muted';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  good: { bg: '#DDF3DF', fg: AgriColors.success },
  warn: { bg: '#FBEFD9', fg: AgriColors.warning },
  bad: { bg: '#FBE3E1', fg: AgriColors.error },
  muted: { bg: AgriColors.surfaceMuted, fg: AgriColors.textMuted },
};

export function StatusPill({ label, tone = 'muted', dark = false }: { label: string; tone?: Tone; dark?: boolean }) {
  const colors = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : colors.bg }]}>
      <View style={[styles.dot, { backgroundColor: colors.fg }]} />
      <Text style={[styles.text, { color: dark ? AgriColors.textOnDark : colors.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  dot: { borderRadius: 4, height: 8, width: 8 },
  text: { fontSize: 12, fontWeight: '700' },
});

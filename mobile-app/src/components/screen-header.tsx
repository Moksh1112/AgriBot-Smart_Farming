import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgriColors, AgriRadius, AgriSpacing } from '@/constants/agri-theme';

type ScreenHeaderProps = { eyebrow?: string; title: string; actionLabel?: string; onAction?: () => void };

export function ScreenHeader({ eyebrow, title, actionLabel, onAction }: ScreenHeaderProps) {
  return <View style={styles.container}><View>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.title}>{title}</Text></View>{actionLabel && onAction && <Pressable onPress={onAction} style={styles.action}><Text style={styles.actionText}>{actionLabel}</Text></Pressable>}</View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: AgriSpacing.lg },
  eyebrow: { color: AgriColors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: AgriSpacing.xs, textTransform: 'uppercase' },
  title: { color: AgriColors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  action: { backgroundColor: AgriColors.surface, borderColor: AgriColors.border, borderRadius: AgriRadius.sm, borderWidth: 1, paddingHorizontal: AgriSpacing.md, paddingVertical: 10 },
  actionText: { color: AgriColors.primary, fontSize: 13, fontWeight: '800' },
});
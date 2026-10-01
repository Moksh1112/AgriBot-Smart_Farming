import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { AgriColors } from '@/constants/agri-theme';

type ScreenHeaderProps = { eyebrow?: string; title: string; right?: ReactNode };

export function ScreenHeader({ eyebrow, title, right }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  copy: { flex: 1 },
  eyebrow: { color: AgriColors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  title: { color: AgriColors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
});

import { StyleSheet, Text, View } from 'react-native';

import { AgriColors, AgriSpacing } from '@/constants/agri-theme';

export function BrandLockup() {
  return (
    <View style={styles.container}>
      <View style={styles.mark}><Text style={styles.markText}>A</Text></View>
      <View>
        <Text style={styles.name}>AGRI BOT</Text>
        <Text style={styles.tagline}>SMART FARMING ASSISTANT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', gap: AgriSpacing.md },
  mark: { alignItems: 'center', backgroundColor: AgriColors.primary, borderRadius: 14, height: 48, justifyContent: 'center', width: 48 },
  markText: { color: AgriColors.surface, fontSize: 27, fontWeight: '900' },
  name: { color: AgriColors.primaryDark, fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  tagline: { color: AgriColors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: 3 },
});
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/brand-lockup';
import { HatchBackground } from '@/components/hatch-background';
import { AgriColors } from '@/constants/agri-theme';

/** Dark hatched header used by the login and signup screens. */
export function AuthHero({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <HatchBackground style={[styles.hero, { paddingTop: insets.top + 24 }, compact && styles.compact]} variant="light">
      <BrandLockup light />
      <View style={styles.field}>
        <View style={styles.blob} />
        <View style={[styles.blob, styles.blobSmall]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </HatchBackground>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: AgriColors.forest, overflow: 'hidden', paddingBottom: 60, paddingHorizontal: 24 },
  compact: { paddingBottom: 52 },
  field: { height: 90, marginVertical: 18 },
  blob: { backgroundColor: AgriColors.mintStrong, borderColor: AgriColors.mint, borderRadius: 60, borderStyle: 'dashed', borderWidth: 2, height: 86, opacity: 0.9, position: 'absolute', right: 30, top: 0, transform: [{ rotate: '-18deg' }], width: 150 },
  blobSmall: { backgroundColor: 'transparent', height: 56, left: 0, opacity: 0.6, right: undefined, top: 22, width: 96 },
  title: { color: AgriColors.textOnDark, fontSize: 34, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: AgriColors.textOnDarkMuted, fontSize: 15, lineHeight: 22, marginTop: 6, maxWidth: 330 },
});

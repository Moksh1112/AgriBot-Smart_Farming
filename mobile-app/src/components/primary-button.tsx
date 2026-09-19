import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { AgriColors, AgriRadius } from '@/constants/agri-theme';

type PrimaryButtonProps = { label: string; loading?: boolean; onPress: () => void };

export function PrimaryButton({ label, loading = false, onPress }: PrimaryButtonProps) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {loading ? <ActivityIndicator color={AgriColors.surface} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: AgriColors.primary, borderRadius: AgriRadius.sm, justifyContent: 'center', minHeight: 54, shadowColor: AgriColors.primaryDark, shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 3 },
  label: { color: AgriColors.surface, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  pressed: { opacity: 0.82 },
});
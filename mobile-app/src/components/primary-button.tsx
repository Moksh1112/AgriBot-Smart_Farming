import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/components/icon-circle';
import { AgriColors, AgriRadius } from '@/constants/agri-theme';

type PrimaryButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  variant?: 'dark' | 'light';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, loading = false, disabled = false, icon, variant = 'dark', onPress, style }: PrimaryButtonProps) {
  const light = variant === 'light';
  const color = light ? AgriColors.forest : AgriColors.textOnDark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, light && styles.light, (disabled || loading) && styles.disabled, pressed && styles.pressed, style]}>
      {loading ? <ActivityIndicator color={color} /> : (
        <>
          {icon ? <Ionicons color={color} name={icon} size={19} /> : null}
          <Text style={[styles.label, { color }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: AgriColors.forest, borderRadius: AgriRadius.pill, flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 20, minHeight: 56, paddingHorizontal: 22 },
  light: { backgroundColor: AgriColors.mint },
  disabled: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/components/icon-circle';
import { AgriColors, AgriShadow } from '@/constants/agri-theme';

type RoundButtonProps = { icon: IconName; onPress: () => void; label: string; size?: number; dark?: boolean; style?: StyleProp<ViewStyle> };

/** White circular map/navigation button from the reference design. */
export function RoundButton({ icon, onPress, label, size = 48, dark = false, style }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { borderRadius: size / 2, height: size, width: size }, dark && styles.dark, pressed && styles.pressed, style]}>
      <Ionicons color={dark ? AgriColors.textOnDark : AgriColors.forest} name={icon} size={Math.round(size * 0.42)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { ...AgriShadow, alignItems: 'center', backgroundColor: AgriColors.surface, borderColor: 'rgba(18, 59, 41, 0.12)', borderWidth: 1, justifyContent: 'center' },
  dark: { backgroundColor: AgriColors.forest, borderColor: AgriColors.forest },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});

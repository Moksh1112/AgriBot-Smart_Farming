import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgriColors, AgriRadius, AgriShadow } from '@/constants/agri-theme';

type Option<T extends string> = { value: T; label: string };
type ToggleProps<T extends string> = { options: Option<T>[]; value: T; onChange: (value: T) => void };

/** Wide pill tab bar (Overview / Analysis / Trends). */
export function SegmentedTabs<T extends string>({ options, value, onChange }: ToggleProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={option.value} onPress={() => onChange(option.value)} style={[styles.item, active && styles.active]}>
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small round toggles for chart ranges, like the W / M / Y control in the reference. */
export function RoundToggle<T extends string>({ options, value, onChange }: ToggleProps<T>) {
  return (
    <View style={styles.round}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} hitSlop={4} key={option.value} onPress={() => onChange(option.value)} style={[styles.dot, active && styles.dotActive]}>
            <Text style={[styles.dotLabel, active && styles.dotLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { ...AgriShadow, backgroundColor: AgriColors.surface, borderRadius: AgriRadius.pill, flexDirection: 'row', padding: 5 },
  item: { alignItems: 'center', borderRadius: AgriRadius.pill, flex: 1, paddingVertical: 12 },
  active: { backgroundColor: AgriColors.forest },
  label: { color: AgriColors.primary, fontSize: 14, fontWeight: '700' },
  activeLabel: { color: AgriColors.textOnDark },
  round: { flexDirection: 'row', gap: 6 },
  dot: { alignItems: 'center', backgroundColor: '#E6EAE4', borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  dotActive: { backgroundColor: AgriColors.forestDeep },
  dotLabel: { color: AgriColors.textMuted, fontSize: 13, fontWeight: '700' },
  dotLabelActive: { color: AgriColors.textOnDark },
});

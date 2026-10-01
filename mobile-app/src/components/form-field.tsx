import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AgriColors, AgriRadius } from '@/constants/agri-theme';

type FormFieldProps = { label: string; right?: ReactNode } & ComponentProps<typeof TextInput>;

export function FormField({ label, right, style, ...props }: FormFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          autoCapitalize="none"
          placeholderTextColor={AgriColors.textFaint}
          style={[styles.input, style]}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 14 },
  label: { color: AgriColors.textMuted, fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  inputRow: { alignItems: 'center', backgroundColor: AgriColors.surfaceMuted, borderColor: AgriColors.border, borderRadius: AgriRadius.md, borderWidth: 1, flexDirection: 'row', paddingRight: 6 },
  input: { color: AgriColors.text, flex: 1, fontSize: 16, minHeight: 54, paddingHorizontal: 18 },
});

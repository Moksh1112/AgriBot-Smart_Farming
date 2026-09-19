import { StyleSheet, Text, TextInput, type ComponentProps } from 'react-native';

import { AgriColors, AgriRadius, AgriSpacing } from '@/constants/agri-theme';

type FormFieldProps = { label: string } & ComponentProps<typeof TextInput>;

export function FormField({ label, ...props }: FormFieldProps) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={AgriColors.textFaint}
        style={styles.input}
        {...props}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: { color: AgriColors.text, fontSize: 13, fontWeight: '800', marginBottom: AgriSpacing.xs, marginTop: AgriSpacing.sm },
  input: { backgroundColor: AgriColors.surface, borderColor: AgriColors.border, borderRadius: AgriRadius.sm, borderWidth: 1, color: AgriColors.text, fontSize: 16, minHeight: 52, paddingHorizontal: AgriSpacing.md },
});
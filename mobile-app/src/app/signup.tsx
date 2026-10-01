import { Link, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHero } from '@/components/auth-hero';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { AgriColors, AgriRadius } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) return <Redirect href="/dashboard" />;

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Complete all fields to continue.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
      router.replace('/dashboard');
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <ScrollView bounces={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthHero compact subtitle="Set up your farmer profile to start monitoring your AgriBot." title="Create account" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <FormField autoCapitalize="words" label="Full name" onChangeText={setName} placeholder="Your name" value={name} />
          <FormField autoComplete="email" keyboardType="email-address" label="Email address" onChangeText={setEmail} placeholder="farmer@example.com" value={email} />
          <FormField label="Password" onChangeText={setPassword} placeholder="Create a password" secureTextEntry value={password} />
          <FormField label="Confirm password" onChangeText={setConfirmPassword} placeholder="Repeat your password" secureTextEntry value={confirmPassword} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton icon="person-add-outline" label="Create account" loading={isLoading} onPress={handleSignup} />
          <View style={styles.footer}><Text style={styles.footerText}>Already have an account?</Text><Link href="/login" style={styles.link}>Log in</Link></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.forest, flex: 1 },
  content: { flexGrow: 1 },
  sheet: { backgroundColor: AgriColors.surface, borderTopLeftRadius: AgriRadius.xl, borderTopRightRadius: AgriRadius.xl, flexGrow: 1, marginTop: -32, padding: 22, paddingTop: 12 },
  error: { backgroundColor: '#FBE3E1', borderRadius: AgriRadius.sm, color: AgriColors.error, fontSize: 13, marginTop: 14, padding: 12 },
  footer: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 22 },
  footerText: { color: AgriColors.textMuted, fontSize: 14 },
  link: { color: AgriColors.primary, fontSize: 14, fontWeight: '800' },
});

import { Link, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLockup } from '@/components/brand-lockup';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { AgriColors, AgriRadius, AgriSpacing } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';

export default function SignupScreen() {
  const router = useRouter();
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandLockup />
        <View style={styles.intro}>
          <Text style={styles.kicker}>GET STARTED</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Set up your farmer profile to begin monitoring your AgriBot.</Text>
        </View>
        <View style={styles.form}>
          <FormField label="Full name" onChangeText={setName} placeholder="Your name" value={name} />
          <FormField keyboardType="email-address" label="Email address" onChangeText={setEmail} placeholder="farmer@example.com" value={email} />
          <FormField label="Password" onChangeText={setPassword} placeholder="Create a password" secureTextEntry value={password} />
          <FormField label="Confirm password" onChangeText={setConfirmPassword} placeholder="Repeat your password" secureTextEntry value={confirmPassword} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label="Create account" loading={isLoading} onPress={handleSignup} />
        </View>
        <View style={styles.footer}><Text style={styles.footerText}>Already have an account?</Text><Link href="/login" style={styles.link}>Log in</Link></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.background, flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: AgriSpacing.lg },
  intro: { marginBottom: AgriSpacing.md, marginTop: AgriSpacing.xxl },
  kicker: { color: AgriColors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: AgriSpacing.sm },
  title: { color: AgriColors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: AgriSpacing.sm },
  subtitle: { color: AgriColors.textMuted, fontSize: 16, lineHeight: 24 },
  form: { backgroundColor: AgriColors.surface, borderColor: AgriColors.border, borderRadius: AgriRadius.lg, borderWidth: 1, padding: AgriSpacing.md },
  error: { backgroundColor: '#FBE9E7', borderRadius: AgriRadius.sm, color: AgriColors.error, fontSize: 13, marginTop: AgriSpacing.sm, padding: AgriSpacing.sm },
  footer: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: AgriSpacing.lg },
  footerText: { color: AgriColors.textMuted, fontSize: 14 },
  link: { color: AgriColors.primary, fontSize: 14, fontWeight: '800' },
});
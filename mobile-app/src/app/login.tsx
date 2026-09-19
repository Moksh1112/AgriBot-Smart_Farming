import { Link, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLockup } from '@/components/brand-lockup';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { AgriColors, AgriRadius, AgriSpacing } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) return <Redirect href="/dashboard" />;

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandLockup />
        <View style={styles.intro}>
          <Text style={styles.kicker}>FARMER MOBILE APP</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to monitor your AgriBot and stay close to your field.</Text>
        </View>
        <View style={styles.form}>
          <FormField keyboardType="email-address" label="Email address" onChangeText={setEmail} placeholder="farmer@example.com" value={email} />
          <FormField label="Password" onChangeText={setPassword} placeholder="Enter your password" secureTextEntry value={password} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label="Log in" loading={isLoading} onPress={handleLogin} />
        </View>
        <View style={styles.footer}><Text style={styles.footerText}>New to Agri Bot?</Text><Link href="/signup" style={styles.link}>Create an account</Link></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.background, flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: AgriSpacing.lg },
  intro: { marginBottom: AgriSpacing.lg, marginTop: AgriSpacing.xxl },
  kicker: { color: AgriColors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: AgriSpacing.sm },
  title: { color: AgriColors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: AgriSpacing.sm },
  subtitle: { color: AgriColors.textMuted, fontSize: 16, lineHeight: 24, maxWidth: 330 },
  form: { backgroundColor: AgriColors.surface, borderColor: AgriColors.border, borderRadius: AgriRadius.lg, borderWidth: 1, padding: AgriSpacing.md },
  error: { backgroundColor: '#FBE9E7', borderRadius: AgriRadius.sm, color: AgriColors.error, fontSize: 13, marginTop: AgriSpacing.sm, padding: AgriSpacing.sm },
  footer: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: AgriSpacing.lg },
  footerText: { color: AgriColors.textMuted, fontSize: 14 },
  link: { color: AgriColors.primary, fontSize: 14, fontWeight: '800' },
});
import { Link, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHero } from '@/components/auth-hero';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { AgriColors, AgriRadius } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <ScrollView bounces={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthHero subtitle="Monitor your field, scan crops for disease and manage your AgriBot." title="Welcome back" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <FormField autoComplete="email" keyboardType="email-address" label="Email address" onChangeText={setEmail} placeholder="farmer@example.com" value={email} />
          <FormField autoComplete="password" label="Password" onChangeText={setPassword} placeholder="Enter your password" secureTextEntry value={password} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton icon="log-in-outline" label="Log in" loading={isLoading} onPress={handleLogin} />
          <View style={styles.footer}><Text style={styles.footerText}>New to AgriBot?</Text><Link href="/signup" style={styles.link}>Create an account</Link></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.forest, flex: 1 },
  content: { flexGrow: 1 },
  sheet: { backgroundColor: AgriColors.surface, borderTopLeftRadius: AgriRadius.xl, borderTopRightRadius: AgriRadius.xl, flexGrow: 1, marginTop: -32, padding: 22, paddingTop: 16 },
  error: { backgroundColor: '#FBE3E1', borderRadius: AgriRadius.sm, color: AgriColors.error, fontSize: 13, marginTop: 14, padding: 12 },
  footer: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 22 },
  footerText: { color: AgriColors.textMuted, fontSize: 14 },
  link: { color: AgriColors.primary, fontSize: 14, fontWeight: '800' },
});

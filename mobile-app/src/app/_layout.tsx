import { Stack } from 'expo-router';

import { AuthProvider } from '@/context/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F4F8F1' } }} />
    </AuthProvider>
  );
}

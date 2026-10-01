import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AgriColors } from '@/constants/agri-theme';
import { AuthProvider } from '@/context/auth-context';
import { RobotProvider } from '@/context/robot-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RobotProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AgriColors.background } }} />
      </RobotProvider>
    </AuthProvider>
  );
}

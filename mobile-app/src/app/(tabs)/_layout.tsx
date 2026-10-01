import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { AgriColors } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';

export default function TabsLayout() {
  const { isAuthenticated, isRestoring } = useAuth();
  if (isRestoring) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: AgriColors.background } }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="dashboard" options={{ title: 'Field' }} />
      <Tabs.Screen name="scan" options={{ title: 'Crop scan' }} />
      <Tabs.Screen name="robot" options={{ title: 'Robot' }} />
    </Tabs>
  );
}

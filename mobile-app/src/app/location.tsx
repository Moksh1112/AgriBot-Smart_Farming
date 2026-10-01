import { Redirect, useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconCircle } from '@/components/icon-circle';
import { RobotLeafletMap, type RobotMapHandle } from '@/components/robot-leaflet-map';
import { RoundButton } from '@/components/round-button';
import { StatusPill } from '@/components/status-pill';
import { AgriColors, AgriShadow } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';
import { useRobot } from '@/context/robot-context';
import { getMockDashboardData } from '@/data/mock-data';
import { useRobotOnline } from '@/hooks/use-robot-history';
import { timeAgo } from '@/utils/format';

export default function LocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { dashboard } = useRobot();
  const online = useRobotOnline();
  const map = useRef<RobotMapHandle>(null);

  if (!isAuthenticated) return <Redirect href="/login" />;

  const data = dashboard ?? getMockDashboardData();
  const { location } = data;

  return (
    <View style={styles.screen}>
      <RobotLeafletMap latitude={location.latitude} longitude={location.longitude} ref={map} status={online ? 'online' : 'offline'} />

      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <RoundButton icon="arrow-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/dashboard'))} />
      </View>

      <View pointerEvents="box-none" style={[styles.controls, { top: insets.top + 120 }]}>
        <RoundButton icon="add" label="Zoom in" onPress={() => map.current?.zoomIn()} />
        <RoundButton icon="remove" label="Zoom out" onPress={() => map.current?.zoomOut()} />
        <RoundButton icon="locate" label="Center on robot" onPress={() => map.current?.recenter()} />
      </View>

      <View style={[styles.card, { bottom: insets.bottom + 20 }]}>
        <IconCircle background={AgriColors.mint} color={AgriColors.forest} name="leaf" size={46} />
        <View style={styles.copy}>
          <Text style={styles.title}>AgriBot field</Text>
          <Text style={styles.meta}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text>
          <Text style={styles.meta}>{dashboard ? `Updated ${timeAgo(dashboard.robot.lastUpdated)}` : 'Sample position, waiting for live data'}</Text>
        </View>
        <StatusPill label={online ? 'Online' : 'Offline'} tone={online ? 'good' : 'warn'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.mint, flex: 1 },
  top: { left: 18, position: 'absolute', top: 0 },
  controls: { gap: 12, position: 'absolute', right: 18 },
  card: { ...AgriShadow, alignItems: 'center', backgroundColor: AgriColors.surface, borderRadius: 30, flexDirection: 'row', gap: 12, left: 16, padding: 14, position: 'absolute', right: 16 },
  copy: { flex: 1 },
  title: { color: AgriColors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: AgriColors.textMuted, fontSize: 12, marginTop: 2 },
});

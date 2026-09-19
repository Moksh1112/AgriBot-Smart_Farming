import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RobotLeafletMap } from '@/components/robot-leaflet-map';
import { ScreenHeader } from '@/components/screen-header';
import { AgriColors, AgriSpacing } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';
import type { DashboardData } from '@/data/mock-data';
import { getRobotDashboard, RobotApiError } from '@/services/robot-service';
import { connectRobotSocket } from '@/services/robot-socket-service';

export default function LocationScreen() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    let isActive = true;
    let disconnectSocket: (() => void) | undefined;

    async function loadLocation() {
      setIsLoading(true);
      setError('');

      try {
        const data = await getRobotDashboard();
        if (isActive) setDashboardData(data);

        const disconnect = await connectRobotSocket({
          onData: (liveData) => {
            if (isActive) setDashboardData(liveData);
          },
          onStatus: () => {},
          onUnauthorized: async () => {
            await logout();
            if (isActive) router.replace('/login');
          },
        });

        if (isActive) {
          disconnectSocket = disconnect;
        } else {
          disconnect();
        }
      } catch (locationError) {
        if (locationError instanceof RobotApiError && locationError.status === 401) {
          await logout();
          if (isActive) router.replace('/login');
          return;
        }

        if (isActive) {
          setDashboardData(null);
          setError(locationError instanceof Error ? locationError.message : 'Could not load robot location.');
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadLocation();
    return () => {
      isActive = false;
      disconnectSocket?.();
    };
  }, [isAuthenticated, logout, router]);

  if (!isAuthenticated) return <Redirect href="/login" />;
  if (isLoading) return <SafeAreaView style={styles.screen}><View style={styles.stateContainer}><ActivityIndicator color={AgriColors.primary} size="large" /><Text style={styles.stateText}>Loading robot location...</Text></View></SafeAreaView>;
  if (error || !dashboardData) return <SafeAreaView style={styles.screen}><View style={styles.stateContainer}><Text style={styles.stateTitle}>Location unavailable</Text><Text style={styles.stateText}>{error || 'No robot data available.'}</Text></View></SafeAreaView>;

  const { location, robot } = dashboardData;
  return <SafeAreaView style={styles.screen}><View style={styles.content}><ScreenHeader eyebrow="Live position" title="Robot location" actionLabel="Back" onAction={() => router.back()} /><RobotLeafletMap latitude={location.latitude} longitude={location.longitude} status={robot.status} /><View style={styles.details}><View><Text style={styles.detailTitle}>AgriBot</Text><Text style={styles.status}>● {robot.status}</Text><Text style={styles.updated}>Updated {robot.lastUpdated}</Text></View><View style={styles.coordinateBlock}><Text style={styles.coordinateLabel}>Latitude</Text><Text style={styles.coordinateValue}>{location.latitude.toFixed(4)}</Text><Text style={styles.coordinateLabel}>Longitude</Text><Text style={styles.coordinateValue}>{location.longitude.toFixed(4)}</Text></View></View></View></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.background, flex: 1 },
  content: { flex: 1, padding: AgriSpacing.md },
  details: { alignItems: 'flex-start', backgroundColor: AgriColors.surface, borderColor: AgriColors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: AgriSpacing.sm, padding: AgriSpacing.md },
  detailTitle: { color: AgriColors.text, fontSize: 16, fontWeight: '800', marginBottom: 7 },
  status: { color: AgriColors.success, fontSize: 13, fontWeight: '800' },
  coordinateBlock: { alignItems: 'flex-end' },
  coordinateLabel: { color: AgriColors.textFaint, fontSize: 11, marginTop: 1 },
  coordinateValue: { color: AgriColors.text, fontSize: 14, fontWeight: '800', marginBottom: 5 },
  updated: { color: AgriColors.textFaint, fontSize: 11, marginTop: 7 },
  stateContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: AgriSpacing.xl },
  stateTitle: { color: AgriColors.text, fontSize: 20, fontWeight: '800', marginBottom: AgriSpacing.sm, textAlign: 'center' },
  stateText: { color: AgriColors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
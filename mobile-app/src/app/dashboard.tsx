import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SensorCard } from '@/components/sensor-card';
import { AgriColors, AgriRadius, AgriSpacing } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';
import type { DashboardData } from '@/data/mock-data';
import { getRobotDashboard, RobotApiError } from '@/services/robot-service';
import { connectRobotSocket, type RobotSocketStatus } from '@/services/robot-socket-service';

export default function DashboardScreen() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState<RobotSocketStatus>('connecting');

  useEffect(() => {
    if (!isAuthenticated) return;

    let isActive = true;
    let disconnectSocket: (() => void) | undefined;

    async function loadDashboard() {
      setIsLoading(true);
      setError('');

      try {
        const data = await getRobotDashboard();
        if (isActive) setDashboardData(data);

        const disconnect = await connectRobotSocket({
          onData: (liveData) => {
            if (isActive) setDashboardData(liveData);
          },
          onStatus: (status) => {
            if (isActive) setSocketStatus(status);
          },
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
      } catch (dashboardError) {
        if (dashboardError instanceof RobotApiError && dashboardError.status === 401) {
          await logout();
          if (isActive) router.replace('/login');
          return;
        }

        if (isActive) {
          setDashboardData(null);
          setError(dashboardError instanceof Error ? dashboardError.message : 'Could not load robot dashboard data.');
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      isActive = false;
      disconnectSocket?.();
    };
  }, [isAuthenticated, logout, router]);

  if (!isAuthenticated) return <Redirect href="/login" />;
  if (isLoading) return <SafeAreaView style={styles.screen}><View style={styles.stateContainer}><ActivityIndicator color={AgriColors.primary} size="large" /><Text style={styles.stateText}>Loading robot data...</Text></View></SafeAreaView>;
  if (error || !dashboardData) return <SafeAreaView style={styles.screen}><View style={styles.stateContainer}><Text style={styles.stateTitle}>Robot data unavailable</Text><Text style={styles.stateText}>{error || 'No robot data available.'}</Text></View></SafeAreaView>;

  const { sensors, robot } = dashboardData;
  const socketStatusText = socketStatus === 'live' ? 'Live updates connected' : socketStatus === 'connecting' ? 'Connecting to live updates' : 'Live updates offline';
  const isRobotOnline = robot.status.toLowerCase() === 'online';
  const isSocketLive = socketStatus === 'live';
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><ScreenHeader eyebrow="Farmer dashboard" title="AGRI BOT" actionLabel="Log out" onAction={logout} /><Text style={styles.tagline}>Smart farming, simplified.</Text></View><View style={styles.statusRow}><View style={styles.statusHeader}><View style={styles.liveLabel}><View style={[styles.statusDot, { backgroundColor: isSocketLive ? AgriColors.success : AgriColors.warning }]} /><Text style={[styles.liveText, { color: isSocketLive ? AgriColors.success : AgriColors.warning }]}>{isSocketLive ? 'LIVE' : socketStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}</Text></View><Text style={[styles.statusValue, { color: isRobotOnline ? AgriColors.success : AgriColors.warning }]}>{robot.status.toUpperCase()}</Text></View><Text style={styles.statusLabel}>AgriBot {isRobotOnline ? 'connected' : 'offline'}</Text><Text style={styles.statusHint}>{socketStatusText}</Text></View><View style={styles.sectionHeading}><View><Text style={styles.sectionKicker}>FIELD CONDITIONS</Text><Text style={styles.sectionTitle}>Live environmental readings</Text></View><Text style={styles.updated}>{formatLastUpdated(robot.lastUpdated)}</Text></View><View style={styles.grid}><SensorCard accentColor={AgriColors.soil} detail="Healthy range" featured label="Soil moisture" meterValue={sensors.soilMoisture} value={`${sensors.soilMoisture}%`} /><SensorCard accentColor={AgriColors.temperature} detail="Current reading" label="Temperature" value={`${sensors.temperature}°C`} /><SensorCard accentColor={AgriColors.humidity} detail="Current reading" label="Humidity" value={`${sensors.humidity}%`} /></View><View style={styles.robotSection}><Text style={styles.sectionKicker}>AGRI BOT LOCATION</Text><Text style={styles.locationHeading}>Track the latest robot position</Text><Pressable onPress={() => router.push('/location')} style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}><View><Text style={styles.locationTitle}>View robot location</Text><Text style={styles.locationSubtitle}>Open the live position preview</Text></View><Text style={styles.arrow}>→</Text></Pressable></View></ScrollView></SafeAreaView>;
}

function formatLastUpdated(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return `Updated ${timestamp}`;
  return `Updated ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.ivory, flex: 1 },
  content: { padding: AgriSpacing.md, paddingBottom: AgriSpacing.xxl },
  header: { marginBottom: AgriSpacing.lg },
  tagline: { color: AgriColors.textMuted, fontSize: 15, marginTop: -AgriSpacing.sm },
  statusRow: { backgroundColor: AgriColors.primaryDark, borderRadius: AgriRadius.lg, marginBottom: AgriSpacing.xl, padding: AgriSpacing.lg },
  statusHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: AgriSpacing.lg },
  liveLabel: { alignItems: 'center', flexDirection: 'row' },
  statusDot: { borderColor: AgriColors.surface, borderRadius: 7, borderWidth: 2, height: 14, marginRight: AgriSpacing.sm, width: 14 },
  liveText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  statusCopy: { flex: 1 },
  statusLabel: { color: AgriColors.surface, fontSize: 18, fontWeight: '800' },
  statusHint: { color: '#BBD9C1', fontSize: 13, marginTop: 5 },
  statusValue: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  sectionHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: AgriSpacing.sm },
  sectionKicker: { color: AgriColors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginBottom: AgriSpacing.xs },
  sectionTitle: { color: AgriColors.text, fontSize: 19, fontWeight: '800' },
  updated: { color: AgriColors.textFaint, fontSize: 11, marginBottom: 2, marginLeft: AgriSpacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: AgriSpacing.sm },
  robotSection: { marginTop: AgriSpacing.xl },
  locationHeading: { color: AgriColors.textMuted, fontSize: 14, marginBottom: AgriSpacing.sm },
  locationButton: { alignItems: 'center', backgroundColor: AgriColors.primary, borderRadius: AgriRadius.md, flexDirection: 'row', justifyContent: 'space-between', padding: AgriSpacing.lg },
  locationTitle: { color: AgriColors.surface, fontSize: 16, fontWeight: '800' },
  locationSubtitle: { color: '#D1E8D5', fontSize: 13, marginTop: 5 },
  arrow: { color: AgriColors.surface, fontSize: 26, fontWeight: '300' },
  pressed: { opacity: 0.82 },
  stateContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: AgriSpacing.xl },
  stateTitle: { color: AgriColors.text, fontSize: 20, fontWeight: '800', marginBottom: AgriSpacing.sm, textAlign: 'center' },
  stateText: { color: AgriColors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
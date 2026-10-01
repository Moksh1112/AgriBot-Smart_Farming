import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HatchBackground } from '@/components/hatch-background';
import { IconCircle, type IconName } from '@/components/icon-circle';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { ShareNetworkSheet } from '@/components/share-network-sheet';
import { StatusPill } from '@/components/status-pill';
import { AgriColors, AgriRadius, AgriShadow } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';
import { useRobot } from '@/context/robot-context';
import { useBleProvisioning } from '@/hooks/use-ble-provisioning';
import { useRobotOnline } from '@/hooks/use-robot-history';
import type { PiBleStatus } from '@/services/ble-provisioning';
import { timeAgo } from '@/utils/format';

function wifiSummary(status: PiBleStatus | null) {
  if (!status) return { text: 'Reading status…', tone: 'muted' as const };
  const { wifi } = status;
  if (wifi.state === 'connected') return { text: `Wi-Fi: ${wifi.ssid}${wifi.ip ? ` · ${wifi.ip}` : ''}`, tone: 'good' as const };
  if (wifi.state === 'connecting') return { text: `Joining ${wifi.target ?? 'network'}…`, tone: 'warn' as const };
  if (wifi.state === 'failed') return { text: wifi.error ?? 'Wi-Fi connection failed', tone: 'bad' as const };
  if (wifi.state === 'unavailable') return { text: 'Wi-Fi control unavailable on the Pi', tone: 'bad' as const };
  return { text: 'Not connected to Wi-Fi', tone: 'warn' as const };
}

export default function RobotScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { presence, commands, runCommand, dashboard } = useRobot();
  const online = useRobotOnline();
  const ble = useBleProvisioning();
  const [sheetOpen, setSheetOpen] = useState(false);

  const info = presence?.info;
  const caps = info?.capabilities;
  const network = info?.network;
  const wifi = wifiSummary(ble.status);

  const capabilityChips: { icon: IconName; label: string; ok: boolean }[] = [
    { icon: 'camera', label: caps?.camera ? `Camera (${caps.camera})` : 'No camera', ok: Boolean(caps?.camera) },
    { icon: 'sparkles', label: caps?.model ? 'AI model loaded' : 'Model missing', ok: Boolean(caps?.model) },
    { icon: 'speedometer', label: caps ? `Sensors: ${caps.sensors}` : 'Sensors unknown', ok: caps?.sensors === 'hardware' },
    { icon: 'bluetooth', label: caps?.ble ? 'Bluetooth on' : 'Bluetooth off', ok: Boolean(caps?.ble) },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Your robot" title="AgriBot" />

        {/* Live status hero */}
        <HatchBackground style={styles.hero} variant="light">
          <View style={styles.heroRow}>
            <IconCircle background={AgriColors.mint} color={AgriColors.forest} name="hardware-chip" size={52} />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{online ? 'Online' : 'Offline'}</Text>
              <Text style={styles.heroSub}>{presence?.lastSeenAt ? `Last seen ${timeAgo(presence.lastSeenAt)}` : dashboard ? `Last reading ${timeAgo(dashboard.robot.lastUpdated)}` : 'Waiting for the robot'}</Text>
            </View>
            <StatusPill dark label={online ? 'Live' : 'Idle'} tone={online ? 'good' : 'warn'} />
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}><Text style={styles.heroStatLabel}>Network</Text><Text numberOfLines={1} style={styles.heroStatValue}>{network?.ssid ?? '—'}</Text></View>
            <View style={styles.heroStat}><Text style={styles.heroStatLabel}>IP address</Text><Text numberOfLines={1} style={styles.heroStatValue}>{network?.ip ?? '—'}</Text></View>
            <View style={styles.heroStat}><Text style={styles.heroStatLabel}>Version</Text><Text numberOfLines={1} style={styles.heroStatValue}>{info?.version ?? '—'}</Text></View>
          </View>
          <View style={styles.caps}>
            {capabilityChips.map((chip) => (
              <View key={chip.label} style={[styles.cap, !chip.ok && styles.capOff]}>
                <Ionicons color={chip.ok ? AgriColors.forest : AgriColors.textOnDarkMuted} name={chip.icon} size={13} />
                <Text style={[styles.capText, !chip.ok && styles.capTextOff]}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </HatchBackground>

        {/* Bluetooth + share network */}
        <Text style={styles.sectionTitle}>Network setup</Text>
        <View style={styles.card}>
          <Step done={ble.phase === 'connected'} index={1} title="Connect over Bluetooth" detail="Stand near the robot. Bluetooth works even when AgriBot has no Wi-Fi." />
          {ble.phase === 'connected' && ble.device ? (
            <View style={styles.connected}>
              <IconCircle background={AgriColors.mint} color={AgriColors.forest} name="bluetooth" size={40} />
              <View style={styles.connectedCopy}>
                <Text style={styles.connectedTitle}>{ble.device.name}</Text>
                <StatusPill label={wifi.text} tone={wifi.tone} />
              </View>
              <Pressable hitSlop={8} onPress={ble.disconnect}><Text style={styles.link}>Disconnect</Text></Pressable>
            </View>
          ) : (
            <>
              <PrimaryButton
                disabled={!ble.supported || ble.phase === 'connecting'}
                icon="bluetooth"
                label={ble.phase === 'scanning' ? 'Searching…' : 'Find AgriBot'}
                loading={ble.phase === 'scanning'}
                onPress={ble.scan}
                variant="light"
              />
              {ble.robots.map((robot) => (
                <Pressable disabled={ble.phase === 'connecting'} key={robot.id} onPress={() => ble.connect(robot)} style={({ pressed }) => [styles.robotRow, pressed && styles.pressed]}>
                  <Ionicons color={AgriColors.forest} name="radio" size={20} />
                  <View style={styles.connectedCopy}>
                    <Text style={styles.connectedTitle}>{robot.name}</Text>
                    <Text style={styles.muted}>Signal {robot.rssi} dBm</Text>
                  </View>
                  {ble.phase === 'connecting' ? <ActivityIndicator color={AgriColors.primary} /> : <Text style={styles.link}>Connect</Text>}
                </Pressable>
              ))}
            </>
          )}

          <View style={styles.divider} />
          <Step done={ble.status?.wifi.state === 'connected'} index={2} title="Share a network" detail="Send your Wi-Fi or phone hotspot to the Pi so it can reach the server." />
          <PrimaryButton disabled={ble.phase !== 'connected'} icon="share-social" label="Share network" onPress={() => setSheetOpen(true)} />
          {ble.error ? <Text style={styles.error}>{ble.error}</Text> : null}
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actions}>
          <ActionTile
            detail={commands.publish.state === 'failed' ? commands.publish.message ?? 'Failed' : commands.publish.state === 'done' ? 'Updated' : 'Read sensors now'}
            disabled={!online || commands.publish.state === 'pending'}
            icon="refresh"
            loading={commands.publish.state === 'pending'}
            onPress={() => runCommand('publish')}
            title="Refresh"
          />
          <ActionTile detail="Live position" icon="map" onPress={() => router.push('/location')} title="Field map" />
          <ActionTile detail="Run the AI model" icon="scan" onPress={() => router.navigate('/scan')} title="Leaf scan" />
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={[styles.card, styles.account]}>
          <IconCircle background={AgriColors.primarySoft} color={AgriColors.forest} name="person" size={44} />
          <View style={styles.connectedCopy}>
            <Text style={styles.connectedTitle}>{user?.name ?? 'Farmer'}</Text>
            <Text style={styles.muted}>{user?.email ?? ''}</Text>
          </View>
          <Pressable hitSlop={8} onPress={logout}><Text style={[styles.link, { color: AgriColors.error }]}>Log out</Text></Pressable>
        </View>
      </ScrollView>

      <ShareNetworkSheet
        networks={ble.networks}
        onClose={() => setSheetOpen(false)}
        onRefreshNetworks={ble.refreshNetworks}
        onShare={ble.share}
        status={ble.status}
        visible={sheetOpen}
      />
    </SafeAreaView>
  );
}

function Step({ index, title, detail, done }: { index: number; title: string; detail: string; done: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepBadge, done && styles.stepBadgeDone]}>
        {done ? <Ionicons color={AgriColors.textOnDark} name="checkmark" size={16} /> : <Text style={styles.stepNumber}>{index}</Text>}
      </View>
      <View style={styles.connectedCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
    </View>
  );
}

function ActionTile({ icon, title, detail, onPress, disabled = false, loading = false }: { icon: IconName; title: string; detail: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.tile, disabled && !loading && styles.tileDisabled, pressed && styles.pressed]}>
      {loading ? <View style={styles.tileSpinner}><ActivityIndicator color={AgriColors.textOnDark} /></View> : <IconCircle name={icon} size={40} />}
      <Text style={styles.tileTitle}>{title}</Text>
      <Text numberOfLines={2} style={styles.tileDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.background, flex: 1 },
  content: { padding: 16, paddingBottom: 140 },
  hero: { backgroundColor: AgriColors.forest, borderRadius: AgriRadius.xl, overflow: 'hidden', padding: 20 },
  heroRow: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  heroCopy: { flex: 1 },
  heroTitle: { color: AgriColors.textOnDark, fontSize: 24, fontWeight: '800' },
  heroSub: { color: AgriColors.textOnDarkMuted, fontSize: 13, marginTop: 2 },
  heroStats: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: AgriRadius.md, flexDirection: 'row', marginTop: 18, padding: 14 },
  heroStat: { flex: 1 },
  heroStatLabel: { color: AgriColors.textOnDarkMuted, fontSize: 11, fontWeight: '600' },
  heroStatValue: { color: AgriColors.textOnDark, fontSize: 14, fontWeight: '800', marginTop: 3 },
  caps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  cap: { alignItems: 'center', backgroundColor: AgriColors.mint, borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  capOff: { backgroundColor: 'rgba(255,255,255,0.1)' },
  capText: { color: AgriColors.forest, fontSize: 11, fontWeight: '700' },
  capTextOff: { color: AgriColors.textOnDarkMuted },
  sectionTitle: { color: AgriColors.text, fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 24 },
  card: { ...AgriShadow, backgroundColor: AgriColors.surface, borderRadius: AgriRadius.lg, padding: 18 },
  step: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  stepBadge: { alignItems: 'center', backgroundColor: AgriColors.primarySoft, borderRadius: 15, height: 30, justifyContent: 'center', width: 30 },
  stepBadgeDone: { backgroundColor: AgriColors.success },
  stepNumber: { color: AgriColors.forest, fontSize: 14, fontWeight: '800' },
  stepTitle: { color: AgriColors.text, fontSize: 16, fontWeight: '800' },
  muted: { color: AgriColors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  connected: { alignItems: 'center', backgroundColor: AgriColors.surfaceMuted, borderRadius: AgriRadius.md, flexDirection: 'row', gap: 12, marginTop: 16, padding: 12 },
  connectedCopy: { flex: 1, gap: 4 },
  connectedTitle: { color: AgriColors.text, fontSize: 15, fontWeight: '800' },
  robotRow: { alignItems: 'center', borderColor: AgriColors.border, borderRadius: AgriRadius.md, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, padding: 12 },
  link: { color: AgriColors.primary, fontSize: 14, fontWeight: '800' },
  divider: { backgroundColor: AgriColors.border, height: 1, marginVertical: 20 },
  error: { color: AgriColors.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  tile: { ...AgriShadow, backgroundColor: AgriColors.surface, borderRadius: AgriRadius.lg, flex: 1, gap: 6, padding: 14 },
  tileDisabled: { opacity: 0.55 },
  tileSpinner: { alignItems: 'center', backgroundColor: AgriColors.forest, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  tileTitle: { color: AgriColors.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  tileDetail: { color: AgriColors.textMuted, fontSize: 12, lineHeight: 16 },
  account: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  pressed: { opacity: 0.85 },
});

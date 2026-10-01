import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HatchBackground } from '@/components/hatch-background';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { StatusPill } from '@/components/status-pill';
import { AgriColors, AgriRadius, AgriShadow, DiseaseColors } from '@/constants/agri-theme';
import { useRobot } from '@/context/robot-context';
import { DISEASE_INFO } from '@/data/crop-advice';
import { useRobotOnline } from '@/hooks/use-robot-history';
import { getScan } from '@/services/robot-service';
import type { CropScan } from '@/types/robot';
import { formatDay, formatTime, percent, timeAgo } from '@/utils/format';

const STATUS_TEXT = { healthy: 'Healthy crop', disease: 'Disease detected', none: 'No leaves found' } as const;

export default function ScanScreen() {
  const { latestScan, scans, presence, commands, runCommand, refresh } = useRobot();
  const online = useRobotOnline();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CropScan | null>(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // A new live scan replaces whatever historic scan was being viewed.
  useEffect(() => {
    setSelectedId(null);
    setSelected(null);
  }, [latestScan?.id]);

  const scan = selectedId ? selected : latestScan;
  const capabilities = presence?.info?.capabilities;
  const cameraReady = Boolean(capabilities?.camera) && Boolean(capabilities?.model);
  const scanState = commands.scan;
  const canScan = online && cameraReady;

  let robotPill: { label: string; tone: 'good' | 'warn' | 'bad' | 'muted' };
  if (!online) robotPill = { label: 'Robot offline', tone: 'warn' };
  else if (!capabilities?.model) robotPill = { label: 'Model missing', tone: 'bad' };
  else if (!capabilities?.camera) robotPill = { label: 'No camera', tone: 'warn' };
  else robotPill = { label: 'Camera ready', tone: 'good' };

  async function openScan(id: string) {
    if (id === latestScan?.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    setLoadingScan(true);
    try {
      setSelected(await getScan(id));
    } catch {
      setSelected(null);
    } finally {
      setLoadingScan(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const info = scan ? DISEASE_INFO[scan.summary.label] : undefined;
  const statusColor = scan ? (scan.summary.status === 'disease' ? AgriColors.error : scan.summary.status === 'healthy' ? AgriColors.success : AgriColors.textMuted) : AgriColors.textMuted;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={AgriColors.primary} />} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="AI crop doctor" right={<StatusPill label={robotPill.label} tone={robotPill.tone} />} title="Leaf scan" />

        <View style={styles.imageCard}>
          {loadingScan ? <View style={[styles.image, styles.center]}><ActivityIndicator color={AgriColors.primary} /></View> : scan?.image ? (
            <Image contentFit="cover" source={{ uri: scan.image }} style={styles.image} transition={200} />
          ) : (
            <HatchBackground style={[styles.image, styles.center]}>
              <Ionicons color={AgriColors.forest} name="scan-circle-outline" size={56} />
              <Text style={styles.placeholderText}>{scan ? 'Image not available' : 'No scans yet'}</Text>
            </HatchBackground>
          )}
          {scan ? (
            <View style={styles.imageOverlay}>
              <View style={styles.overlayCopy}>
                <Text style={styles.overlayStatus}>{STATUS_TEXT[scan.summary.status]}</Text>
                <Text numberOfLines={1} style={styles.overlayLabel}>{scan.summary.status === 'none' ? 'Point the camera at tomato leaves' : scan.summary.label}</Text>
              </View>
              {scan.summary.confidence > 0 ? <View style={styles.confidence}><Text style={styles.confidenceText}>{percent(scan.summary.confidence)}</Text></View> : null}
            </View>
          ) : null}
        </View>
        {scan ? <Text style={styles.scanMeta}>{selectedId ? `${formatDay(scan.createdAt)}, ${formatTime(scan.createdAt)}` : `Latest scan · ${timeAgo(scan.createdAt)}`}{scan.inferenceMs ? ` · ${scan.inferenceMs} ms on the Pi` : ''}</Text> : null}

        <PrimaryButton
          disabled={!canScan}
          icon="scan"
          label={scanState.state === 'pending' ? 'Scanning…' : 'Scan leaves now'}
          loading={scanState.state === 'pending'}
          onPress={() => runCommand('scan')}
        />
        <Text style={[styles.helper, scanState.state === 'failed' && styles.helperError]}>
          {scanState.state === 'failed' ? scanState.message : scanState.state === 'pending' ? 'AgriBot is capturing a photo and running the disease model.' : !online ? 'Connect AgriBot to the network from the Robot tab to scan.' : !cameraReady ? 'Attach a camera and copy best.onnx to the Pi to enable scans.' : 'Captures a photo with the robot camera and checks it for 4 tomato diseases.'}
        </Text>

        {scan && scan.detections.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detections</Text>
            {scan.detections.slice(0, 6).map((detection, index) => (
              <View key={`${detection.label}-${index}`} style={styles.detection}>
                <View style={[styles.swatch, { backgroundColor: DiseaseColors[detection.label] ?? AgriColors.textFaint }]} />
                <Text numberOfLines={1} style={styles.detectionLabel}>{detection.label}</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { backgroundColor: DiseaseColors[detection.label] ?? AgriColors.primary, width: `${Math.round(detection.confidence * 100)}%` }]} /></View>
                <Text style={styles.detectionValue}>{percent(detection.confidence)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {info ? (
          <View style={styles.card}>
            <View style={styles.adviceHeader}>
              <Ionicons color={statusColor} name={scan?.summary.status === 'healthy' ? 'shield-checkmark' : 'medkit'} size={20} />
              <Text style={styles.cardTitle}>{scan?.summary.status === 'healthy' ? 'Keep it up' : 'What to do'}</Text>
            </View>
            <Text style={styles.adviceSummary}>{info.summary}</Text>
            {info.actions.map((action) => (
              <View key={action} style={styles.action}>
                <Ionicons color={AgriColors.primary} name="checkmark-circle" size={18} />
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {scans.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Recent scans</Text>
            <ScrollView contentContainerStyle={styles.history} horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
              {scans.map((item) => {
                const active = (selectedId ?? latestScan?.id) === item.id;
                return (
                  <Pressable key={item.id} onPress={() => openScan(item.id)} style={[styles.historyItem, active && styles.historyActive]}>
                    <View style={[styles.swatch, { backgroundColor: DiseaseColors[item.summary.label] ?? AgriColors.textFaint }]} />
                    <Text numberOfLines={1} style={[styles.historyLabel, active && styles.historyLabelActive]}>{item.summary.status === 'none' ? 'No leaves' : item.summary.label}</Text>
                    <Text style={[styles.historyTime, active && styles.historyTimeActive]}>{formatDay(item.createdAt)} · {formatTime(item.createdAt)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: AgriColors.background, flex: 1 },
  content: { padding: 16, paddingBottom: 140 },
  imageCard: { ...AgriShadow, backgroundColor: AgriColors.surface, borderRadius: AgriRadius.xl, overflow: 'hidden' },
  image: { aspectRatio: 4 / 3, backgroundColor: AgriColors.mint, width: '100%' },
  center: { alignItems: 'center', gap: 8, justifyContent: 'center' },
  placeholderText: { color: AgriColors.forest, fontSize: 14, fontWeight: '700' },
  imageOverlay: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, bottom: 12, flexDirection: 'row', gap: 10, left: 12, padding: 12, paddingLeft: 16, position: 'absolute', right: 12 },
  overlayCopy: { flex: 1 },
  overlayStatus: { color: AgriColors.textMuted, fontSize: 12, fontWeight: '700' },
  overlayLabel: { color: AgriColors.text, fontSize: 18, fontWeight: '800', marginTop: 1 },
  confidence: { backgroundColor: AgriColors.forest, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  confidenceText: { color: AgriColors.textOnDark, fontSize: 14, fontWeight: '800' },
  scanMeta: { color: AgriColors.textMuted, fontSize: 12, marginLeft: 6, marginTop: 10 },
  helper: { color: AgriColors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 10, textAlign: 'center' },
  helperError: { color: AgriColors.error },
  card: { ...AgriShadow, backgroundColor: AgriColors.surface, borderRadius: AgriRadius.lg, gap: 10, marginTop: 16, padding: 18 },
  cardTitle: { color: AgriColors.text, fontSize: 16, fontWeight: '800' },
  detection: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  swatch: { borderRadius: 5, height: 10, width: 10 },
  detectionLabel: { color: AgriColors.text, fontSize: 14, fontWeight: '600', width: 120 },
  barTrack: { backgroundColor: AgriColors.surfaceMuted, borderRadius: 4, flex: 1, height: 8, overflow: 'hidden' },
  barFill: { borderRadius: 4, height: 8 },
  detectionValue: { color: AgriColors.text, fontSize: 13, fontWeight: '700', textAlign: 'right', width: 42 },
  adviceHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  adviceSummary: { color: AgriColors.textMuted, fontSize: 14, lineHeight: 20 },
  action: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  actionText: { color: AgriColors.text, flex: 1, fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: AgriColors.text, fontSize: 17, fontWeight: '800', marginBottom: 10, marginTop: 22 },
  historyScroll: { marginHorizontal: -16 },
  history: { gap: 10, paddingBottom: 8, paddingHorizontal: 16 },
  historyItem: { ...AgriShadow, backgroundColor: AgriColors.surface, borderRadius: AgriRadius.md, gap: 6, padding: 14, width: 150 },
  historyActive: { backgroundColor: AgriColors.forest },
  historyLabel: { color: AgriColors.text, fontSize: 14, fontWeight: '800' },
  historyLabelActive: { color: AgriColors.textOnDark },
  historyTime: { color: AgriColors.textMuted, fontSize: 11, fontWeight: '600' },
  historyTimeActive: { color: AgriColors.textOnDarkMuted },
});

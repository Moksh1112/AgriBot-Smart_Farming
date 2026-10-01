import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HatchBackground } from '@/components/hatch-background';
import { IconCircle, type IconName } from '@/components/icon-circle';
import { MetricChip } from '@/components/metric-chip';
import { RobotLeafletMap } from '@/components/robot-leaflet-map';
import { RoundButton } from '@/components/round-button';
import { RoundToggle, SegmentedTabs } from '@/components/segmented-tabs';
import { StatusPill } from '@/components/status-pill';
import { TrendChart } from '@/components/trend-chart';
import { AgriColors, AgriRadius, AgriShadow, DiseaseColors } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';
import { useRobot } from '@/context/robot-context';
import { buildInsights, type Insight } from '@/data/crop-advice';
import { getMockDashboardData } from '@/data/mock-data';
import { useRobotHistory, useRobotOnline } from '@/hooks/use-robot-history';
import type { HistoryPoint, HistoryRange } from '@/types/robot';
import { formatDay, formatTime, percent, round1, timeAgo } from '@/utils/format';

type Section = 'overview' | 'analysis' | 'trends';
type Metric = 'soilMoisture' | 'temperature' | 'humidity';

const METRICS: Record<Metric, { label: string; unit: string; icon: IconName }> = {
  soilMoisture: { label: 'Soil moisture', unit: '%', icon: 'water' },
  temperature: { label: 'Temperature', unit: '°C', icon: 'thermometer' },
  humidity: { label: 'Humidity', unit: '%', icon: 'cloud' },
};
const RANGES: { value: HistoryRange; label: string }[] = [
  { value: 'hour', label: 'H' },
  { value: 'day', label: 'D' },
  { value: 'week', label: 'W' },
];

function axisLabel(point: HistoryPoint | undefined, range: HistoryRange) {
  if (!point) return '';
  return range === 'week' ? formatDay(point.at) : formatTime(point.at);
}

export default function FieldScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { dashboard, dashboardError, isLoading, latestScan, refresh, socketStatus } = useRobot();
  const online = useRobotOnline();
  const [section, setSection] = useState<Section>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const data = dashboard ?? getMockDashboardData();
  const hasLiveData = Boolean(dashboard);
  const { sensors, location } = data;
  const firstName = user?.name?.split(' ')[0] ?? 'Farmer';

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={AgriColors.primary} size="large" /><Text style={styles.loadingText}>Loading your field…</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={AgriColors.primary} />} showsVerticalScrollIndicator={false}>
      {/* Map hero */}
      <View style={styles.hero}>
        <RobotLeafletMap interactive={false} latitude={location.latitude} longitude={location.longitude} status={online ? 'online' : 'offline'} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><HatchBackground style={styles.fill} /></View>
        <View pointerEvents="box-none" style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
          <View style={styles.greeting}>
            <Text style={styles.greetingHello}>Hello, {firstName}</Text>
            <Text style={styles.greetingSub}>{socketStatus === 'live' ? 'Live field data' : socketStatus === 'connecting' ? 'Connecting…' : 'Live updates paused'}</Text>
          </View>
          <RoundButton icon="expand" label="Open full map" onPress={() => router.push('/location')} />
        </View>
        <View style={styles.fieldLabel}>
          <IconCircle background={AgriColors.mint} color={AgriColors.forest} name="leaf" size={36} />
          <View style={styles.fieldCopy}>
            <Text style={styles.fieldTitle}>AgriBot field</Text>
            <Text style={styles.fieldMeta}>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
          </View>
          <StatusPill label={online ? 'Online' : 'Offline'} tone={online ? 'good' : 'warn'} />
        </View>
      </View>

      <View style={styles.body}>
        <SegmentedTabs
          onChange={setSection}
          options={[{ value: 'overview', label: 'Overview' }, { value: 'analysis', label: 'Analysis' }, { value: 'trends', label: 'Trends' }]}
          value={section}
        />

        {!hasLiveData ? (
          <View style={styles.notice}>
            <Ionicons color={AgriColors.warning} name="information-circle" size={20} />
            <Text style={styles.noticeText}>Showing sample values. {dashboardError || 'Waiting for the first reading from AgriBot.'}</Text>
          </View>
        ) : null}

        {section === 'overview' && (
          <>
            <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <MetricChip icon="water" label="Moisture" unit="%" value={round1(sensors.soilMoisture)} />
              <MetricChip icon="thermometer" label="Temperature" unit="°C" value={round1(sensors.temperature)} />
              <MetricChip icon="cloud" label="Humidity" unit="%" value={round1(sensors.humidity)} />
              <MetricChip icon="flask" label="Acidity" value={typeof sensors.ph === 'number' ? `pH ${sensors.ph.toFixed(1)}` : '—'} />
              <MetricChip icon="rainy" label="Rain" value={sensors.rainfall >= 50 ? 'Wet' : 'Dry'} />
            </ScrollView>

            <Pressable onPress={() => router.navigate('/scan')} style={({ pressed }) => [styles.cropCard, pressed && styles.pressed]}>
              {latestScan?.image ? (
                <Image contentFit="cover" source={{ uri: latestScan.image }} style={styles.cropImage} />
              ) : (
                <HatchBackground style={[styles.cropImage, styles.cropPlaceholder]}>
                  <Ionicons color={AgriColors.forest} name="leaf-outline" size={34} />
                </HatchBackground>
              )}
              <View style={styles.cropCopy}>
                <Text style={styles.cropTitle}>Crop health</Text>
                {latestScan ? (
                  <>
                    <View style={styles.cropStatusRow}>
                      <View style={[styles.dot, { backgroundColor: DiseaseColors[latestScan.summary.label] ?? AgriColors.textFaint }]} />
                      <Text numberOfLines={2} style={styles.cropStatus}>{latestScan.summary.status === 'none' ? 'No leaves found' : latestScan.summary.label}</Text>
                    </View>
                    <Text style={styles.cropMeta}>Scanned {timeAgo(latestScan.createdAt)}</Text>
                    {latestScan.summary.confidence > 0 ? <Text style={styles.cropMeta}>{percent(latestScan.summary.confidence)} confidence</Text> : null}
                  </>
                ) : (
                  <Text style={styles.cropMeta}>No camera scan yet. Tap to run the leaf disease model.</Text>
                )}
              </View>
              <View style={styles.cropArrow}><Ionicons color={AgriColors.textOnDark} name="arrow-forward" size={22} style={styles.arrowIcon} /></View>
            </Pressable>

            <TrendCard metric="soilMoisture" />
          </>
        )}

        {section === 'analysis' && <AnalysisSection insights={buildInsights(hasLiveData ? sensors : null, latestScan)} lastUpdated={dashboard?.robot.lastUpdated} />}

        {section === 'trends' && <TrendsSection />}
      </View>
    </ScrollView>
  );
}

function TrendCard({ metric, selectable = false }: { metric: Metric; selectable?: boolean }) {
  const [range, setRange] = useState<HistoryRange>('day');
  const [selected, setSelected] = useState<Metric>(metric);
  const { points, loading } = useRobotHistory(range);
  const config = METRICS[selected];
  const values = useMemo(() => points.map((point) => point[selected]), [points, selected]);
  const numbers = values.filter((value): value is number => typeof value === 'number');
  const latest = numbers.at(-1);
  const first = numbers[0];
  const delta = latest != null && first != null ? latest - first : 0;

  return (
    <View style={styles.trendCard}>
      {selectable ? (
        <View style={styles.metricTabs}>
          {(Object.keys(METRICS) as Metric[]).map((key) => (
            <Pressable key={key} onPress={() => setSelected(key)} style={[styles.metricTab, key === selected && styles.metricTabActive]}>
              <Ionicons color={key === selected ? AgriColors.textOnDark : AgriColors.forest} name={METRICS[key].icon} size={14} />
              <Text style={[styles.metricTabText, key === selected && styles.metricTabTextActive]}>{METRICS[key].label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.trendHeader}>
        <View>
          <Text style={styles.trendTitle}>{config.label}</Text>
          <View style={styles.trendValueRow}>
            <Text style={styles.trendValue}>{latest != null ? `${round1(latest)} ${config.unit}` : '—'}</Text>
            {numbers.length > 1 ? (
              <View style={styles.delta}>
                <Ionicons color={delta >= 0 ? AgriColors.success : AgriColors.warning} name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={16} />
                <Text style={[styles.deltaText, { color: delta >= 0 ? AgriColors.success : AgriColors.warning }]}>{round1(Math.abs(delta))}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <RoundToggle onChange={setRange} options={RANGES} value={range} />
      </View>
      {loading ? <View style={styles.chartLoading}><ActivityIndicator color={AgriColors.primary} /></View> : (
        <TrendChart endLabel={axisLabel(points.at(-1), range)} startLabel={axisLabel(points[0], range)} values={values} />
      )}
      {selectable && numbers.length > 0 ? (
        <View style={styles.stats}>
          {[['Min', Math.min(...numbers)], ['Average', numbers.reduce((a, b) => a + b, 0) / numbers.length], ['Max', Math.max(...numbers)]].map(([label, value]) => (
            <View key={label as string} style={styles.stat}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statValue}>{round1(value as number)}{config.unit}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TrendsSection() {
  return <TrendCard metric="soilMoisture" selectable />;
}

const TONE: Record<Insight['tone'], { bg: string; fg: string }> = {
  good: { bg: AgriColors.mint, fg: AgriColors.forest },
  watch: { bg: '#F8EBCF', fg: AgriColors.warning },
  alert: { bg: '#F9DEDB', fg: AgriColors.error },
};

function AnalysisSection({ insights, lastUpdated }: { insights: Insight[]; lastUpdated?: string }) {
  return (
    <View style={styles.analysis}>
      <Text style={styles.analysisIntro}>Recommendations from the latest readings{lastUpdated ? ` (${formatTime(lastUpdated)})` : ''} and camera scan.</Text>
      {insights.length === 0 ? <Text style={styles.analysisIntro}>No readings available yet.</Text> : null}
      {insights.map((insight) => (
        <View key={insight.id} style={styles.insight}>
          <IconCircle background={TONE[insight.tone].bg} color={TONE[insight.tone].fg} name={insight.icon as IconName} size={44} />
          <View style={styles.insightCopy}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightDetail}>{insight.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 140 },
  fill: { flex: 1 },
  loading: { alignItems: 'center', backgroundColor: AgriColors.background, flex: 1, gap: 12, justifyContent: 'center' },
  loadingText: { color: AgriColors.textMuted, fontSize: 14 },
  hero: { backgroundColor: AgriColors.mint, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, height: 380, overflow: 'hidden' },
  heroTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', left: 0, paddingHorizontal: 18, position: 'absolute', right: 0, top: 0 },
  greeting: { ...AgriShadow, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 },
  greetingHello: { color: AgriColors.text, fontSize: 16, fontWeight: '800' },
  greetingSub: { color: AgriColors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 1 },
  fieldLabel: { ...AgriShadow, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 26, bottom: 22, flexDirection: 'row', gap: 12, left: 18, padding: 10, paddingRight: 14, position: 'absolute', right: 18 },
  fieldCopy: { flex: 1 },
  fieldTitle: { color: AgriColors.text, fontSize: 16, fontWeight: '800' },
  fieldMeta: { color: AgriColors.textMuted, fontSize: 12, marginTop: 1 },
  body: { padding: 16, paddingTop: 20 },
  notice: { alignItems: 'center', backgroundColor: '#FBF1DD', borderRadius: AgriRadius.md, flexDirection: 'row', gap: 10, marginTop: 14, padding: 12 },
  noticeText: { color: AgriColors.text, flex: 1, fontSize: 12, lineHeight: 17 },
  chipsScroll: { marginHorizontal: -16, marginTop: 16 },
  chips: { gap: 10, paddingBottom: 10, paddingHorizontal: 16, paddingTop: 4 },
  cropCard: { ...AgriShadow, alignItems: 'center', backgroundColor: AgriColors.surface, borderRadius: AgriRadius.xl, flexDirection: 'row', gap: 14, marginTop: 8, padding: 10 },
  cropImage: { borderRadius: 26, height: 128, width: 116 },
  cropPlaceholder: { alignItems: 'center', backgroundColor: AgriColors.mint, justifyContent: 'center', overflow: 'hidden' },
  cropCopy: { flex: 1, gap: 4 },
  cropTitle: { color: AgriColors.textMuted, fontSize: 13, fontWeight: '700' },
  cropStatusRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  dot: { borderRadius: 5, height: 10, width: 10 },
  cropStatus: { color: AgriColors.text, flexShrink: 1, fontSize: 19, fontWeight: '800' },
  cropMeta: { color: AgriColors.textMuted, fontSize: 12, lineHeight: 17 },
  cropArrow: { alignItems: 'center', alignSelf: 'center', backgroundColor: AgriColors.forest, borderRadius: 28, height: 56, justifyContent: 'center', marginRight: 6, width: 56 },
  arrowIcon: { transform: [{ rotate: '-45deg' }] },
  pressed: { opacity: 0.9 },
  trendCard: { ...AgriShadow, backgroundColor: AgriColors.surface, borderRadius: AgriRadius.xl, marginTop: 14, padding: 20 },
  trendHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  trendTitle: { color: AgriColors.text, fontSize: 16, fontWeight: '700' },
  trendValueRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  trendValue: { color: AgriColors.text, fontSize: 22, fontWeight: '800' },
  delta: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  deltaText: { fontSize: 13, fontWeight: '700' },
  chartLoading: { alignItems: 'center', height: 140, justifyContent: 'center' },
  metricTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  metricTab: { alignItems: 'center', backgroundColor: AgriColors.primarySoft, borderRadius: 999, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  metricTabActive: { backgroundColor: AgriColors.forest },
  metricTabText: { color: AgriColors.forest, fontSize: 12, fontWeight: '700' },
  metricTabTextActive: { color: AgriColors.textOnDark },
  stats: { borderTopColor: AgriColors.border, borderTopWidth: 1, flexDirection: 'row', marginTop: 18, paddingTop: 14 },
  stat: { alignItems: 'center', flex: 1 },
  statLabel: { color: AgriColors.textMuted, fontSize: 12, fontWeight: '600' },
  statValue: { color: AgriColors.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  analysis: { gap: 10, marginTop: 16 },
  analysisIntro: { color: AgriColors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  insight: { ...AgriShadow, alignItems: 'center', backgroundColor: AgriColors.surface, borderRadius: AgriRadius.lg, flexDirection: 'row', gap: 14, padding: 14 },
  insightCopy: { flex: 1 },
  insightTitle: { color: AgriColors.text, fontSize: 15, fontWeight: '800' },
  insightDetail: { color: AgriColors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
});

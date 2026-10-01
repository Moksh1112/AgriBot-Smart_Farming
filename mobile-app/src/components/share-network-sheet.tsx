import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { AgriColors, AgriRadius } from '@/constants/agri-theme';
import { API_BASE_URL } from '@/constants/api';
import type { PiBleStatus, PiNetwork } from '@/services/ble-provisioning';

type ShareNetworkSheetProps = {
  visible: boolean;
  onClose: () => void;
  status: PiBleStatus | null;
  networks: PiNetwork[];
  onRefreshNetworks: (pin?: string) => Promise<void>;
  onShare: (options: { ssid: string; password: string; backend?: string; pin?: string }) => Promise<void>;
};

type Progress = { tone: 'busy' | 'good' | 'bad'; text: string } | null;

function signalIcon(signal: number) {
  return signal > 66 ? 'wifi' : signal > 33 ? 'wifi-outline' : 'cellular-outline';
}

export function ShareNetworkSheet({ visible, onClose, status, networks, onRefreshNetworks, onShare }: ShareNetworkSheetProps) {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [sendBackend, setSendBackend] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sent, setSent] = useState<{ ssid: string; lastAt: number | null } | null>(null);
  const [sendError, setSendError] = useState('');
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSent(null);
      setSendError('');
      setTimedOut(false);
    }
  }, [visible]);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  // Derive progress from the Pi's live status after we've sent credentials.
  let progress: Progress = null;
  if (sendError) progress = { tone: 'bad', text: sendError };
  else if (sent && status) {
    const last = status.last && status.last.at !== sent.lastAt ? status.last : null;
    const wifi = status.wifi;
    if (last && !last.ok) progress = { tone: 'bad', text: last.error ?? 'AgriBot rejected the request.' };
    else if (wifi.state === 'connected' && wifi.ssid === sent.ssid) {
      progress = { tone: 'good', text: `Connected to ${wifi.ssid}${wifi.ip ? ` · ${wifi.ip}` : ''}${status.internet ? ' · Internet OK' : ''}${status.backend.ok ? ' · Server reachable' : ''}` };
    } else if (wifi.state === 'failed' && wifi.target === sent.ssid) progress = { tone: 'bad', text: wifi.error ?? `Could not join ${sent.ssid}.` };
    else if (timedOut) progress = { tone: 'bad', text: 'AgriBot has not joined the network yet. Check the password and that the network is in range.' };
    else progress = { tone: 'busy', text: `AgriBot is joining ${sent.ssid}…` };
  }

  async function handleShare() {
    const name = ssid.trim();
    if (!name) {
      setSendError('Choose or type a network name.');
      return;
    }
    if (status?.pin && !pin.trim()) {
      setSendError('Enter the pairing PIN set on the robot.');
      return;
    }
    setSendError('');
    setTimedOut(false);
    setSending(true);
    try {
      await onShare({ ssid: name, password, backend: sendBackend ? API_BASE_URL : undefined, pin: pin.trim() || undefined });
      setSent({ ssid: name, lastAt: status?.last?.at ?? null });
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setTimedOut(true), 75000);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Could not send the network to AgriBot.');
    } finally {
      setSending(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await onRefreshNetworks(pin.trim() || undefined);
    setRefreshing(false);
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Share network</Text>
              <Text style={styles.subtitle}>Send Wi-Fi details to AgriBot over Bluetooth. Use your phone&apos;s hotspot in the field.</Text>
            </View>
            <Pressable accessibilityLabel="Close" hitSlop={10} onPress={onClose} style={styles.close}>
              <Ionicons color={AgriColors.forest} name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Networks AgriBot can see</Text>
              <Pressable disabled={refreshing} hitSlop={8} onPress={handleRefresh}>
                <Text style={styles.link}>{refreshing ? 'Scanning…' : 'Rescan'}</Text>
              </Pressable>
            </View>
            {networks.length === 0 ? <Text style={styles.empty}>No networks reported yet. Tap Rescan, or type the name below.</Text> : (
              <View style={styles.networks}>
                {networks.map((network) => {
                  const selected = network.ssid === ssid;
                  return (
                    <Pressable key={network.ssid} onPress={() => setSsid(network.ssid)} style={[styles.network, selected && styles.networkSelected]}>
                      <Ionicons color={selected ? AgriColors.textOnDark : AgriColors.forest} name={signalIcon(network.signal)} size={16} />
                      <Text numberOfLines={1} style={[styles.networkText, selected && styles.networkTextSelected]}>{network.ssid}</Text>
                      {network.secure ? <Ionicons color={selected ? AgriColors.textOnDark : AgriColors.textFaint} name="lock-closed" size={12} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <FormField autoCorrect={false} label="Network name (SSID)" onChangeText={setSsid} placeholder="e.g. Rayyan's iPhone" value={ssid} />
            <FormField
              autoCorrect={false}
              label="Password"
              onChangeText={setPassword}
              placeholder="Leave empty for open networks"
              right={<Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} hitSlop={8} onPress={() => setShowPassword((v) => !v)} style={styles.eye}><Ionicons color={AgriColors.textMuted} name={showPassword ? 'eye-off' : 'eye'} size={20} /></Pressable>}
              secureTextEntry={!showPassword}
              value={password}
            />
            {status?.pin ? <FormField keyboardType="number-pad" label="Robot pairing PIN" onChangeText={setPin} placeholder="PIN from agribot.env" secureTextEntry value={pin} /> : null}

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Also send server address</Text>
                <Text numberOfLines={1} style={styles.toggleDetail}>{API_BASE_URL}</Text>
              </View>
              <Switch onValueChange={setSendBackend} thumbColor={AgriColors.surface} trackColor={{ false: AgriColors.border, true: AgriColors.primary }} value={sendBackend} />
            </View>

            {progress ? (
              <View style={[styles.progress, progress.tone === 'good' && styles.progressGood, progress.tone === 'bad' && styles.progressBad]}>
                <Ionicons color={progress.tone === 'good' ? AgriColors.success : progress.tone === 'bad' ? AgriColors.error : AgriColors.primary} name={progress.tone === 'good' ? 'checkmark-circle' : progress.tone === 'bad' ? 'alert-circle' : 'sync'} size={20} />
                <Text style={styles.progressText}>{progress.text}</Text>
              </View>
            ) : null}

            <PrimaryButton icon="share-social" label={progress?.tone === 'good' ? 'Share again' : 'Share network'} loading={sending} onPress={handleShare} style={styles.button} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(12, 42, 29, 0.45)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: AgriColors.surface, borderTopLeftRadius: AgriRadius.xl, borderTopRightRadius: AgriRadius.xl, maxHeight: '90%', paddingBottom: 28, paddingHorizontal: 20 },
  handle: { alignSelf: 'center', backgroundColor: AgriColors.border, borderRadius: 3, height: 5, marginVertical: 10, width: 44 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginBottom: 8 },
  headerCopy: { flex: 1 },
  title: { color: AgriColors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: AgriColors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  close: { alignItems: 'center', backgroundColor: AgriColors.surfaceMuted, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  sectionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  section: { color: AgriColors.textMuted, fontSize: 13, fontWeight: '700' },
  link: { color: AgriColors.primary, fontSize: 13, fontWeight: '800' },
  empty: { color: AgriColors.textFaint, fontSize: 13, marginTop: 8 },
  networks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  network: { alignItems: 'center', backgroundColor: AgriColors.primarySoft, borderRadius: 999, flexDirection: 'row', gap: 6, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 9 },
  networkSelected: { backgroundColor: AgriColors.forest },
  networkText: { color: AgriColors.forest, flexShrink: 1, fontSize: 13, fontWeight: '700' },
  networkTextSelected: { color: AgriColors.textOnDark },
  eye: { padding: 10 },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 18 },
  toggleCopy: { flex: 1 },
  toggleTitle: { color: AgriColors.text, fontSize: 14, fontWeight: '700' },
  toggleDetail: { color: AgriColors.textFaint, fontSize: 12, marginTop: 2 },
  progress: { alignItems: 'center', backgroundColor: AgriColors.primarySoft, borderRadius: AgriRadius.md, flexDirection: 'row', gap: 10, marginTop: 18, padding: 14 },
  progressGood: { backgroundColor: '#DDF3DF' },
  progressBad: { backgroundColor: '#FBE3E1' },
  progressText: { color: AgriColors.text, flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  button: { marginTop: 18 },
});

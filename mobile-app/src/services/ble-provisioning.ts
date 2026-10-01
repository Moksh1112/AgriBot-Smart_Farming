import { PermissionsAndroid, Platform } from 'react-native';
import type BleManagerType from 'react-native-ble-manager';
import type { Peripheral } from 'react-native-ble-manager';

import { AGRIBOT_BLE } from '@/constants/ble';

// Status reported by the Pi over Bluetooth (pi/agribot/ble.py).
export type PiBleStatus = {
  wifi: { state: 'connected' | 'connecting' | 'disconnected' | 'failed' | 'unavailable'; ssid: string | null; ip: string | null; error: string | null; target: string | null };
  internet: boolean | null;
  backend: { url: string; ok: boolean };
  camera: boolean;
  model: boolean;
  pin: boolean;
  last: { cmd: string; ok: boolean; error?: string; at: number } | null;
};

export type PiNetwork = { ssid: string; signal: number; secure: boolean };
export type FoundRobot = { id: string; name: string; rssi: number };

export class BleUnavailableError extends Error {
  constructor() {
    super('Bluetooth needs the AgriBot development build. Expo Go does not include Bluetooth support; run "npx expo run:android" or build with EAS.');
    this.name = 'BleUnavailableError';
  }
}

let manager: typeof BleManagerType | null = null;
let started: Promise<void> | null = null;
const mtuByDevice = new Map<string, number>();

function getManager() {
  if (!manager) {
    try {
      // Loaded lazily: the native module is absent in Expo Go and throws on import.
      manager = require('react-native-ble-manager').default as typeof BleManagerType;
    } catch {
      throw new BleUnavailableError();
    }
  }
  return manager;
}

export function isBleSupported() {
  try {
    getManager();
    return true;
  } catch {
    return false;
  }
}

// --- UTF-8 helpers (Hermes does not guarantee TextEncoder/TextDecoder) -------
function utf8Encode(text: string) {
  const bytes: number[] = [];
  for (const char of text) {
    let code = char.codePointAt(0) ?? 0;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else {
      code = Math.min(code, 0x10ffff);
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    }
  }
  return bytes;
}

function utf8Decode(bytes: number[]) {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let code: number;
    if (b < 0x80) { code = b; i += 1; }
    else if (b < 0xe0) { code = ((b & 31) << 6) | (bytes[i + 1] & 63); i += 2; }
    else if (b < 0xf0) { code = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); i += 3; }
    else { code = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); i += 4; }
    out += String.fromCodePoint(code);
  }
  return out;
}

// --- setup -------------------------------------------------------------------
async function requestPermissions() {
  if (Platform.OS !== 'android') return;
  const permissions = Number(Platform.Version) >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(permissions);
  if (!Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED)) {
    throw new Error('Bluetooth permission was denied. Allow "Nearby devices" for AgriBot in system settings.');
  }
}

export async function ensureBleReady() {
  const ble = getManager();
  await requestPermissions();
  started ??= ble.start({ showAlert: false });
  await started;
  const state = await ble.checkState();
  if (state === 'off') {
    if (Platform.OS === 'android') await ble.enableBluetooth();
    else throw new Error('Turn on Bluetooth to connect to AgriBot.');
  }
  if (state === 'unsupported') throw new Error('This phone does not support Bluetooth Low Energy.');
}

/** Scans for AgriBots; resolves with every robot seen when the scan ends. */
export async function scanForRobots(onFound: (robot: FoundRobot) => void, seconds = 6) {
  const ble = getManager();
  await ensureBleReady();
  const found = new Map<string, FoundRobot>();
  const service = AGRIBOT_BLE.service.toLowerCase();

  const isAgriBot = (peripheral: Peripheral) => {
    const uuids = (peripheral.advertising?.serviceUUIDs ?? []).map((uuid) => uuid.toLowerCase());
    const name = peripheral.advertising?.localName ?? peripheral.name ?? '';
    return uuids.includes(service) || /agribot/i.test(name);
  };

  return new Promise<FoundRobot[]>((resolve, reject) => {
    const discover = ble.onDiscoverPeripheral((peripheral: Peripheral) => {
      if (!isAgriBot(peripheral)) return;
      const robot = { id: peripheral.id, name: peripheral.advertising?.localName ?? peripheral.name ?? 'AgriBot', rssi: peripheral.rssi };
      found.set(robot.id, robot);
      onFound(robot);
    });
    const stop = ble.onStopScan(() => {
      discover.remove();
      stop.remove();
      resolve([...found.values()]);
    });
    ble.scan({ seconds, allowDuplicates: false }).catch((error: unknown) => {
      discover.remove();
      stop.remove();
      reject(error instanceof Error ? error : new Error('Bluetooth scan failed.'));
    });
  });
}

export async function connectRobot(id: string) {
  const ble = getManager();
  await ble.connect(id);
  let mtu = 23;
  if (Platform.OS === 'android') {
    try {
      mtu = await ble.requestMTU(id, 247);
    } catch {
      mtu = 23;
    }
  } else {
    mtu = 185; // iOS negotiates a large MTU automatically.
  }
  mtuByDevice.set(id, mtu);
  await ble.retrieveServices(id, [AGRIBOT_BLE.service]);
}

export async function disconnectRobot(id: string) {
  mtuByDevice.delete(id);
  try {
    await getManager().disconnect(id);
  } catch {
    // Already disconnected.
  }
}

export function onRobotDisconnected(callback: (id: string) => void) {
  try {
    const subscription = getManager().onDisconnectPeripheral((event: { peripheral: string }) => callback(event.peripheral));
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

async function readJson<T>(id: string, characteristic: string): Promise<T> {
  const bytes = await getManager().read(id, AGRIBOT_BLE.service, characteristic);
  return JSON.parse(utf8Decode(bytes)) as T;
}

export function readRobotStatus(id: string) {
  return readJson<PiBleStatus>(id, AGRIBOT_BLE.status);
}

export async function readRobotNetworks(id: string): Promise<PiNetwork[]> {
  const raw = await readJson<{ s: string; q: number; l: boolean }[]>(id, AGRIBOT_BLE.networks);
  return raw.map((item) => ({ ssid: item.s, signal: item.q, secure: item.l }));
}

/** Sends one framed JSON command: 0x02 + utf8(json) + '\n', split into MTU-sized writes. */
async function sendCommand(id: string, payload: Record<string, unknown>) {
  const bytes = [0x02, ...utf8Encode(JSON.stringify(payload)), 0x0a];
  const chunk = Math.max(20, Math.min(180, (mtuByDevice.get(id) ?? 23) - 3));
  await getManager().write(id, AGRIBOT_BLE.service, AGRIBOT_BLE.command, bytes, chunk);
}

export function requestNetworkScan(id: string, pin?: string) {
  return sendCommand(id, { cmd: 'scan', pin });
}

export function shareNetwork(id: string, options: { ssid: string; password: string; backend?: string; pin?: string }) {
  return sendCommand(id, { cmd: 'wifi', ssid: options.ssid, password: options.password, backend: options.backend, pin: options.pin });
}

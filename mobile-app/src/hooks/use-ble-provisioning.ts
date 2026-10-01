import { useCallback, useEffect, useRef, useState } from 'react';

import {
  BleUnavailableError, connectRobot, disconnectRobot, isBleSupported, onRobotDisconnected, readRobotNetworks, readRobotStatus,
  requestNetworkScan, scanForRobots, shareNetwork, type FoundRobot, type PiBleStatus, type PiNetwork,
} from '@/services/ble-provisioning';

type Phase = 'idle' | 'scanning' | 'connecting' | 'connected';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Bluetooth request failed.';
}

/** Bluetooth flow: find the Pi, connect, read its Wi-Fi status, share a network. */
export function useBleProvisioning() {
  const [supported] = useState(isBleSupported);
  const [phase, setPhase] = useState<Phase>('idle');
  const [robots, setRobots] = useState<FoundRobot[]>([]);
  const [device, setDevice] = useState<FoundRobot | null>(null);
  const [status, setStatus] = useState<PiBleStatus | null>(null);
  const [networks, setNetworks] = useState<PiNetwork[]>([]);
  const [error, setError] = useState(supported ? '' : new BleUnavailableError().message);
  const deviceRef = useRef<FoundRobot | null>(null);

  const reset = useCallback(() => {
    deviceRef.current = null;
    setDevice(null);
    setStatus(null);
    setPhase('idle');
  }, []);

  useEffect(() => onRobotDisconnected((id) => {
    if (deviceRef.current?.id === id) {
      reset();
      setError('AgriBot disconnected from Bluetooth.');
    }
  }), [reset]);

  // Poll the Pi's status while connected so Wi-Fi progress shows live.
  useEffect(() => {
    if (phase !== 'connected' || !device) return;
    let active = true;
    const poll = async () => {
      try {
        const next = await readRobotStatus(device.id);
        if (active) setStatus(next);
      } catch {
        // Transient read failures are common during Wi-Fi switching.
      }
    };
    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [phase, device]);

  // Disconnect when the screen using this hook unmounts.
  useEffect(() => () => {
    if (deviceRef.current) disconnectRobot(deviceRef.current.id);
  }, []);

  const scan = useCallback(async () => {
    setError('');
    setRobots([]);
    setPhase('scanning');
    try {
      const found = await scanForRobots((robot) => setRobots((current) => [...current.filter((r) => r.id !== robot.id), robot]));
      if (found.length === 0) setError('No AgriBot found. Make sure the Pi is powered on and within a few metres.');
    } catch (scanError) {
      setError(message(scanError));
    } finally {
      setPhase((current) => (current === 'scanning' ? 'idle' : current));
    }
  }, []);

  const loadNetworks = useCallback(async (id: string) => {
    try {
      setNetworks(await readRobotNetworks(id));
    } catch {
      setNetworks([]);
    }
  }, []);

  const connect = useCallback(async (robot: FoundRobot) => {
    setError('');
    setPhase('connecting');
    try {
      await connectRobot(robot.id);
      deviceRef.current = robot;
      setDevice(robot);
      setStatus(await readRobotStatus(robot.id));
      setPhase('connected');
      loadNetworks(robot.id);
    } catch (connectError) {
      await disconnectRobot(robot.id);
      reset();
      setError(`Could not connect: ${message(connectError)}`);
    }
  }, [loadNetworks, reset]);

  const disconnect = useCallback(async () => {
    if (deviceRef.current) await disconnectRobot(deviceRef.current.id);
    reset();
  }, [reset]);

  const refreshNetworks = useCallback(async (pin?: string) => {
    if (!deviceRef.current) return;
    const id = deviceRef.current.id;
    try {
      await requestNetworkScan(id, pin);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await loadNetworks(id);
    } catch (scanError) {
      setError(message(scanError));
    }
  }, [loadNetworks]);

  const share = useCallback(async (options: { ssid: string; password: string; backend?: string; pin?: string }) => {
    if (!deviceRef.current) throw new Error('Connect to AgriBot over Bluetooth first.');
    setError('');
    await shareNetwork(deviceRef.current.id, options);
  }, []);

  return { supported, phase, robots, device, status, networks, error, scan, connect, disconnect, refreshNetworks, share };
}

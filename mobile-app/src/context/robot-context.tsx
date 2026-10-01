import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/auth-context';
import { getLatestScan, getRobotDashboard, getRobotPresence, getScans, RobotApiError, sendRobotCommand } from '@/services/robot-service';
import { connectRobotSocket, type RobotSocketStatus } from '@/services/robot-socket-service';
import type { CropScan, DashboardData, RobotCommandType, RobotPresence } from '@/types/robot';

const COMMAND_TIMEOUT_MS = 60000;

export type CommandState = { state: 'idle' | 'pending' | 'failed' | 'done'; message?: string };

type RobotContextValue = {
  dashboard: DashboardData | null;
  dashboardError: string;
  isLoading: boolean;
  socketStatus: RobotSocketStatus;
  presence: RobotPresence | null;
  latestScan: CropScan | null;
  scans: CropScan[];
  commands: Record<RobotCommandType, CommandState>;
  refresh: () => Promise<void>;
  runCommand: (type: RobotCommandType) => Promise<void>;
};

const RobotContext = createContext<RobotContextValue | undefined>(undefined);
const IDLE: Record<RobotCommandType, CommandState> = { scan: { state: 'idle' }, publish: { state: 'idle' } };

export function RobotProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState<RobotSocketStatus>('connecting');
  const [presence, setPresence] = useState<RobotPresence | null>(null);
  const [latestScan, setLatestScan] = useState<CropScan | null>(null);
  const [scans, setScans] = useState<CropScan[]>([]);
  const [commands, setCommands] = useState(IDLE);
  const pendingIds = useRef(new Map<string, RobotCommandType>());
  const timers = useRef(new Map<RobotCommandType, ReturnType<typeof setTimeout>>());

  const setCommand = useCallback((type: RobotCommandType, value: CommandState) => {
    setCommands((current) => ({ ...current, [type]: value }));
    const timer = timers.current.get(type);
    if (timer) clearTimeout(timer);
    if (value.state === 'done') {
      // Let the success state show briefly, then return to idle.
      timers.current.set(type, setTimeout(() => setCommands((current) => ({ ...current, [type]: { state: 'idle' } })), 2500));
    }
  }, []);

  const handleAuthError = useCallback(async (error: unknown) => {
    if (error instanceof RobotApiError && error.status === 401) {
      await logout();
      return true;
    }
    return false;
  }, [logout]);

  const refresh = useCallback(async () => {
    const [dashboardResult, presenceResult, latestResult, scansResult] = await Promise.allSettled([
      getRobotDashboard(), getRobotPresence(), getLatestScan(), getScans(),
    ]);
    if (dashboardResult.status === 'fulfilled') {
      setDashboard(dashboardResult.value);
      setDashboardError('');
    } else if (!(await handleAuthError(dashboardResult.reason))) {
      setDashboardError(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : 'Could not load robot data.');
    }
    if (presenceResult.status === 'fulfilled') setPresence(presenceResult.value);
    if (latestResult.status === 'fulfilled') setLatestScan(latestResult.value);
    if (scansResult.status === 'fulfilled') setScans(scansResult.value);
  }, [handleAuthError]);

  useEffect(() => {
    if (!isAuthenticated) {
      setDashboard(null);
      setPresence(null);
      setLatestScan(null);
      setScans([]);
      setIsLoading(true);
      return;
    }

    let isActive = true;
    let disconnect: (() => void) | undefined;

    (async () => {
      await refresh();
      if (!isActive) return;
      setIsLoading(false);
      try {
        const close = await connectRobotSocket({
          onData: (data) => {
            if (!isActive) return;
            setDashboard(data);
            setDashboardError('');
          },
          onStatus: (status) => isActive && setSocketStatus(status),
          onPresence: (value) => isActive && setPresence(value),
          onScan: (scan) => {
            if (!isActive) return;
            setLatestScan(scan);
            setScans((current) => [{ ...scan, image: undefined }, ...current.filter((item) => item.id !== scan.id)].slice(0, 12));
            setCommand('scan', { state: 'done', message: scan.summary.label });
          },
          onCommandResult: (result) => {
            const type = pendingIds.current.get(result.id);
            if (!type || !isActive) return;
            pendingIds.current.delete(result.id);
            setCommand(type, result.ok ? { state: 'done', message: result.message ?? undefined } : { state: 'failed', message: result.message ?? 'AgriBot could not complete the request.' });
          },
          onReconnect: () => refresh(),
          onUnauthorized: () => logout(),
        });
        if (isActive) disconnect = close;
        else close();
      } catch {
        if (isActive) setSocketStatus('offline');
      }
    })();

    return () => {
      isActive = false;
      disconnect?.();
    };
  }, [isAuthenticated, logout, refresh, setCommand]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const runCommand = useCallback(async (type: RobotCommandType) => {
    setCommand(type, { state: 'pending' });
    try {
      const command = await sendRobotCommand(type);
      pendingIds.current.set(command.id, type);
      timers.current.set(type, setTimeout(() => {
        if (!pendingIds.current.has(command.id)) return;
        pendingIds.current.delete(command.id);
        setCommands((current) => ({ ...current, [type]: { state: 'failed', message: 'AgriBot did not respond in time.' } }));
      }, COMMAND_TIMEOUT_MS));
    } catch (error) {
      if (await handleAuthError(error)) return;
      setCommand(type, { state: 'failed', message: error instanceof Error ? error.message : 'Could not reach AgriBot.' });
    }
  }, [handleAuthError, setCommand]);

  const value = useMemo(() => ({
    dashboard, dashboardError, isLoading, socketStatus, presence, latestScan, scans, commands, refresh, runCommand,
  }), [dashboard, dashboardError, isLoading, socketStatus, presence, latestScan, scans, commands, refresh, runCommand]);

  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>;
}

export function useRobot() {
  const context = useContext(RobotContext);
  if (!context) throw new Error('useRobot must be used inside RobotProvider');
  return context;
}

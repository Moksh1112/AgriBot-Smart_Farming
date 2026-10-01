import * as SecureStore from 'expo-secure-store';
import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from '@/constants/api';
import { AUTH_TOKEN_KEY } from '@/context/auth-context';
import type { CropScan, DashboardData, RobotCommandResult, RobotPresence } from '@/types/robot';

export type RobotSocketStatus = 'connecting' | 'live' | 'offline';

type RobotSocketHandlers = {
  onData: (data: DashboardData) => void;
  onStatus: (status: RobotSocketStatus) => void;
  onUnauthorized: () => void | Promise<void>;
  onPresence?: (presence: RobotPresence) => void;
  onScan?: (scan: CropScan) => void;
  onCommandResult?: (result: RobotCommandResult) => void;
  onReconnect?: () => void;
};

export async function connectRobotSocket(handlers: RobotSocketHandlers) {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

  if (!token) {
    handlers.onUnauthorized();
    throw new Error('Authentication token is not available.');
  }

  handlers.onStatus('connecting');

  const socket: Socket = io(API_BASE_URL, { auth: { token } });
  let hasConnected = false;

  const handleConnect = () => {
    handlers.onStatus('live');
    // Re-sync anything missed while the socket was down.
    if (hasConnected) handlers.onReconnect?.();
    hasConnected = true;
  };
  const handleData = (data: DashboardData) => handlers.onData(data);
  const handlePresence = (presence: RobotPresence) => handlers.onPresence?.(presence);
  const handleScan = (scan: CropScan) => handlers.onScan?.(scan);
  const handleCommand = (result: RobotCommandResult) => handlers.onCommandResult?.(result);
  const handleDisconnect = () => handlers.onStatus('offline');
  const handleConnectionError = (error: Error) => {
    handlers.onStatus('offline');
    if (error.message === 'Socket authentication failed.') {
      handlers.onUnauthorized();
    }
  };

  socket.on('connect', handleConnect);
  socket.on('robot:data', handleData);
  socket.on('robot:status', handlePresence);
  socket.on('robot:detection', handleScan);
  socket.on('robot:command', handleCommand);
  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleConnectionError);

  return () => {
    socket.off('connect', handleConnect);
    socket.off('robot:data', handleData);
    socket.off('robot:status', handlePresence);
    socket.off('robot:detection', handleScan);
    socket.off('robot:command', handleCommand);
    socket.off('disconnect', handleDisconnect);
    socket.off('connect_error', handleConnectionError);
    socket.disconnect();
  };
}

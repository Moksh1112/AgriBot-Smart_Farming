import { io, type Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '@/constants/api';
import { AUTH_TOKEN_KEY } from '@/context/auth-context';
import type { DashboardData } from '@/data/mock-data';

export type RobotSocketStatus = 'connecting' | 'live' | 'offline';

type RobotSocketHandlers = {
  onData: (data: DashboardData) => void;
  onStatus: (status: RobotSocketStatus) => void;
  onUnauthorized: () => void | Promise<void>;
};

export async function connectRobotSocket(handlers: RobotSocketHandlers) {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

  if (!token) {
    handlers.onUnauthorized();
    throw new Error('Authentication token is not available.');
  }

  handlers.onStatus('connecting');

  const socket: Socket = io(API_BASE_URL, {
    auth: { token },
  });

  const handleConnect = () => handlers.onStatus('live');
  const handleData = (data: DashboardData) => handlers.onData(data);
  const handleDisconnect = () => handlers.onStatus('offline');
  const handleConnectionError = (error: Error) => {
    handlers.onStatus('offline');
    if (error.message === 'Socket authentication failed.') {
      handlers.onUnauthorized();
    }
  };

  socket.on('connect', handleConnect);
  socket.on('robot:data', handleData);
  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleConnectionError);

  return () => {
    socket.off('connect', handleConnect);
    socket.off('robot:data', handleData);
    socket.off('disconnect', handleDisconnect);
    socket.off('connect_error', handleConnectionError);
    socket.disconnect();
  };
}

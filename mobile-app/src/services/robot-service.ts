import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '@/constants/api';
import { AUTH_TOKEN_KEY } from '@/context/auth-context';
import type { CropScan, DashboardData, HistoryPoint, HistoryRange, RobotCommandType, RobotPresence } from '@/types/robot';

export class RobotApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RobotApiError';
    this.status = status;
  }
}

type ApiResponse<T> = { success: boolean; message?: string; data?: T };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  if (!token) throw new RobotApiError('Your session has expired. Please log in again.', 401);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
    });
  } catch {
    throw new RobotApiError('Unable to reach the AgriBot server. Check that it is running and connected to the same network.');
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (response.status === 401) throw new RobotApiError('Your session has expired. Please log in again.', 401);
  if (!response.ok || !body?.success) {
    throw new RobotApiError(body?.message || 'The AgriBot server returned an unexpected response.', response.status);
  }
  return body.data as T;
}

export async function getRobotDashboard(): Promise<DashboardData> {
  const data = await request<DashboardData>('/api/robot/dashboard');
  if (!data) throw new RobotApiError('Robot dashboard data is not available.');
  return data;
}

export async function getRobotHistory(range: HistoryRange) {
  return (await request<{ range: HistoryRange; readings: HistoryPoint[] }>(`/api/robot/history?range=${range}`)).readings;
}

export function getRobotPresence() {
  return request<RobotPresence>('/api/robot/status');
}

export function sendRobotCommand(type: RobotCommandType) {
  return request<{ id: string; type: RobotCommandType }>('/api/robot/commands', { method: 'POST', body: JSON.stringify({ type }) });
}

export function getLatestScan() {
  return request<CropScan | null>('/api/robot/detections/latest');
}

export function getScans(limit = 12) {
  return request<CropScan[]>(`/api/robot/detections?limit=${limit}`);
}

export function getScan(id: string) {
  return request<CropScan>(`/api/robot/detections/${id}`);
}

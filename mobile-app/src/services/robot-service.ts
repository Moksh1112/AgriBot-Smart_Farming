import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '@/constants/api';
import { AUTH_TOKEN_KEY } from '@/context/auth-context';
import type { DashboardData } from '@/data/mock-data';

export class RobotApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RobotApiError';
    this.status = status;
  }
}

type DashboardResponse = {
  success: boolean;
  message?: string;
  data?: DashboardData;
};

export async function getRobotDashboard(): Promise<DashboardData> {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

  if (!token) {
    throw new RobotApiError('Your session has expired. Please log in again.', 401);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/robot/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new RobotApiError('Unable to reach the AgriBot server. Check that it is running and connected to the same network.');
  }

  let body: DashboardResponse | null = null;
  try {
    body = (await response.json()) as DashboardResponse;
  } catch {
    body = null;
  }

  if (response.status === 401) {
    throw new RobotApiError('Your session has expired. Please log in again.', 401);
  }

  if (!response.ok || !body?.success || !body.data) {
    throw new RobotApiError(body?.message || 'Robot dashboard data is not available.', response.status);
  }

  return body.data;
}

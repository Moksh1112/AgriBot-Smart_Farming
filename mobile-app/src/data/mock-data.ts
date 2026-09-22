export interface SensorData {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  ph: number | null;
}

export interface RobotData {
  status: 'online' | 'offline';
  lastUpdated: string;
}

export interface RobotLocation {
  latitude: number;
  longitude: number;
}

export interface DashboardData {
  sensors: SensorData;
  robot: RobotData;
  location: RobotLocation;
}

export type DashboardDataState = {
  status: 'loading' | 'ready' | 'empty' | 'error';
  data: DashboardData | null;
  errorMessage?: string;
};

const mockDashboardData: DashboardData = {
  sensors: {
    soilMoisture: 48,
    temperature: 29,
    humidity: 64,
    rainfall: 0,
    ph: null,
  },
  robot: {
    status: 'online',
    lastUpdated: 'Just now',
  },
  location: {
    latitude: 19.076,
    longitude: 72.8777,
  },
};

export function getMockDashboardData(): DashboardData {
  return mockDashboardData;
}

export const mockRobotLocation = mockDashboardData.location;

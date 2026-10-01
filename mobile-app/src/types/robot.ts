export type { DashboardData, RobotData, RobotLocation, SensorData } from '@/data/mock-data';

export type HistoryRange = 'hour' | 'day' | 'week';

export type HistoryPoint = {
  at: string;
  samples: number;
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  ph: number | null;
};

export type ScanStatus = 'healthy' | 'disease' | 'none';

export type LeafDetection = {
  classId: number;
  label: string;
  confidence: number;
  box: [number, number, number, number];
};

export type CropScan = {
  id: string;
  summary: { status: ScanStatus; label: string; confidence: number };
  detections: LeafDetection[];
  width?: number;
  height?: number;
  inferenceMs?: number;
  source?: string;
  createdAt: string;
  image?: string | null;
};

// Shape of the heartbeat the Pi sends (pi/agribot_service.py AgriBot.status).
export type PiInfo = {
  version?: string;
  capabilities?: { camera: string | null; model: boolean; sensors: 'hardware' | 'simulated'; ble: boolean };
  errors?: Record<string, string>;
  network?: { state: string; ssid: string | null; ip: string | null; internet: boolean | null };
  backend?: { url: string; connected: boolean; error: string | null };
};

export type RobotPresence = {
  online: boolean;
  lastSeenAt: string | null;
  info: PiInfo | null;
  pendingCommands: { id: string; type: RobotCommandType }[];
};

export type RobotCommandType = 'scan' | 'publish';

export type RobotCommandResult = { id: string; ok: boolean; message: string | null };

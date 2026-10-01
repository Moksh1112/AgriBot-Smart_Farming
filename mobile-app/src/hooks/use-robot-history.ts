import { useEffect, useRef, useState } from 'react';

import { useRobot } from '@/context/robot-context';
import { getRobotHistory } from '@/services/robot-service';
import type { HistoryPoint, HistoryRange } from '@/types/robot';

const MIN_REFRESH_MS = 20000;

/** Loads bucketed history and refreshes it as new live readings arrive. */
export function useRobotHistory(range: HistoryRange) {
  const { dashboard } = useRobot();
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetch = useRef<{ range: HistoryRange; at: number } | null>(null);
  const lastUpdated = dashboard?.robot.lastUpdated;

  useEffect(() => {
    const previous = lastFetch.current;
    if (previous && previous.range === range && Date.now() - previous.at < MIN_REFRESH_MS) return;
    lastFetch.current = { range, at: Date.now() };
    if (!previous || previous.range !== range) setLoading(true);
    // Responses for a range the user has already left are ignored.
    const isCurrent = () => lastFetch.current?.range === range;
    getRobotHistory(range)
      .then((data) => isCurrent() && setPoints(data))
      .catch(() => isCurrent() && setPoints([]))
      .finally(() => isCurrent() && setLoading(false));
  }, [range, lastUpdated]);

  return { points, loading };
}

export function useRobotOnline() {
  const { presence, dashboard } = useRobot();
  if (presence) return presence.online;
  // Without heartbeat data, fall back to how fresh the last reading is.
  const updated = dashboard?.robot.lastUpdated ? new Date(dashboard.robot.lastUpdated).getTime() : 0;
  return Date.now() - updated < 2 * 60 * 1000;
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useRealtimeTelemetryBridge
 * Connects frontend R3F canvas components to backend state in real-time.
 * Supports:
 * - Direct manual overrides
 * - Real-time polling fallback / simulated WebSocket channel
 * - Dynamic playback speed (e.g. 0.25x for slow-mo footwork breakdown)
 */
export function useRealtimeTelemetryBridge({
  initialAction = 'stance',
  initialSpeed = 1.0,
  autoSync = false,
  syncIntervalMs = 4000,
} = {}) {
  const [telemetry, setTelemetry] = useState({
    currentAction: initialAction,
    playbackSpeed: initialSpeed,
    stanceProfile: 'orthodox',
    targetZone: 'head',
    cadenceBpm: 120,
    isLiveFeedback: false,
    lastUpdated: Date.now(),
  });

  const [isConnected, setIsConnected] = useState(false);
  const timerRef = useRef(null);

  const fetchBackendState = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry/ws-mock', { cache: 'no-store' });
      if (!res.ok) throw new Error('Telemetry fetch error');
      const data = await res.json();
      setTelemetry((prev) => ({
        ...prev,
        ...data,
        lastUpdated: Date.now(),
      }));
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, []);

  // Sync with backend on demand or interval
  useEffect(() => {
    if (!autoSync) {
      setIsConnected(true);
      return;
    }

    fetchBackendState();
    timerRef.current = setInterval(fetchBackendState, syncIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoSync, syncIntervalMs, fetchBackendState]);

  const setAction = useCallback((action) => {
    setTelemetry((prev) => ({
      ...prev,
      currentAction: action,
      lastUpdated: Date.now(),
    }));
  }, []);

  const setPlaybackSpeed = useCallback((speed) => {
    setTelemetry((prev) => ({
      ...prev,
      playbackSpeed: speed,
      lastUpdated: Date.now(),
    }));
  }, []);

  return {
    ...telemetry,
    isConnected,
    setAction,
    setPlaybackSpeed,
    refreshState: fetchBackendState,
  };
}

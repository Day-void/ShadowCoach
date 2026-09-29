'use client';

import { useEffect, useRef, useState } from 'react';
import { useCoachStore } from '@/lib/store/useCoachStore';
import { useBiometrics } from '@/lib/hooks/useBiometrics';
import { drawSkeleton } from '@/lib/utils/drawSkeleton';

// Tracking type metadata — maps each mode to its display label and accent color classes
const TRACKING_META = {
  punch: { label: 'Strike Focus', color: 'text-amber-400', border: 'border-amber-500/60', bg: 'bg-amber-950/50', ring: 'ring-amber-500/30' },
  squat: { label: 'Leg Drive Focus', color: 'text-yellow-300', border: 'border-yellow-500/60', bg: 'bg-yellow-950/40', ring: 'ring-yellow-500/30' },
  slip:  { label: 'Defense Focus', color: 'text-amber-300', border: 'border-amber-400/60', bg: 'bg-amber-950/40', ring: 'ring-amber-400/30' },
  freestyle: { label: 'Freestyle', color: 'text-yellow-400', border: 'border-yellow-400/40', bg: 'bg-yellow-950/20', ring: 'ring-yellow-400/20' },
};

export default function CoachCamera() {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const workerRef  = useRef(null);
  const busyRef    = useRef(false);
  const streamRef  = useRef(null);
  const calibrationRef    = useRef(false);
  const workerReadyRef    = useRef(false);
  const trackingTypeRef   = useRef('freestyle');
  const offscreenCanvasRef = useRef(null);

  const { calculateAngle } = useBiometrics();
  const {
    evaluatePunchState,
    evaluateSquatForm,
    evaluateSlipDefense,
    audioFeedback,
    repCount,
    squatCount,
    slipCount,
    timeLeft,
    isTimerRunning,
    startTimer,
    stopTimer,
    activeRoutine,
    currentRoundIndex,
    speak,
    theme,
  } = useCoachStore();

  const [isCalibrated,  setIsCalibrated]  = useState(false);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [fatalError,    setFatalError]    = useState(null);

  const activeRound       = activeRoutine?.rounds?.[currentRoundIndex];
  const activeTrackingType = activeRound?.trackingType || 'freestyle';
  const meta              = TRACKING_META[activeTrackingType] || TRACKING_META.freestyle;
  const totalRounds       = activeRoutine?.rounds?.length || 0;

  // Keep tracking type ref in sync without re-subscribing the worker effect
  useEffect(() => {
    trackingTypeRef.current = activeTrackingType;
  }, [activeTrackingType]);

  // Camera + Worker initialisation
  useEffect(() => {
    let cancelled = false;
    const videoElement = videoRef.current;

    workerRef.current = new Worker('/poseWorker.js', { type: 'module' });
    workerRef.current.postMessage({ type: 'INIT' });

    workerRef.current.onmessage = (event) => {
      const { type } = event.data;

      if (type === 'READY') {
        workerReadyRef.current = true;
        setIsWorkerReady(true);
        return;
      }

      if (type === 'INIT_ERROR') {
        setFatalError(`Pose tracking failed to load (${event.data.error}). Reload the page or check your connection.`);
        return;
      }

      if (type === 'PROCESS_ERROR') {
        console.warn('Pose detection frame error:', event.data.error);
        return;
      }

      if (type !== 'POSE_RESULTS' || !event.data.landmarks) return;

      const landmarks = event.data.landmarks;
      const leftHip   = landmarks[23];
      const leftAnkle = landmarks[27];

      if (!leftHip || !leftAnkle || leftHip.visibility < 0.6 || leftAnkle.visibility < 0.6) {
        if (calibrationRef.current) {
          calibrationRef.current = false;
          setIsCalibrated(false);
          speak('Step back. Lower body obscured.');
        }
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) drawSkeleton(ctx, landmarks, false);
        }
        return;
      }

      if (!calibrationRef.current) {
        calibrationRef.current = true;
        setIsCalibrated(true);
        speak('Position optimal. Form tracking activated.');
      }

      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        if (ctx) {
          const w = videoRef.current.videoWidth  || 480;
          const h = videoRef.current.videoHeight || 360;
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
          drawSkeleton(ctx, landmarks, calibrationRef.current);
        }
      }

      const currentTracking = trackingTypeRef.current;
      const trackPunch = currentTracking === 'punch'    || currentTracking === 'freestyle';
      const trackSquat = currentTracking === 'squat'    || currentTracking === 'freestyle';
      const trackSlip  = currentTracking === 'slip'     || currentTracking === 'freestyle';

      if (trackPunch) {
        const lS = landmarks[11], lE = landmarks[13], lW = landmarks[15];
        if (lS && lE && lW) evaluatePunchState(calculateAngle(lS, lE, lW), lW.y, lS.y);
      }
      if (trackSquat) {
        const lH = landmarks[23], lK = landmarks[25], lA = landmarks[27];
        if (lH && lK && lA) evaluateSquatForm(calculateAngle(lH, lK, lA));
      }
      if (trackSlip) {
        const lS = landmarks[11], rS = landmarks[12];
        if (lS && rS) evaluateSlipDefense((lS.x + rS.x) / 2, (lS.y + rS.y) / 2);
      }
    };

    navigator.mediaDevices
      .getUserMedia({ video: { width: 480, height: 360 }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoElement) videoElement.srcObject = stream;
      })
      .catch((err) => {
        const reason =
          err?.name === 'NotAllowedError'  ? 'Camera permission denied. Allow access and reload.' :
          err?.name === 'NotFoundError'    ? 'No camera detected on this device.' :
                                             'Could not access your camera.';
        setFatalError(reason);
      });

    const sendFrame = async () => {
      if (busyRef.current || !workerReadyRef.current || !videoRef.current ||
          videoRef.current.readyState < 2 || !workerRef.current) return;
      busyRef.current = true;
      try {
        // Reuse a single offscreen canvas to avoid GC pressure
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
          offscreenCanvasRef.current.width = 320;
          offscreenCanvasRef.current.height = 240;
        }
        const ctx = offscreenCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 320, 240);
          const bitmap = await createImageBitmap(offscreenCanvasRef.current);
          workerRef.current.postMessage({ type: 'PROCESS_FRAME', imageFrame: bitmap }, [bitmap]);
        }
      } catch (err) {
        console.warn('Frame capture pipeline warning:', err);
      } finally {
        busyRef.current = false;
      }
    };

    const interval = setInterval(sendFrame, 60);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (workerRef.current) workerRef.current.terminate();
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      if (videoElement) videoElement.srcObject = null;
    };
  }, [calculateAngle, evaluatePunchState, evaluateSquatForm, evaluateSlipDefense, speak]);

  const isLight = theme === 'light';
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Stat card: dims if tracking type doesn't match current round
  const StatCard = ({ label, value, active, exact, accent }) => (
    <div
      className={`relative p-3 rounded-xl text-center transition-all duration-300 ${
        exact
          ? (isLight ? 'bg-amber-50 border-2 border-amber-500/70 ring-2 ring-amber-400/30 shadow-md' : `${meta.bg} border-2 ${meta.border} ring-2 ${meta.ring} shadow-lg`)
          : active
          ? (isLight ? 'bg-stone-50 border border-stone-200' : 'bg-[#14141a] border border-[#2a2a36]')
          : (isLight ? 'bg-stone-100/60 border border-stone-200 opacity-40' : 'bg-[#0f0f13] border border-[#1a1a22] opacity-30')
      }`}
    >
      {exact && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
      )}
      <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-0.5">{label}</p>
      <p className={`text-2xl font-black font-mono ${accent}`}>{value}</p>
      {exact && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 block mt-0.5">
          Active Target
        </span>
      )}
    </div>
  );

  return (
    <div
      className="p-5 rounded-2xl shadow-2xl w-full transition-colors duration-200"
      style={{
        background: isLight ? '#ffffff' : '#0f0f13',
        border: `1px solid ${isLight ? '#dee2e6' : '#2a2a36'}`,
        color: isLight ? '#1e2022' : '#ffffff',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black tracking-tight flex items-center gap-2 uppercase">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          AI Vision Biometrics
        </h2>
        <span
          className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${meta.color} ${meta.border}`}
          style={{ backgroundColor: 'rgba(212,175,55,0.06)' }}
        >
          {meta.label}
        </span>
      </div>

      {/* Calibration Banner */}
      {fatalError ? (
        <div className="mb-3 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
          {fatalError}
        </div>
      ) : !isWorkerReady ? (
        <div className="mb-3 p-2 rounded-lg text-center text-[11px] font-bold tracking-widest uppercase transition-all bg-amber-950/20 text-stone-400 border border-[#2a2a36] flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>Synchronizing Neural Vision Engine…</span>
        </div>
      ) : (
        <div className={`mb-3 p-2 rounded-lg text-center text-[11px] font-bold tracking-widest uppercase transition-all ${
          isCalibrated
            ? 'bg-amber-950/30 text-amber-400 border border-amber-700/40'
            : 'bg-red-950/30 text-red-400 border border-red-800/40'
        }`}>
          {isCalibrated ? '● Subject Locked & Calibrated' : '▲ Full Body Required — Step Back'}
        </div>
      )}

      {/* Camera Viewport — Brushed Gold Border */}
      <div
        className="relative rounded-xl overflow-hidden scale-x-[-1] bg-black aspect-[4/3]"
        style={{ border: '2px solid rgba(212,175,55,0.45)', boxShadow: '0 0 24px rgba(212,175,55,0.10)' }}
      >
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover block" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none object-cover" />
        {/* Gold corner accents */}
        {['top-0 left-0 border-t border-l','top-0 right-0 border-t border-r','bottom-0 left-0 border-b border-l','bottom-0 right-0 border-b border-r'].map((cls, i) => (
          <span key={i} className={`absolute w-4 h-4 ${cls} border-amber-500/70`} />
        ))}
      </div>

      {/* Timer HUD */}
      <div
        className="mt-4 p-4 rounded-xl space-y-2.5 transition-colors duration-200"
        style={{
          background: isLight ? '#f8f9fa' : '#09090c',
          border: `1px solid ${isLight ? '#dee2e6' : '#2a2a36'}`,
        }}
      >
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
          <span style={{ color: isLight ? '#6c757d' : '#a1a1aa' }}>
            {totalRounds > 0 ? `Round ${currentRoundIndex + 1} / ${totalRounds}` : 'Free Practice'}
          </span>
          <span style={{ color: isLight ? '#8a6e0c' : '#f59e0b' }}>{meta.label}</span>
        </div>

        {totalRounds > 0 && (
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ background: isLight ? '#e9ecef' : '#1a1a22' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${((currentRoundIndex + 1) / totalRounds) * 100}%`,
                background: 'linear-gradient(90deg, #b7962e, #f59e0b)',
              }}
            />
          </div>
        )}

        <p
          className="text-sm font-bold truncate pt-0.5"
          style={{ color: isLight ? '#111215' : '#e4e4e7' }}
        >
          {activeRound?.name || 'No Protocol Loaded'}
        </p>

        {activeRound?.coachingCue && (
          <p
            className="text-[11px] italic leading-snug line-clamp-2 px-1"
            style={{ color: isLight ? '#6c757d' : '#a1a1aa' }}
          >
            &ldquo;{activeRound.coachingCue}&rdquo;
          </p>
        )}

        <p
          className="text-5xl font-black font-mono text-center tracking-tight"
          style={{
            color: isLight ? '#b7962e' : '#d4af37',
            textShadow: isLight ? '0 0 16px rgba(183,150,46,0.25)' : '0 0 24px rgba(212,175,55,0.4)',
          }}
        >
          {fmt(timeLeft)}
        </p>

        <button
          onClick={isTimerRunning ? stopTimer : startTimer}
          className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] ${
            isTimerRunning
              ? 'bg-red-950/60 hover:bg-red-900/70 border border-red-800/50 text-red-300'
              : isLight
              ? 'border border-amber-600/40 text-amber-900 hover:border-amber-600 hover:text-amber-950'
              : 'border border-amber-700/50 text-amber-300 hover:border-amber-500 hover:text-amber-200'
          }`}
          style={!isTimerRunning ? {
            background: isLight ? 'linear-gradient(135deg, #fef9e7, #fef3c7)' : 'linear-gradient(135deg, #1a1508, #261e0a)',
            boxShadow: isLight ? '0 2px 8px rgba(183,150,46,0.15)' : 'none',
          } : {}}
        >
          {isTimerRunning ? '⏸ Pause Circuit' : '⚡ Ignite Session'}
        </button>
      </div>

      {/* Biometric Counters */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCard
          label="Jabs"
          value={repCount}
          active={activeTrackingType === 'punch' || activeTrackingType === 'freestyle'}
          exact={activeTrackingType === 'punch'}
          accent={isLight ? 'text-amber-600' : 'text-amber-400'}
        />
        <StatCard
          label="Squats"
          value={squatCount}
          active={activeTrackingType === 'squat' || activeTrackingType === 'freestyle'}
          exact={activeTrackingType === 'squat'}
          accent={isLight ? 'text-amber-700' : 'text-yellow-300'}
        />
        <StatCard
          label="Defended"
          value={slipCount}
          active={activeTrackingType === 'slip' || activeTrackingType === 'freestyle'}
          exact={activeTrackingType === 'slip'}
          accent={isLight ? 'text-amber-600' : 'text-amber-300'}
        />
      </div>

      {/* Live Audio Coach */}
      <div
        className="mt-3 p-3.5 rounded-xl text-center relative overflow-hidden transition-colors"
        style={{
          background: isLight ? 'linear-gradient(135deg, #fef9e7, #fffdfa)' : 'linear-gradient(135deg, #100e00, #1a1508)',
          border: `1px solid ${isLight ? 'rgba(183,150,46,0.25)' : 'rgba(212,175,55,0.2)'}`,
        }}
      >
        <div className="absolute top-2 right-2 flex gap-0.5 items-end h-3">
          {[1,2,3,2,1].map((h, i) => (
            <span
              key={i}
              className="w-0.5 rounded-full bg-amber-500 animate-pulse"
              style={{ height: `${h * 4}px`, animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
        <p
          className="font-black uppercase tracking-widest text-[10px] mb-1"
          style={{ color: isLight ? '#8a6e0c' : '#d97706' }}
        >
          Live Audio Coach
        </p>
        <p
          className="text-xs font-medium min-h-[34px] flex items-center justify-center leading-snug"
          style={{ color: isLight ? '#212529' : '#e4e4e7' }}
        >
          {audioFeedback}
        </p>
      </div>
    </div>
  );
}

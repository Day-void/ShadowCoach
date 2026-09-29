'use client';

import { useEffect, useRef } from 'react';
import { useCoachStore } from '@/lib/store/useCoachStore';
import { Trophy, Flame, Zap, RotateCcw, PlusCircle, X, Shield, Activity, Star } from 'lucide-react';

export default function WorkoutCompletionModal({ onNewWorkout }) {
  const {
    isCompleted,
    dismissCompletion,
    resetSession,
    repCount,
    squatCount,
    slipCount,
    sessionSecondsElapsed,
    activeRoutine,
    totalLifetimeStats,
    theme,
  } = useCoachStore();

  const isLight = theme === 'light';
  const dialogRef = useRef(null);

  // Escape key handler + focus trap on mount
  useEffect(() => {
    if (!isCompleted) return;
    const handleKey = (e) => { if (e.key === 'Escape') dismissCompletion(); };
    document.addEventListener('keydown', handleKey);
    // Focus the dialog on mount for screen readers
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [isCompleted, dismissCompletion]);

  if (!isCompleted) return null;

  const totalReps = repCount + squatCount + slipCount;
  const mins = Math.max(1, Math.round(sessionSecondsElapsed / 60));
  const estimatedCalories = Math.round((sessionSecondsElapsed / 60) * 9.5 + totalReps * 0.35);

  const formatDuration = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2,'0')}s`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
      aria-label="Workout Complete"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl outline-none transition-colors duration-200"
        style={{
          background: isLight ? 'linear-gradient(170deg, #ffffff 0%, #f8f9fa 100%)' : 'linear-gradient(170deg, #0f0f13 0%, #09090c 100%)',
          border: `1px solid ${isLight ? 'rgba(183,150,46,0.3)' : 'rgba(212,175,55,0.3)'}`,
          color: isLight ? '#111215' : '#ffffff',
        }}
      >
        {/* Top gold line accent */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #d4af37, #f59e0b, #d4af37, transparent)' }} />

        {/* Ambient gold glow blobs */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.15), transparent 70%)' }} />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.08), transparent 70%)' }} />

        {/* Close */}
        <button
          onClick={dismissCompletion}
          className="absolute top-4 right-4 p-2 rounded-full transition"
          style={{
            background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
            color: isLight ? '#6c757d' : '#a1a1aa',
          }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Trophy Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 gold-pulse"
              style={{ background: 'linear-gradient(135deg, #b7962e, #f59e0b, #d4af37)', boxShadow: '0 8px 32px rgba(212,175,55,0.4)' }}
            >
              <Trophy className="w-10 h-10 text-black" />
            </div>

            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <span
              className="text-xs font-black uppercase tracking-[0.2em] mb-1"
              style={{ color: isLight ? '#8a6e0c' : '#d4af37', textShadow: isLight ? 'none' : '0 0 12px rgba(212,175,55,0.6)' }}
            >
              Championship Secured
            </span>
            <h2
              className="text-2xl font-black tracking-tight"
              style={{ color: isLight ? '#111215' : '#ffffff' }}
            >
              Outstanding Performance!
            </h2>
            <p className="text-xs mt-1 max-w-xs" style={{ color: isLight ? '#6c757d' : '#a1a1aa' }}>
              {activeRoutine?.routineName || 'Apex Gold Combat Protocol'}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { icon: <Zap className="w-4 h-4" />, label: 'Total Output', value: totalReps, unit: 'Valid Reps', color: isLight ? '#8a6e0c' : '#d4af37' },
              { icon: <Flame className="w-4 h-4" />, label: 'Est. Burn', value: estimatedCalories, unit: 'Calories', color: '#f59e0b' },
              { icon: <Activity className="w-4 h-4" />, label: 'Active Time', value: formatDuration(sessionSecondsElapsed), unit: `${mins} min`, color: isLight ? '#b7962e' : '#fde68a', small: true },
            ].map((m, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl text-center"
                style={{
                  background: isLight ? '#ffffff' : '#0f0f13',
                  border: `1px solid ${isLight ? '#dee2e6' : '#2a2a36'}`,
                  boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                }}
              >
                <div className="flex items-center justify-center mb-1" style={{ color: m.color }}>
                  {m.icon}
                </div>
                <p className="text-[10px] uppercase font-bold mb-0.5" style={{ color: isLight ? '#6c757d' : '#71717a' }}>{m.label}</p>
                <p
                  className={`font-black ${m.small ? 'text-lg mt-1 font-mono' : 'text-2xl'}`}
                  style={{ color: isLight ? '#111215' : '#ffffff' }}
                >
                  {m.value}
                </p>
                <p className="text-[10px]" style={{ color: isLight ? '#868e96' : '#71717a' }}>{m.unit}</p>
              </div>
            ))}
          </div>

          {/* Biometric Breakdown */}
          <div
            className="rounded-2xl p-4 mb-5 space-y-3"
            style={{
              background: isLight ? '#ffffff' : '#09090c',
              border: `1px solid ${isLight ? '#dee2e6' : '#2a2a36'}`,
              boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
            }}
          >
            <h4
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: isLight ? '#8a6e0c' : '#d4af37' }}
            >
              Biometric Telemetry
            </h4>

            {[
              { dot: '#f59e0b', label: 'Punches Landed (Jabs)',       val: repCount,   accent: isLight ? '#d97706' : '#f59e0b' },
              { dot: isLight ? '#b7962e' : '#fde68a', label: 'Squats & Leg Drives', val: squatCount, accent: isLight ? '#8a6e0c' : '#fde68a' },
              { dot: '#d4af37', label: 'Defensive Slips & Ducks',     val: slipCount,  accent: isLight ? '#b7962e' : '#d4af37' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.dot }} />
                  <span style={{ color: isLight ? '#495057' : '#a1a1aa' }}>{row.label}</span>
                </div>
                <span className="font-black" style={{ color: row.accent }}>{row.val}</span>
              </div>
            ))}

            {/* Progress bars */}
            {totalReps > 0 && (
              <div className="space-y-1.5 pt-2" style={{ borderTop: `1px solid ${isLight ? '#e9ecef' : '#1a1a22'}` }}>
                {[
                  { val: repCount, color: '#f59e0b' },
                  { val: squatCount, color: isLight ? '#b7962e' : '#fde68a' },
                  { val: slipCount, color: '#d4af37' },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="w-full h-1 rounded-full overflow-hidden"
                    style={{ background: isLight ? '#e9ecef' : '#1a1a22' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(b.val / Math.max(totalReps, 1)) * 100}%`, background: b.color }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Lifetime stats */}
            <div
              className="flex items-center justify-between text-[11px] pt-2"
              style={{
                borderTop: `1px solid ${isLight ? '#e9ecef' : '#1a1a22'}`,
                color: isLight ? '#6c757d' : '#71717a',
              }}
            >
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" style={{ color: isLight ? '#8a6e0c' : '#d4af37' }} /> Career Telemetry
              </span>
              <span>
                {totalLifetimeStats?.jabs || 0} jabs &bull; {totalLifetimeStats?.squats || 0} sq. &bull; {totalLifetimeStats?.slips || 0} slips
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={resetSession}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: isLight ? '#f1f3f5' : '#14141a',
                border: `1px solid ${isLight ? '#dee2e6' : '#2a2a36'}`,
                color: isLight ? '#8a6e0c' : '#d4af37',
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Repeat Circuit
            </button>
            <button
              onClick={() => { dismissCompletion(); if (onNewWorkout) onNewWorkout(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm text-black transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #b7962e, #f59e0b, #d4af37)', boxShadow: '0 4px 20px rgba(212,175,55,0.35)' }}
            >
              <PlusCircle className="w-4 h-4" />
              New Routine
            </button>
          </div>
        </div>

        {/* Bottom gold line */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
      </div>
    </div>
  );
}

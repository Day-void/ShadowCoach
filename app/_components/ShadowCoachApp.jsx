'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import CoachCamera from './CoachCamera';
import WorkoutCompletionModal from './WorkoutCompletionModal';
import WorkoutAnimationDemo from './WorkoutAnimationDemo';
import {
  Flame, Award, Sparkles, Dumbbell, CheckCircle2,
  Sliders, RefreshCw, Clock, Target, ChevronDown, ChevronUp,
  ShieldCheck, Zap, Eye, Sun, Moon,
} from 'lucide-react';
import { useCoachStore } from '@/lib/store/useCoachStore';

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight',     label: 'Bodyweight Only' },
  { id: 'mat',            label: 'Workout Mat' },
  { id: 'dumbbells',      label: 'Dumbbells' },
  { id: 'jump rope',      label: 'Jump Rope' },
  { id: 'resistance bands', label: 'Resistance Bands' },
  { id: 'boxing gloves',  label: 'Boxing Gloves' },
];

const FITNESS_TIERS = [
  { id: 'beginner',     label: 'Beginner',     desc: 'Form, steady pace & fundamentals' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Balanced cardio combos & tactical speed' },
  { id: 'advanced',     label: 'Advanced',     desc: 'High-explosive output & rapid transitions' },
];

const TRACKING_BADGE = {
  punch:     { label: 'Strike',   color: '#f59e0b' },
  squat:     { label: 'Squat',    color: '#fde68a' },
  slip:      { label: 'Defense',  color: '#d4af37' },
  freestyle: { label: 'Freestyle', color: '#b7962e' },
};

function TrackingBadge({ type }) {
  const t = TRACKING_BADGE[type] || TRACKING_BADGE.freestyle;
  return (
    <span
      className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border"
      style={{ color: t.color, borderColor: `${t.color}55`, background: `${t.color}0f` }}
    >
      {t.label}
    </span>
  );
}

export default function ShadowCoachApp() {
  const setRoutine        = useCoachStore((s) => s.setRoutine);
  const activeRoutine     = useCoachStore((s) => s.activeRoutine);
  const currentRoundIndex = useCoachStore((s) => s.currentRoundIndex);
  const theme             = useCoachStore((s) => s.theme);
  const toggleTheme       = useCoachStore((s) => s.toggleTheme);

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);
  const [userLevel, setUserLevel] = useState('intermediate');
  const [selectedEquipment, setSelectedEquipment] = useState(['mat', 'dumbbells']);
  const [showConfig, setShowConfig] = useState(false);
  const [showDemo, setShowDemo] = useState(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
  }, [theme]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const toggleEquipment = useCallback((id) => {
    if (id === 'bodyweight') { setSelectedEquipment(['bodyweight']); return; }
    setSelectedEquipment((prev) => {
      const without = prev.filter((x) => x !== 'bodyweight');
      if (without.includes(id)) {
        const next = without.filter((x) => x !== id);
        return next.length ? next : ['bodyweight'];
      }
      return [...without, id];
    });
  }, []);

  const generateRoutine = useCallback(async () => {
    if (isLoading) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workout/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userLevel, availableEquipment: selectedEquipment }),
        signal: controller.signal,
      });

      let payload = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        payload = await response.json().catch(() => null);
      }

      if (!response.ok) {
        throw new Error(payload?.error || `Server responded with status ${response.status}`);
      }

      if (!payload || !Array.isArray(payload.rounds)) {
        throw new Error('Received malformed workout protocol from server.');
      }

      setRoutine(payload);
      setShowConfig(false);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userLevel, selectedEquipment, setRoutine]);

  const activeRound = activeRoutine?.rounds?.[currentRoundIndex];
  const nextRound   = activeRoutine?.rounds?.[currentRoundIndex + 1];

  const isLight = theme === 'light';

  return (
    <div
      className="min-h-screen font-sans transition-colors duration-200"
      style={{
        background: isLight ? '#f8f9fa' : '#09090c',
        color: isLight ? '#1a1a24' : '#ffffff',
      }}
    >

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-colors duration-200"
        style={{
          background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(9,9,12,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: isLight ? '1px solid rgba(183,150,46,0.2)' : '1px solid rgba(212,175,55,0.12)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #b7962e, #f59e0b)', boxShadow: '0 4px 16px rgba(212,175,55,0.35)' }}
          >
            <Flame className="w-5 h-5 text-black" />
          </div>
          <div>
            <span
              className="text-xl font-black tracking-tighter block leading-none"
              style={{ background: 'linear-gradient(90deg, #d4af37, #f59e0b, #d4af37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              ApexCombat.AI
            </span>
            <span
              className="text-[10px] font-medium uppercase tracking-widest"
              style={{ color: isLight ? '#6c757d' : '#71717a' }}
            >
              Vision-Guided Combat Conditioning
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold"
            style={{
              background: isLight ? 'rgba(212,175,55,0.1)' : 'rgba(212,175,55,0.06)',
              border: isLight ? '1px solid rgba(183,150,46,0.35)' : '1px solid rgba(212,175,55,0.2)',
              color: isLight ? '#8a6e0c' : '#d4af37',
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Biometrics Shield Active
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{
              background: isLight ? '#ffffff' : '#14141a',
              border: `1px solid ${isLight ? '#dee2e6' : '#2a2a36'}`,
              color: isLight ? '#495057' : '#c0c0c8',
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
            title={isLight ? 'Switch to Dark Obsidian Mode' : 'Switch to Light Championship Mode'}
            aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-600" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowDemo((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
            style={{
              background: showDemo
                ? (isLight ? 'rgba(183,150,46,0.12)' : 'rgba(212,175,55,0.15)')
                : (isLight ? '#ffffff' : '#14141a'),
              border: `1px solid ${showDemo
                ? (isLight ? '#b7962e' : 'rgba(212,175,55,0.5)')
                : (isLight ? '#dee2e6' : '#2a2a36')}`,
              color: showDemo
                ? (isLight ? '#8a6e0c' : '#d4af37')
                : (isLight ? '#495057' : '#c0c0c8'),
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Eye className="w-3.5 h-3.5" style={{ color: isLight ? '#b7962e' : '#d4af37' }} />
            {showDemo ? 'Hide Demo' : 'Form Demo'}
          </button>

          <button
            onClick={() => setShowConfig((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
            style={{
              background: isLight ? '#ffffff' : '#14141a',
              border: `1px solid ${isLight ? '#dee2e6' : '#2a2a36'}`,
              color: isLight ? '#495057' : '#c0c0c8',
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Sliders className="w-3.5 h-3.5" style={{ color: isLight ? '#b7962e' : '#d4af37' }} />
            Configure
            {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={generateRoutine}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            style={{ background: isLoading ? '#6b5500' : 'linear-gradient(135deg, #b7962e, #f59e0b, #d4af37)', boxShadow: '0 4px 20px rgba(212,175,55,0.3)' }}
          >
            {isLoading
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing...</>
              : <><Sparkles className="w-3.5 h-3.5" /> {activeRoutine ? 'Re-Roll Routine' : 'Generate AI Workout'}</>
            }
          </button>
        </div>
      </header>

      {/* ── Config Panel ────────────────────────────────────────────────── */}
      {showConfig && (
        <section
          className="px-6 py-6 transition-colors duration-200"
          style={{
            background: isLight ? '#ffffff' : '#0f0f13',
            borderBottom: isLight ? '1px solid #e9ecef' : '1px solid rgba(212,175,55,0.12)',
            boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
          }}
        >
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: isLight ? '#8a6e0c' : '#d4af37' }}>
                  <Dumbbell className="w-4 h-4" /> Combat Setup & Equipment Form
                </h2>
                <p className="text-xs mt-0.5" style={{ color: isLight ? '#6c757d' : '#71717a' }}>
                  Configure your tier and gear — the AI tailors every round to your loadout.
                </p>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="text-xs px-2.5 py-1 rounded-md transition"
                style={{ color: isLight ? '#495057' : '#a1a1aa' }}
              >
                Done
              </button>
            </div>

            {/* Tier Selection */}
            <div>
              <label
                className="text-[10px] font-black uppercase tracking-widest block mb-2"
                style={{ color: isLight ? '#6c757d' : '#71717a' }}
              >
                Fighter Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FITNESS_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setUserLevel(tier.id)}
                    className="p-3.5 rounded-xl text-left transition-all relative overflow-hidden"
                    style={{
                      background: userLevel === tier.id
                        ? (isLight ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.08)')
                        : (isLight ? '#f8f9fa' : '#0f0f13'),
                      border: `1px solid ${userLevel === tier.id
                        ? (isLight ? '#b7962e' : 'rgba(212,175,55,0.5)')
                        : (isLight ? '#e9ecef' : '#2a2a36')}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm" style={{ color: isLight ? '#1e2022' : '#ffffff' }}>
                        {tier.label}
                      </span>
                      {userLevel === tier.id && <CheckCircle2 className="w-4 h-4" style={{ color: isLight ? '#b7962e' : '#d4af37' }} />}
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: isLight ? '#6c757d' : '#71717a' }}>
                      {tier.desc}
                    </p>
                    {userLevel === tier.id && (
                      <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #d4af37, #f59e0b)' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <label
                className="text-[10px] font-black uppercase tracking-widest block mb-2"
                style={{ color: isLight ? '#6c757d' : '#71717a' }}
              >
                Available Gear
              </label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((item) => {
                  const on = selectedEquipment.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleEquipment(item.id)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                      style={{
                        background: on
                          ? (isLight ? 'rgba(183,150,46,0.14)' : 'rgba(212,175,55,0.15)')
                          : (isLight ? '#f1f3f5' : '#0f0f13'),
                        border: `1px solid ${on ? (isLight ? '#b7962e' : '#d4af37') : (isLight ? '#dee2e6' : '#2a2a36')}`,
                        color: on ? (isLight ? '#8a6e0c' : '#d4af37') : (isLight ? '#495057' : '#8a8a9a'),
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={generateRoutine}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs font-black px-4 py-2.5 rounded-xl text-black transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #b7962e, #f59e0b)', boxShadow: '0 2px 12px rgba(212,175,55,0.3)' }}
            >
              <Sparkles className="w-3.5 h-3.5" /> Apply & Generate Circuit
            </button>
          </div>
        </section>
      )}

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2">

        {/* Left: Routine Detail */}
        <div
          className="p-6 rounded-2xl lg:col-span-2 space-y-5 transition-colors duration-200"
          style={{
            background: isLight ? '#ffffff' : '#0f0f13',
            border: `1px solid ${isLight ? '#dee2e6' : 'rgba(212,175,55,0.12)'}`,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.04)' : 'none',
          }}
        >
          {/* Title */}
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md"
              style={{
                background: isLight ? 'rgba(183,150,46,0.1)' : 'rgba(212,175,55,0.08)',
                border: `1px solid ${isLight ? 'rgba(183,150,46,0.3)' : 'rgba(212,175,55,0.2)'}`,
                color: isLight ? '#8a6e0c' : '#d4af37',
              }}
            >
              {userLevel} · {selectedEquipment.join(', ')}
            </span>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight mt-3"
              style={{ color: isLight ? '#111215' : '#ffffff' }}
            >
              {activeRoutine?.routineName || 'Drill Track 01: Shadow & Squat Fusion'}
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: isLight ? '#6c757d' : '#a1a1aa' }}
            >
              {activeRoutine
                ? 'Custom AI routine loaded. Engage the camera to ignite your circuit.'
                : 'Targeting standard biomechanic extensions mixed with functional leg drive.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div
              className="p-6 rounded-2xl text-center space-y-4"
              style={{
                border: `1px solid ${isLight ? '#e9ecef' : 'rgba(212,175,55,0.2)'}`,
                background: isLight ? '#f8f9fa' : 'rgba(212,175,55,0.03)',
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}
              >
                <RefreshCw className="w-7 h-7 animate-spin" style={{ color: '#d4af37' }} />
              </div>
              <div>
                <h3 className="font-black text-base" style={{ color: isLight ? '#111215' : '#ffffff' }}>
                  AI Coach Architecting Your Routine
                </h3>
                <p className="text-xs mt-1" style={{ color: isLight ? '#6c757d' : '#a1a1aa' }}>
                  Synthesising combat rounds, biometric cues & duration pacing…
                </p>
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-12 gold-shimmer rounded-xl" style={{ opacity: 1 - (i - 1) * 0.25 }} />
                ))}
              </div>
            </div>
          )}

          {/* Objective Cards */}
          {!isLoading && (
            <div className="space-y-3">
              {/* Active */}
              <div
                className="p-4 rounded-xl relative overflow-hidden transition-colors"
                style={{
                  background: isLight ? '#fefcf6' : 'rgba(212,175,55,0.04)',
                  borderLeft: `3px solid ${isLight ? '#b7962e' : '#d4af37'}`,
                  borderTop: `1px solid ${isLight ? '#f1ebd8' : 'rgba(212,175,55,0.15)'}`,
                  borderRight: `1px solid ${isLight ? '#f1ebd8' : 'rgba(212,175,55,0.08)'}`,
                  borderBottom: `1px solid ${isLight ? '#f1ebd8' : 'rgba(212,175,55,0.08)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" style={{ color: isLight ? '#b7962e' : '#d4af37' }} />
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: isLight ? '#8a6e0c' : '#d4af37' }}
                    >
                      Active Objective{activeRoutine ? ` — Round ${currentRoundIndex + 1}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDemo((prev) => !prev)}
                      className="text-[10px] font-bold flex items-center gap-1 transition"
                      style={{ color: isLight ? '#b7962e' : '#fbbf24' }}
                    >
                      <Eye className="w-3 h-3" />
                      {showDemo ? 'Close Demo' : 'View Form Demo'}
                    </button>
                    {activeRound?.trackingType && <TrackingBadge type={activeRound.trackingType} />}
                  </div>
                </div>
                <h3
                  className="font-black text-base"
                  style={{ color: isLight ? '#111215' : '#ffffff' }}
                >
                  {activeRound?.name || 'Straight Left Jab & Stance Guard'}
                </h3>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: isLight ? '#6c757d' : '#a1a1aa' }}
                >
                  {activeRound?.coachingCue || 'Extend your arm fully and keep your trailing hand protecting your chin.'}
                </p>
              </div>

              {/* Workout Animation Demo */}
              {showDemo && (
                <div className="pt-1">
                  <WorkoutAnimationDemo
                    trackingType={activeRound?.trackingType || 'punch'}
                    onClose={() => setShowDemo(false)}
                  />
                </div>
              )}

              {/* Next / Last Round */}
              {nextRound ? (
                <div
                  className="p-4 rounded-xl opacity-80 transition-colors"
                  style={{
                    background: isLight ? '#f8f9fa' : '#0f0f13',
                    borderLeft: `3px solid ${isLight ? '#ced4da' : '#2a2a36'}`,
                    border: `1px solid ${isLight ? '#dee2e6' : '#1a1a22'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" style={{ color: isLight ? '#6c757d' : '#71717a' }} />
                      <span
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: isLight ? '#6c757d' : '#71717a' }}
                      >
                        Next Up — Round {currentRoundIndex + 2}
                      </span>
                    </div>
                    {nextRound.trackingType && <TrackingBadge type={nextRound.trackingType} />}
                  </div>
                  <h3
                    className="font-bold text-base"
                    style={{ color: isLight ? '#343a40' : '#d4d4d8' }}
                  >
                    {nextRound.name}
                  </h3>
                  <p
                    className="text-xs mt-1"
                    style={{ color: isLight ? '#6c757d' : '#71717a' }}
                  >
                    {nextRound.coachingCue}
                  </p>
                </div>
              ) : activeRoutine ? (
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: isLight ? '#fffdf5' : 'rgba(212,175,55,0.04)',
                    borderLeft: '3px solid rgba(212,175,55,0.5)',
                    border: `1px solid ${isLight ? '#f3eedb' : 'rgba(212,175,55,0.1)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>
                      Championship Round
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: isLight ? '#495057' : '#a1a1aa' }}>
                    Final drill. Push intensity — every second counts!
                  </p>
                </div>
              ) : (
                <div
                  className="p-4 rounded-xl opacity-60"
                  style={{
                    background: isLight ? '#f8f9fa' : '#0f0f13',
                    borderLeft: `3px solid ${isLight ? '#ced4da' : '#2a2a36'}`,
                    border: `1px solid ${isLight ? '#dee2e6' : '#1a1a22'}`,
                  }}
                >
                  <h3 className="font-bold text-base" style={{ color: isLight ? '#495057' : '#a1a1aa' }}>
                    Next Up: Alternating Sprawl / Burpees
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: isLight ? '#6c757d' : '#71717a' }}>
                    Rapid body descent to floor level — drops center of mass and forces explosive recovery.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Round Hierarchy / Timeline */}
          {activeRoutine?.rounds?.length > 0 && !isLoading && (
            <div
              className="rounded-xl p-4 transition-colors"
              style={{
                background: isLight ? '#f8f9fa' : '#09090c',
                border: `1px solid ${isLight ? '#dee2e6' : '#1a1a22'}`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: isLight ? '#6c757d' : '#71717a' }}
                >
                  Protocol Round Hierarchy
                </h4>
                <span className="text-[10px] font-mono font-bold" style={{ color: isLight ? '#8a6e0c' : '#d4af37' }}>
                  {currentRoundIndex + 1} / {activeRoutine.rounds.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {activeRoutine.rounds.map((round, idx) => {
                  const isCurrent = idx === currentRoundIndex;
                  const isPast    = idx < currentRoundIndex;
                  const tb        = TRACKING_BADGE[round.trackingType] || TRACKING_BADGE.freestyle;
                  return (
                    <div
                      key={round.id ?? idx}
                      className="flex items-center justify-between p-2.5 rounded-lg text-xs transition-all"
                      style={{
                        background: isCurrent
                          ? (isLight ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.07)')
                          : isPast
                          ? 'transparent'
                          : (isLight ? '#ffffff' : '#0f0f13'),
                        border: isCurrent
                          ? (isLight ? '1px solid #b7962e' : '1px solid rgba(212,175,55,0.35)')
                          : `1px solid ${isLight ? '#e9ecef' : '#1a1a22'}`,
                        opacity: isPast ? 0.45 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                          style={{
                            background: isCurrent ? '#d4af37' : isPast ? 'rgba(212,175,55,0.15)' : (isLight ? '#e9ecef' : '#1a1a22'),
                            color:      isCurrent ? '#000' : isPast ? (isLight ? '#8a6e0c' : '#d4af37') : (isLight ? '#6c757d' : '#5a5a6a'),
                          }}
                        >
                          {isPast ? '✓' : idx + 1}
                        </span>
                        <span
                          className={isPast ? 'line-through text-stone-400' : (isLight ? 'text-stone-800 font-medium' : 'text-stone-300')}
                        >
                          {round.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold" style={{ color: tb.color }}>{tb.label}</span>
                        <span className="text-[10px] font-mono" style={{ color: isLight ? '#6c757d' : '#71717a' }}>{round.durationSeconds}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coach Tip */}
          <div
            className="p-4 rounded-xl flex items-start gap-3 transition-colors"
            style={{
              background: isLight ? '#fdfdfd' : '#09090c',
              border: `1px solid ${isLight ? '#e9ecef' : '#1a1a22'}`,
            }}
          >
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{
                background: isLight ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.08)',
                border: `1px solid ${isLight ? 'rgba(183,150,46,0.3)' : 'rgba(212,175,55,0.2)'}`,
              }}
            >
              <Award className="w-5 h-5" style={{ color: isLight ? '#8a6e0c' : '#d4af37' }} />
            </div>
            <div>
              <h4 className="text-sm font-black" style={{ color: isLight ? '#111215' : '#ffffff' }}>
                Pro Combat Biomechanics Cue
              </h4>
              <p
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: isLight ? '#6c757d' : '#a1a1aa' }}
              >
                Ensure your camera captures from crown to ankles. Rotate your hips on straight punches
                and lower your centre of gravity under incoming strikes. Distance = accuracy.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Camera HUD */}
        <div className="lg:col-span-1">
          <CoachCamera />
        </div>
      </main>

      {/* Victory Modal */}
      <WorkoutCompletionModal onNewWorkout={() => setShowConfig(true)} />
    </div>
  );
}

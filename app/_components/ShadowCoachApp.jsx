'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import CoachCamera from './CoachCamera';
import WorkoutCompletionModal from './WorkoutCompletionModal';
import WorkoutAnimationDemo from './WorkoutAnimationDemo';
import {
  Flame, Award, Sparkles, Dumbbell, CheckCircle2,
  Sliders, RefreshCw, Clock, Target, ChevronDown, ChevronUp,
  ShieldCheck, Zap, Eye,
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

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);
  const [userLevel, setUserLevel] = useState('intermediate');
  const [selectedEquipment, setSelectedEquipment] = useState(['mat', 'dumbbells']);
  const [showConfig, setShowConfig] = useState(false);
  const [showDemo, setShowDemo] = useState(true);
  const abortControllerRef = useRef(null);

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

  return (
    <div className="min-h-screen text-white font-sans" style={{ background: '#09090c' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: 'rgba(9,9,12,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,175,55,0.12)' }}
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
              style={{ background: 'linear-gradient(90deg, #d4af37, #f59e0b, #fde68a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              ApexCombat.AI
            </span>
            <span className="text-[10px] text-stone-500 font-medium uppercase tracking-widest">
              Vision-Guided Combat Conditioning
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold"
            style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', color: '#d4af37' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Biometrics Shield Active
          </div>

          <button
            onClick={() => setShowDemo((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
            style={{
              background: showDemo ? 'rgba(212,175,55,0.15)' : '#14141a',
              border: `1px solid ${showDemo ? 'rgba(212,175,55,0.5)' : '#2a2a36'}`,
              color: showDemo ? '#d4af37' : '#c0c0c8',
            }}
          >
            <Eye className="w-3.5 h-3.5" style={{ color: '#d4af37' }} />
            {showDemo ? 'Hide Demo' : 'Form Demo'}
          </button>

          <button
            onClick={() => setShowConfig((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
            style={{ background: '#14141a', border: '1px solid #2a2a36', color: '#c0c0c8' }}
          >
            <Sliders className="w-3.5 h-3.5" style={{ color: '#d4af37' }} />
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
          className="px-6 py-6"
          style={{ background: '#0f0f13', borderBottom: '1px solid rgba(212,175,55,0.12)' }}
        >
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: '#d4af37' }}>
                  <Dumbbell className="w-4 h-4" /> Combat Setup & Equipment Form
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configure your tier and gear — the AI tailors every round to your loadout.
                </p>
              </div>
              <button onClick={() => setShowConfig(false)} className="text-xs text-stone-500 hover:text-white px-2 py-1 rounded-md transition">
                Done
              </button>
            </div>

            {/* Tier Selection */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2">Fighter Tier</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FITNESS_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setUserLevel(tier.id)}
                    className="p-3.5 rounded-xl text-left transition-all relative overflow-hidden"
                    style={{
                      background: userLevel === tier.id ? 'rgba(212,175,55,0.08)' : '#0f0f13',
                      border: `1px solid ${userLevel === tier.id ? 'rgba(212,175,55,0.5)' : '#2a2a36'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-white">{tier.label}</span>
                      {userLevel === tier.id && <CheckCircle2 className="w-4 h-4" style={{ color: '#d4af37' }} />}
                    </div>
                    <p className="text-[11px] text-stone-500 leading-snug">{tier.desc}</p>
                    {userLevel === tier.id && (
                      <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #d4af37, #f59e0b)' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2">Available Gear</label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((item) => {
                  const on = selectedEquipment.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleEquipment(item.id)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                      style={{
                        background: on ? 'rgba(212,175,55,0.15)' : '#0f0f13',
                        border: `1px solid ${on ? '#d4af37' : '#2a2a36'}`,
                        color: on ? '#d4af37' : '#8a8a9a',
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
          className="p-6 rounded-2xl lg:col-span-2 space-y-5"
          style={{ background: '#0f0f13', border: '1px solid rgba(212,175,55,0.12)' }}
        >
          {/* Title */}
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#d4af37' }}
            >
              {userLevel} · {selectedEquipment.join(', ')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3 text-white">
              {activeRoutine?.routineName || 'Drill Track 01: Shadow & Squat Fusion'}
            </h1>
            <p className="text-sm text-stone-500 mt-1">
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
            <div className="p-6 rounded-2xl text-center space-y-4" style={{ border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.03)' }}>
              <div
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}
              >
                <RefreshCw className="w-7 h-7 animate-spin" style={{ color: '#d4af37' }} />
              </div>
              <div>
                <h3 className="font-black text-white text-base">AI Coach Architecting Your Routine</h3>
                <p className="text-xs text-stone-500 mt-1">Synthesising combat rounds, biometric cues & duration pacing…</p>
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
                className="p-4 rounded-xl relative overflow-hidden"
                style={{ background: 'rgba(212,175,55,0.04)', borderLeft: '3px solid #d4af37', borderTop: '1px solid rgba(212,175,55,0.15)', borderRight: '1px solid rgba(212,175,55,0.08)', borderBottom: '1px solid rgba(212,175,55,0.08)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" style={{ color: '#d4af37' }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#d4af37' }}>
                      Active Objective{activeRoutine ? ` — Round ${currentRoundIndex + 1}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDemo((prev) => !prev)}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                    >
                      <Eye className="w-3 h-3" />
                      {showDemo ? 'Close Demo' : 'View Form Demo'}
                    </button>
                    {activeRound?.trackingType && <TrackingBadge type={activeRound.trackingType} />}
                  </div>
                </div>
                <h3 className="font-black text-white text-base">
                  {activeRound?.name || 'Straight Left Jab & Stance Guard'}
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
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
                  className="p-4 rounded-xl opacity-65"
                  style={{ background: '#0f0f13', borderLeft: '3px solid #2a2a36', border: '1px solid #1a1a22' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                        Next Up — Round {currentRoundIndex + 2}
                      </span>
                    </div>
                    {nextRound.trackingType && <TrackingBadge type={nextRound.trackingType} />}
                  </div>
                  <h3 className="font-bold text-stone-300 text-base">{nextRound.name}</h3>
                  <p className="text-xs text-stone-600 mt-1">{nextRound.coachingCue}</p>
                </div>
              ) : activeRoutine ? (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(212,175,55,0.04)', borderLeft: '3px solid rgba(212,175,55,0.4)', border: '1px solid rgba(212,175,55,0.1)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>
                      Championship Round
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">Final drill. Push intensity — every second counts!</p>
                </div>
              ) : (
                <div
                  className="p-4 rounded-xl opacity-40"
                  style={{ background: '#0f0f13', borderLeft: '3px solid #2a2a36', border: '1px solid #1a1a22' }}
                >
                  <h3 className="font-bold text-stone-400 text-base">Next Up: Alternating Sprawl / Burpees</h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Rapid body descent to floor level — drops center of mass and forces explosive recovery.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Round Hierarchy / Timeline */}
          {activeRoutine?.rounds?.length > 0 && !isLoading && (
            <div className="rounded-xl p-4" style={{ background: '#09090c', border: '1px solid #1a1a22' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500">Protocol Round Hierarchy</h4>
                <span className="text-[10px] font-mono" style={{ color: '#d4af37' }}>
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
                        background: isCurrent ? 'rgba(212,175,55,0.07)' : isPast ? 'transparent' : '#0f0f13',
                        border:     isCurrent ? '1px solid rgba(212,175,55,0.35)' : '1px solid #1a1a22',
                        opacity: isPast ? 0.4 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                          style={{
                            background: isCurrent ? '#d4af37' : isPast ? 'rgba(212,175,55,0.1)' : '#1a1a22',
                            color:      isCurrent ? '#000' : isPast ? '#d4af37' : '#5a5a6a',
                          }}
                        >
                          {isPast ? '✓' : idx + 1}
                        </span>
                        <span className={isPast ? 'line-through text-stone-600' : 'text-stone-300'}>{round.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono" style={{ color: tb.color }}>{tb.label}</span>
                        <span className="text-[10px] font-mono text-stone-600">{round.durationSeconds}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coach Tip */}
          <div
            className="p-4 rounded-xl flex items-start gap-3"
            style={{ background: '#09090c', border: '1px solid #1a1a22' }}
          >
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
            >
              <Award className="w-5 h-5" style={{ color: '#d4af37' }} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Pro Combat Biomechanics Cue</h4>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
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

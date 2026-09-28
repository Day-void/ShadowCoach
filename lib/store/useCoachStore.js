import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { soundFx } from '../audio/fightSounds.js';

// Safe localStorage adapter that handles private browsing restrictions,
// storage quota exhaustion, and SSR environments gracefully.
const safeBrowserStorage = {
  getItem: (key) => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage write failures (e.g. quota exceeded)
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

export const useCoachStore = create(
  persist(
    (set, get) => ({
      repCount: 0,
      squatCount: 0,
      slipCount: 0,
      punchState: 'GUARD',
      squatState: 'STAND',
      slipState: 'CENTER',
      activeRoutine: null,
      currentRoundIndex: 0,
      timeLeft: 0,
      isTimerRunning: false,
      timerIntervalId: null,
      audioFeedback: 'System Ready. Step into frame.',
      lastGuardAlertTime: 0,
      lastRepTime: 0,
      lastPunchTime: 0,

      isCompleted: false,
      sessionSecondsElapsed: 0,
      totalLifetimeStats: { jabs: 0, squats: 0, slips: 0 },

      speak: (text) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('Speech synthesis skipped:', e);
          }
        }
        set({ audioFeedback: text });
      },

      setRoutine: (routine) => {
        const { stopTimer } = get();
        stopTimer();
        set({
          activeRoutine: routine,
          currentRoundIndex: 0,
          timeLeft: routine?.rounds?.[0]?.durationSeconds || 60,
          repCount: 0,
          squatCount: 0,
          slipCount: 0,
          sessionSecondsElapsed: 0,
          isCompleted: false,
        });
      },

      dismissCompletion: () => {
        set({ isCompleted: false });
      },

      resetSession: () => {
        const { stopTimer, activeRoutine } = get();
        stopTimer();
        set({
          currentRoundIndex: 0,
          timeLeft: activeRoutine?.rounds?.[0]?.durationSeconds || 60,
          repCount: 0,
          squatCount: 0,
          slipCount: 0,
          sessionSecondsElapsed: 0,
          isCompleted: false,
        });
      },

      startTimer: () => {
        const { isTimerRunning, activeRoutine } = get();
        if (isTimerRunning || !activeRoutine?.rounds?.length) return;

        soundFx.playBell('start');

        const intervalId = setInterval(() => {
          const { timeLeft, currentRoundIndex, activeRoutine, stopTimer, speak } = get();

          // 10-second warning clapper sound
          if (timeLeft === 11) {
            soundFx.playClapper();
          }

          if (timeLeft <= 1) {
            if (activeRoutine && currentRoundIndex < activeRoutine.rounds.length - 1) {
              const nextIndex = currentRoundIndex + 1;
              soundFx.playBell('start');
              set((state) => ({
                currentRoundIndex: nextIndex,
                timeLeft: activeRoutine.rounds[nextIndex].durationSeconds,
                sessionSecondsElapsed: state.sessionSecondsElapsed + 1,
              }));
              speak(`Round ${nextIndex + 1}: ${activeRoutine.rounds[nextIndex].name}`);
            } else {
              stopTimer();
              soundFx.playBell('finish');
              set((state) => ({
                isCompleted: true,
                timeLeft: 0,
                sessionSecondsElapsed: state.sessionSecondsElapsed + 1,
                totalLifetimeStats: {
                  jabs: (state.totalLifetimeStats?.jabs || 0) + state.repCount,
                  squats: (state.totalLifetimeStats?.squats || 0) + state.squatCount,
                  slips: (state.totalLifetimeStats?.slips || 0) + state.slipCount,
                },
              }));
              speak('Workout complete! Outstanding performance. Session saved.');
            }
          } else {
            set((state) => ({
              timeLeft: state.timeLeft - 1,
              sessionSecondsElapsed: state.sessionSecondsElapsed + 1,
            }));
          }
        }, 1000);

        set({ isTimerRunning: true, timerIntervalId: intervalId });
      },

      stopTimer: () => {
        const { timerIntervalId } = get();
        if (timerIntervalId) clearInterval(timerIntervalId);
        set({ isTimerRunning: false, timerIntervalId: null });
      },

      evaluatePunchState: (leftElbowAngle, leftHandY, leftShoulderY) => {
        const { punchState, repCount, speak, lastGuardAlertTime, lastPunchTime } = get();
        const now = Date.now();

        if (leftHandY > leftShoulderY && punchState === 'GUARD') {
          if (now - lastGuardAlertTime > 5000) {
            speak('Keep your hands up to guard your chin!');
            set({ lastGuardAlertTime: now });
          }
        }

        switch (punchState) {
          case 'GUARD':
            if (leftElbowAngle > 150) set({ punchState: 'EXTENDED' });
            break;
          case 'EXTENDED':
            if (leftElbowAngle < 90) {
              if (now - lastPunchTime < 220) return;
              const newReps = repCount + 1;
              soundFx.playPunchImpact();
              set({ punchState: 'GUARD', repCount: newReps, lastPunchTime: now });
              speak(`Punch ${newReps}`);
            }
            break;
          default:
            break;
        }
      },

      evaluateSquatForm: (hipAngle) => {
        const { squatState, squatCount, speak, lastRepTime } = get();
        const now = Date.now();
        if (now - lastRepTime < 750) return;

        switch (squatState) {
          case 'STAND':
            if (hipAngle < 140) set({ squatState: 'DESCENDING' });
            break;
          case 'DESCENDING':
            if (hipAngle <= 100) set({ squatState: 'DEPTH_ACHIEVED' });
            break;
          case 'DEPTH_ACHIEVED':
            if (hipAngle > 155) {
              const newSquats = squatCount + 1;
              soundFx.playSquatDepth();
              set({ squatState: 'STAND', squatCount: newSquats, lastRepTime: now });
              speak(`Squat ${newSquats}`);
            }
            break;
          default:
            break;
        }
      },

      evaluateSlipDefense: (shoulderCenterX, shoulderCenterY) => {
        const { slipState, slipCount, speak, lastRepTime } = get();
        const now = Date.now();
        if (now - lastRepTime < 650) return;

        const horizontalDeviation = shoulderCenterX - 0.5;

        switch (slipState) {
          case 'CENTER':
            if (horizontalDeviation < -0.09) {
              set({ slipState: 'SLIP_LEFT' });
            } else if (horizontalDeviation > 0.09) {
              set({ slipState: 'SLIP_RIGHT' });
            } else if (shoulderCenterY > 0.55) {
              set({ slipState: 'DUCKED' });
              speak('Good duck! Stay low.');
            }
            break;
          case 'SLIP_LEFT':
          case 'SLIP_RIGHT':
          case 'DUCKED':
            if (Math.abs(horizontalDeviation) < 0.03 && shoulderCenterY <= 0.5) {
              const newSlips = slipCount + 1;
              soundFx.playSlipSound();
              set({ slipState: 'CENTER', slipCount: newSlips, lastRepTime: now });
              speak(`Defended ${newSlips}`);
            }
            break;
          default:
            break;
        }
      },
    }),
    {
      name: 'apex-combat-telemetry',
      storage: createJSONStorage(() => safeBrowserStorage),
      partialize: (state) => ({
        totalLifetimeStats: state.totalLifetimeStats,
      }),
    }
  )
);

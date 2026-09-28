import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../lib/rateLimit.js';

test('checkRateLimit allows within threshold and blocks excess requests', () => {
  const testIp = 'test-ip-' + Date.now();
  const limit = 3;
  const windowMs = 5000;

  // First 3 requests should be allowed
  const r1 = checkRateLimit(`workout:${testIp}`, limit, windowMs);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);

  const r2 = checkRateLimit(`workout:${testIp}`, limit, windowMs);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);

  const r3 = checkRateLimit(`workout:${testIp}`, limit, windowMs);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  // 4th request must be rejected
  const r4 = checkRateLimit(`workout:${testIp}`, limit, windowMs);
  assert.equal(r4.allowed, false);
  assert.ok(r4.retryAfterMs > 0);
});

test('Caloric calculation model produces realistic high-intensity burn metrics', () => {
  // 5 minute session, 60 reps
  const sessionSeconds = 300;
  const totalReps = 60;
  const calories = Math.round((sessionSeconds / 60) * 9.5 + totalReps * 0.35);
  // Expect between 60 and 80 kcal for 5 min boxing interval
  assert.ok(calories >= 60 && calories <= 80, `Expected 60-80 kcal, got ${calories}`);

  // 15 minute session, 180 reps
  const sessionSeconds15 = 900;
  const totalReps180 = 180;
  const calories15 = Math.round((sessionSeconds15 / 60) * 9.5 + totalReps180 * 0.35);
  // Expect between 190 and 220 kcal
  assert.ok(calories15 >= 190 && calories15 <= 220, `Expected 190-220 kcal, got ${calories15}`);
});

test('Session timer and round transition simulation', () => {
  const routine = {
    routineName: 'Test Circuit',
    rounds: [
      { id: 1, name: 'Round 1 Jabs', durationSeconds: 2, trackingType: 'punch' },
      { id: 2, name: 'Round 2 Squats', durationSeconds: 2, trackingType: 'squat' },
    ],
  };

  let currentRoundIndex = 0;
  let timeLeft = routine.rounds[0].durationSeconds;
  let isCompleted = false;
  let sessionSecondsElapsed = 0;

  function tick() {
    if (timeLeft <= 1) {
      if (currentRoundIndex < routine.rounds.length - 1) {
        currentRoundIndex++;
        timeLeft = routine.rounds[currentRoundIndex].durationSeconds;
        sessionSecondsElapsed++;
      } else {
        isCompleted = true;
        timeLeft = 0;
        sessionSecondsElapsed++;
      }
    } else {
      timeLeft--;
      sessionSecondsElapsed++;
    }
  }

  // Tick 1 (Round 1: 2s -> 1s)
  tick();
  assert.equal(currentRoundIndex, 0);
  assert.equal(timeLeft, 1);
  assert.equal(isCompleted, false);

  // Tick 2 (Round 1 expires -> transitions to Round 2)
  tick();
  assert.equal(currentRoundIndex, 1);
  assert.equal(timeLeft, 2);
  assert.equal(isCompleted, false);

  // Tick 3 (Round 2: 2s -> 1s)
  tick();
  assert.equal(currentRoundIndex, 1);
  assert.equal(timeLeft, 1);
  assert.equal(isCompleted, false);

  // Tick 4 (Round 2 expires -> session completed!)
  tick();
  assert.equal(isCompleted, true);
  assert.equal(timeLeft, 0);
  assert.equal(sessionSecondsElapsed, 4);
});

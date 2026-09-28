import test from 'node:test';
import assert from 'node:assert/strict';

// Port calculateAngle logic from lib/hooks/useBiometrics.js for direct algorithmic verification
function calculateAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return 0;

  const isValidCoord = (p) =>
    typeof p.x === 'number' && Number.isFinite(p.x) &&
    typeof p.y === 'number' && Number.isFinite(p.y);

  if (!isValidCoord(p1) || !isValidCoord(p2) || !isValidCoord(p3)) return 0;

  const z1 = typeof p1.z === 'number' && Number.isFinite(p1.z) ? p1.z : 0;
  const z2 = typeof p2.z === 'number' && Number.isFinite(p2.z) ? p2.z : 0;
  const z3 = typeof p3.z === 'number' && Number.isFinite(p3.z) ? p3.z : 0;

  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: z1 - z2 };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: z3 - z2 };
  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

  if (mag1 * mag2 === 0 || !Number.isFinite(mag1) || !Number.isFinite(mag2)) return 0;
  const angleRad = Math.acos(Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2))));
  return Number.isFinite(angleRad) ? (angleRad * 180) / Math.PI : 0;
}

test('calculateAngle computes accurate angles in 2D and 3D', () => {
  // Straight arm / 180 degrees
  const p1 = { x: 0, y: 1, z: 0 };
  const p2 = { x: 0, y: 0, z: 0 };
  const p3 = { x: 0, y: -1, z: 0 };
  assert.equal(Math.round(calculateAngle(p1, p2, p3)), 180);

  // Right angle / 90 degrees
  const q1 = { x: 1, y: 0, z: 0 };
  const q2 = { x: 0, y: 0, z: 0 };
  const q3 = { x: 0, y: 1, z: 0 };
  assert.equal(Math.round(calculateAngle(q1, q2, q3)), 90);

  // Guard position / acute angle ~45 degrees
  const r1 = { x: 1, y: 1, z: 0 };
  const r2 = { x: 0, y: 0, z: 0 };
  const r3 = { x: 1, y: 0, z: 0 };
  assert.equal(Math.round(calculateAngle(r1, r2, r3)), 45);
});

test('Punch state machine transitions properly and increments rep only upon retracting to guard', () => {
  let punchState = 'GUARD';
  let repCount = 0;

  function evaluatePunch(elbowAngle) {
    if (punchState === 'GUARD' && elbowAngle > 150) {
      punchState = 'EXTENDED';
    } else if (punchState === 'EXTENDED' && elbowAngle < 90) {
      punchState = 'GUARD';
      repCount += 1;
    }
  }

  // Initial guard position (elbow bent ~70 deg)
  evaluatePunch(70);
  assert.equal(punchState, 'GUARD');
  assert.equal(repCount, 0);

  // Extending jab
  evaluatePunch(120);
  assert.equal(punchState, 'GUARD'); // Not yet extended past 150
  evaluatePunch(160);
  assert.equal(punchState, 'EXTENDED');
  assert.equal(repCount, 0); // Not counted until retracted

  // Retracting jab back to guard
  evaluatePunch(110);
  assert.equal(punchState, 'EXTENDED');
  evaluatePunch(80);
  assert.equal(punchState, 'GUARD');
  assert.equal(repCount, 1);
});

test('Squat state machine verifies depth and ascending extension', () => {
  let squatState = 'STAND';
  let squatCount = 0;

  function evaluateSquat(hipAngle) {
    switch (squatState) {
      case 'STAND':
        if (hipAngle < 140) squatState = 'DESCENDING';
        break;
      case 'DESCENDING':
        if (hipAngle <= 100) squatState = 'DEPTH_ACHIEVED';
        break;
      case 'DEPTH_ACHIEVED':
        if (hipAngle > 155) {
          squatState = 'STAND';
          squatCount += 1;
        }
        break;
    }
  }

  // Standing upright (~170 deg)
  evaluateSquat(170);
  assert.equal(squatState, 'STAND');

  // Half-squat only (115 deg) - doesn't achieve depth <= 100 deg
  evaluateSquat(130);
  assert.equal(squatState, 'DESCENDING');
  evaluateSquat(115);
  assert.equal(squatState, 'DESCENDING');
  // Returning from half-squat without achieving depth
  evaluateSquat(160);
  assert.equal(squatCount, 0); // No rep awarded for shallow squat

  // Full depth squat (90 deg)
  evaluateSquat(135);
  evaluateSquat(90);
  assert.equal(squatState, 'DEPTH_ACHIEVED');
  evaluateSquat(160);
  assert.equal(squatState, 'STAND');
  assert.equal(squatCount, 1);
});

test('Tracking type filter isolation test', () => {
  // Simulates CoachCamera's tracking filter logic
  let jabs = 0;
  let squats = 0;
  let slips = 0;

  function processFrame(trackingType, movement) {
    const shouldTrackPunch = trackingType === 'punch' || trackingType === 'freestyle';
    const shouldTrackSquat = trackingType === 'squat' || trackingType === 'freestyle';
    const shouldTrackSlip = trackingType === 'slip' || trackingType === 'freestyle';

    if (shouldTrackPunch && movement === 'PUNCH') jabs++;
    if (shouldTrackSquat && movement === 'SQUAT') squats++;
    if (shouldTrackSlip && movement === 'SLIP') slips++;
  }

  // During a "punch" round: squats and slips should NOT trigger reps
  processFrame('punch', 'SQUAT');
  processFrame('punch', 'SLIP');
  assert.equal(squats, 0);
  assert.equal(slips, 0);

  processFrame('punch', 'PUNCH');
  assert.equal(jabs, 1);

  // During a "squat" round: punches should NOT trigger reps
  processFrame('squat', 'PUNCH');
  assert.equal(jabs, 1);
  processFrame('squat', 'SQUAT');
  assert.equal(squats, 1);

  // During a "slip" round: punches and squats should NOT trigger reps
  processFrame('slip', 'PUNCH');
  processFrame('slip', 'SQUAT');
  assert.equal(jabs, 1);
  assert.equal(squats, 1);
  processFrame('slip', 'SLIP');
  assert.equal(slips, 1);

  // During "freestyle" round: all movements trigger reps
  processFrame('freestyle', 'PUNCH');
  processFrame('freestyle', 'SQUAT');
  processFrame('freestyle', 'SLIP');
  assert.equal(jabs, 2);
  assert.equal(squats, 2);
  assert.equal(slips, 2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrackingType, VALID_TRACKING_TYPES } from '../app/api/workout/generate/route.js';

test('normalizeTrackingType correctly keeps explicit valid types', () => {
  assert.equal(normalizeTrackingType({ trackingType: 'punch' }), 'punch');
  assert.equal(normalizeTrackingType({ trackingType: 'squat' }), 'squat');
  assert.equal(normalizeTrackingType({ trackingType: 'slip' }), 'slip');
  assert.equal(normalizeTrackingType({ trackingType: 'freestyle' }), 'freestyle');
});

test('normalizeTrackingType cleans case and whitespace', () => {
  assert.equal(normalizeTrackingType({ trackingType: ' PUNCH ' }), 'punch');
  assert.equal(normalizeTrackingType({ trackingType: 'Squat' }), 'squat');
  assert.equal(normalizeTrackingType({ trackingType: 'SLIP' }), 'slip');
});

test('normalizeTrackingType normalizes common LLM phrasing variations', () => {
  assert.equal(normalizeTrackingType({ trackingType: 'punches' }), 'punch');
  assert.equal(normalizeTrackingType({ trackingType: 'jab combo' }), 'punch');
  assert.equal(normalizeTrackingType({ trackingType: 'squats' }), 'squat');
  assert.equal(normalizeTrackingType({ trackingType: 'slips & ducks' }), 'slip');
  assert.equal(normalizeTrackingType({ trackingType: 'head defense' }), 'slip');
});

test('normalizeTrackingType infers from round name and cue when trackingType is missing', () => {
  assert.equal(normalizeTrackingType({ name: 'Power Cross & Jab Drill' }), 'punch');
  assert.equal(normalizeTrackingType({ name: 'Deep Explosive Squats', coachingCue: 'Keep chest upright' }), 'squat');
  assert.equal(normalizeTrackingType({ name: 'Bob and Weave Defense', coachingCue: 'Duck under incoming hook' }), 'slip');
  assert.equal(normalizeTrackingType({ name: 'Shadow Boxing Freestyle', coachingCue: 'Mix up your combos' }), 'punch');
  assert.equal(normalizeTrackingType({ name: 'Burpee Sprawl Intervals', coachingCue: 'Drive hips forward' }), 'squat');
  assert.equal(normalizeTrackingType({ name: 'High Intensity Conditioning', coachingCue: 'Keep moving' }), 'freestyle');
});

test('VALID_TRACKING_TYPES contains the required 4 modes', () => {
  assert.ok(VALID_TRACKING_TYPES.has('punch'));
  assert.ok(VALID_TRACKING_TYPES.has('squat'));
  assert.ok(VALID_TRACKING_TYPES.has('slip'));
  assert.ok(VALID_TRACKING_TYPES.has('freestyle'));
});

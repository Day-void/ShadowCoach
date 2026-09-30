/**
 * Mock WebSocket & Real-Time Telemetry Bridge API
 * GET /api/telemetry/ws-mock
 *
 * Provides real-time synchronization state for martial arts 3D canvas animation:
 * - currentAction: 'stance' | 'jab' | 'cross' | 'kick' | 'squat' | 'slip'
 * - playbackSpeed: 0.25 (slow-motion footwork) | 0.5 | 1.0 | 1.5
 * - stanceProfile: 'orthodox' | 'southpaw'
 * - targetZone: 'head' | 'body' | 'low'
 * - cadenceBpm: 60 - 180
 * - isLiveFeedback: boolean
 */

export const runtime = 'nodejs';

let mockSequenceIndex = 0;
const ACTIONS_SEQUENCE = ['stance', 'jab', 'cross', 'kick', 'squat', 'slip'];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedAction = searchParams.get('action');
  const requestedSpeed = searchParams.get('speed');

  // Cycle actions periodically if none specifically requested
  const action = requestedAction && ACTIONS_SEQUENCE.includes(requestedAction)
    ? requestedAction
    : ACTIONS_SEQUENCE[mockSequenceIndex % ACTIONS_SEQUENCE.length];
  
  if (!requestedAction) {
    mockSequenceIndex++;
  }

  const speed = requestedSpeed ? parseFloat(requestedSpeed) : 1.0;

  const payload = {
    timestamp: Date.now(),
    currentAction: action,
    playbackSpeed: Math.max(0.1, Math.min(2.0, speed)),
    stanceProfile: 'orthodox',
    targetZone: action === 'kick' ? 'low' : action === 'jab' || action === 'cross' ? 'head' : 'body',
    cadenceBpm: Math.floor(110 + Math.random() * 30),
    isLiveFeedback: true,
    serverUptime: process.uptime(),
  };

  return Response.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}

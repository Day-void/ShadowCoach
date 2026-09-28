import Groq from 'groq-sdk';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit.js';

export const runtime = 'nodejs';

// Groq periodically decommissions models with fairly short notice — this
// project originally shipped with `llama3-70b-8192`, which Groq shut down
// in August 2025, and its recommended replacement `llama-3.3-70b-versatile`
// was itself shut down August 16, 2026. Keeping this configurable via env
// means a future deprecation is a config change, not a code change.
// Latest top-performing free models on Groq:
// Primary: `llama-3.3-70b-versatile` (70B parameters, state-of-the-art reasoning)
// Secondary: `llama-3.1-8b-instant` (8B parameters, 560 tokens/sec, high daily free quota)
// Tertiary: `openai/gpt-oss-120b`
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODELS = ['llama-3.1-8b-instant', 'openai/gpt-oss-120b'];
const RATE_LIMIT_WINDOW_MS = 60_000;

const VALID_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);
export const VALID_TRACKING_TYPES = new Set(['punch', 'squat', 'slip', 'freestyle']);

export function normalizeTrackingType(round) {
  const explicit = round?.trackingType?.toLowerCase?.().trim();
  if (explicit && VALID_TRACKING_TYPES.has(explicit)) return explicit;

  if (explicit) {
    if (explicit.includes('punch') || explicit.includes('jab') || explicit.includes('strike')) return 'punch';
    if (explicit.includes('squat') || explicit.includes('lunge') || explicit.includes('leg')) return 'squat';
    if (explicit.includes('slip') || explicit.includes('dodge') || explicit.includes('duck') || explicit.includes('defen')) return 'slip';
  }

  const name = (round?.name || '').toLowerCase();
  const cue = (round?.coachingCue || '').toLowerCase();

  // Check drill name first as primary intent
  if (
    name.includes('slip') ||
    name.includes('dodge') ||
    name.includes('duck') ||
    name.includes('bob') ||
    name.includes('weave') ||
    name.includes('defense') ||
    name.includes('defend')
  ) {
    return 'slip';
  }
  if (
    name.includes('squat') ||
    name.includes('lunge') ||
    name.includes('sprawl') ||
    name.includes('burpee') ||
    name.includes('leg')
  ) {
    return 'squat';
  }
  if (
    name.includes('punch') ||
    name.includes('jab') ||
    name.includes('cross') ||
    name.includes('hook') ||
    name.includes('uppercut') ||
    name.includes('strike') ||
    name.includes('shadow')
  ) {
    return 'punch';
  }

  // Fallback to coaching cue
  if (cue.includes('slip') || cue.includes('dodge') || cue.includes('duck') || cue.includes('weave')) {
    return 'slip';
  }
  if (cue.includes('squat') || cue.includes('lunge') || cue.includes('sprawl') || cue.includes('burpee')) {
    return 'squat';
  }
  if (cue.includes('punch') || cue.includes('jab') || cue.includes('cross') || cue.includes('uppercut')) {
    return 'punch';
  }

  return 'freestyle';
}

export function generateFallbackWorkout(userLevel, availableEquipment = []) {
  const isBeginner = userLevel === 'beginner';
  const isAdvanced = userLevel === 'advanced';
  const roundTime = isBeginner ? 45 : isAdvanced ? 75 : 60;
  const eqList = Array.isArray(availableEquipment) ? availableEquipment : [];
  const hasDumbbells = eqList.some((eq) => String(eq).toLowerCase().includes('dumbbell'));
  const hasRope = eqList.some((eq) => String(eq).toLowerCase().includes('rope'));

  return {
    routineName: `Apex Gold ${userLevel ? userLevel.toUpperCase() : 'INTERMEDIATE'} Protocol`,
    rounds: [
      {
        id: 1,
        name: 'Round 1: Stance Rhythm & Precision Jabs',
        durationSeconds: roundTime,
        trackingType: 'punch',
        coachingCue: 'Snap straight lead punches and keep trailing hand high on your chin.',
      },
      {
        id: 2,
        name: hasDumbbells ? 'Round 2: Loaded Combat Squats' : 'Round 2: Explosive Combat Squat Drives',
        durationSeconds: roundTime,
        trackingType: 'squat',
        coachingCue: 'Sink hips to 90 degrees and explode upward through heels.',
      },
      {
        id: 3,
        name: 'Round 3: Centerline Slips & Duck Counters',
        durationSeconds: roundTime,
        trackingType: 'slip',
        coachingCue: 'Shift your head 4 inches off the centerline and roll underneath.',
      },
      {
        id: 4,
        name: hasRope ? 'Round 4: Jump Rope & High-Cadence Shadow' : 'Round 4: Championship Combat Freestyle',
        durationSeconds: roundTime + 15,
        trackingType: 'freestyle',
        coachingCue: 'Continuous fluid output: flow between jabs, level drops, and slips.',
      },
    ],
  };
}

let groqClient = null;
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

export async function POST(request) {
  const limitPerMinute = Number(process.env.WORKOUT_RATE_LIMIT_PER_MINUTE) || 10;
  const ip = getClientIp(request);
  const rate = checkRateLimit(`workout:${ip}`, limitPerMinute, RATE_LIMIT_WINDOW_MS);
  if (!rate.allowed) {
    return Response.json(
      { error: 'Too many requests. Please wait before generating another routine.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 32 * 1024) {
    return Response.json({ error: 'Payload too large. Maximum size is 32KB.' }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { userLevel, availableEquipment } = body || {};
  if (typeof userLevel !== 'string' || !VALID_LEVELS.has(userLevel.toLowerCase().trim())) {
    return Response.json(
      { error: `Invalid payload. "userLevel" must be one of: ${[...VALID_LEVELS].join(', ')}.` },
      { status: 400 }
    );
  }
  const cleanLevel = userLevel.toLowerCase().trim();

  if (
    !Array.isArray(availableEquipment) ||
    availableEquipment.length > 20 ||
    !availableEquipment.every((item) => typeof item === 'string')
  ) {
    return Response.json(
      { error: 'Invalid payload. "availableEquipment" must be an array of strings (max 20 items).' },
      { status: 400 }
    );
  }

  const groq = getGroqClient();
  if (!groq) {
    // If no GROQ_API_KEY is configured in the environment, gracefully provide
    // an expertly tuned combat conditioning circuit rather than failing.
    const fallback = generateFallbackWorkout(cleanLevel, availableEquipment);
    return Response.json(fallback, {
      status: 200,
      headers: { 'X-Workout-Source': 'fallback-offline' },
    });
  }

  const equipmentList = availableEquipment.length
    ? availableEquipment
        .slice(0, 10)
        .map((item) => String(item).replace(/[^a-zA-Z0-9 -]/g, '').trim().slice(0, 30))
        .filter(Boolean)
        .join(', ') || 'bodyweight only'
    : 'bodyweight only';
  const primaryModel = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const candidateModels = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an elite combat sports conditioning coach. Generate home workouts blending Martial Arts and Gym metrics safely. Each round must specify a "trackingType" which can be: "punch", "squat", "slip", or "freestyle". You must respond with a JSON object exactly formatted like this: {"routineName":"String containing name","rounds":[{"id":1,"name":"Exercise Name","durationSeconds":60,"trackingType":"punch","coachingCue":"Form tracking guidance text"}]}',
          },
          {
            role: 'user',
            content: `Create a custom home workout matrix for a person at a ${cleanLevel} tier using only: ${equipmentList}. Provide between 3 to 5 engaging rounds with varied trackingTypes (punches, squats, defensive slips, and freestyle combat conditioning).`,
          },
        ],
        temperature: 0.6,
      });

      const raw = completion?.choices?.[0]?.message?.content;
      if (!raw) throw new Error('Groq returned an empty response.');

      const routineData = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (Array.isArray(routineData?.rounds)) {
        routineData.rounds = routineData.rounds.map((round, idx) => ({
          ...round,
          id: round.id ?? idx + 1,
          durationSeconds: Math.max(10, Math.min(300, Number(round.durationSeconds) || 60)),
          trackingType: normalizeTrackingType(round),
          coachingCue: round.coachingCue || 'Focus on smooth form and breathing.',
        }));
      }

      return Response.json(routineData, {
        status: 200,
        headers: { 'X-Workout-Model': model },
      });
    } catch (error) {
      console.warn(`Groq generation failed on model ${model}:`, error?.message || error);
      lastError = error;
      // Continue to next candidate model in fallback cascade
    }
  }

  // If all models in the cascade failed, gracefully return high quality fallback
  console.error('All Groq candidate models failed. Returning expert fallback circuit:', lastError);
  const fallback = generateFallbackWorkout(userLevel, availableEquipment);
  return Response.json(fallback, {
    status: 200,
    headers: { 'X-Workout-Source': 'fallback-offline' },
  });
}

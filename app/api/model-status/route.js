/**
 * GET /api/model-status
 *
 * Checks which Groq models are currently alive by probing each candidate
 * with a minimal 1-token request. Returns a JSON payload that the client
 * can poll periodically to detect model deprecations without any code change.
 *
 * The route is intentionally cheap:
 *  - max_tokens: 1  (absolute minimum inference cost)
 *  - temperature: 0  (deterministic, fastest path through the model)
 *  - Cached at the edge for 10 minutes via Cache-Control so 1000 users
 *    don't all hit Groq simultaneously.
 */

export const runtime = 'nodejs';

const CANDIDATE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

const PROBE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let probeCache = null;
let probeCacheTs = 0;

async function probeModel(groqApiKey, model) {
  const start = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(8000), // 8-second hard timeout per probe
    });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      return {
        model,
        status: 'alive',
        latencyMs,
        tokensPerSec: data?.usage?.total_tokens
          ? Math.round(data.usage.total_tokens / (latencyMs / 1000))
          : null,
      };
    }
    const err = await res.json().catch(() => ({}));
    return {
      model,
      status: res.status === 404 || res.status === 400 ? 'deprecated' : 'error',
      httpStatus: res.status,
      errorCode: err?.error?.code || null,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      model,
      status: 'unreachable',
      error: e.message,
      latencyMs: Date.now() - start,
    };
  }
}

export async function GET() {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return Response.json(
      { error: 'GROQ_API_KEY not configured. Model status unavailable.' },
      { status: 503 }
    );
  }

  // Serve from in-process cache within TTL (avoids hammering Groq on every poll)
  const now = Date.now();
  if (probeCache && now - probeCacheTs < PROBE_TTL_MS) {
    return Response.json(probeCache, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
        'X-Cache': 'HIT',
      },
    });
  }

  // Probe all candidate models in parallel
  const results = await Promise.all(
    CANDIDATE_MODELS.map((m) => probeModel(groqApiKey, m))
  );

  const primary = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const primaryResult = results.find((r) => r.model === primary);

  const payload = {
    checkedAt: new Date().toISOString(),
    primary,
    primaryStatus: primaryResult?.status ?? 'unknown',
    models: results,
    recommendation:
      primaryResult?.status === 'alive'
        ? null
        : results.find((r) => r.status === 'alive')?.model ?? null,
  };

  // Update cache
  probeCache = payload;
  probeCacheTs = now;

  return Response.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
      'X-Cache': 'MISS',
    },
  });
}

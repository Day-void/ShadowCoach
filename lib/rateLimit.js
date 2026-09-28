// Lightweight in-memory rate limiter.
//
// This is deliberately simple: it's enough to stop a single client from
// hammering the (paid, rate-limited) Groq API from one server instance.
// It is NOT distributed — if you deploy to a platform that runs multiple
// server instances/regions (e.g. Vercel with multiple concurrent lambdas),
// each instance tracks its own counts, so the effective limit is
// "per-instance", not truly global. For a production-grade shared limit,
// swap this for Upstash Redis, Vercel KV, or similar.

const buckets = new Map();
const MAX_BUCKETS = 10000;

/**
 * @param {string} key - identifier to rate limit on (e.g. client IP)
 * @param {number} limit - max requests allowed within the window
 * @param {number} windowMs - window size in milliseconds
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    if (buckets.size >= MAX_BUCKETS) {
      // Evict oldest entry to prevent memory exhaustion under spoofing attack
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
    buckets.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count < limit) {
    bucket.count += 1;
    return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterMs: windowMs - (now - bucket.windowStart),
  };
}

// Periodically clear stale buckets so this Map doesn't grow forever on a
// long-lived server instance.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.windowStart > 5 * 60 * 1000) buckets.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

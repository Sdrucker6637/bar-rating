// In-memory per-key request counter for basic abuse throttling. State lives
// in module scope, so it only persists within a single warm serverless/edge
// instance — it won't coordinate across regions or cold starts, but it's
// enough to blunt a scripted flood without needing an external store.
const hits = new Map<string, { count: number; resetAt: number }>();

// Opportunistic cleanup so long-lived instances don't accumulate one entry
// per distinct IP forever.
const MAX_TRACKED_KEYS = 5000;

function sweepExpired(now: number) {
  if (hits.size <= MAX_TRACKED_KEYS) return;
  for (const [key, entry] of hits) {
    if (now >= entry.resetAt) hits.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const entry = hits.get(key);
  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

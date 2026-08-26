// Pure, testable description-enrichment pipeline logic — no React, no fetch,
// no Firebase. Shared by the client (src/lib/tour-context.tsx) and the Gemini
// route (src/app/api/gemini/route.ts) so the "is this description usable?"
// gate is byte-for-byte identical on both sides.
//
// Recovery model: a saved bar missing a usable description is NEVER abandoned
// for the session. It gets the standard prompt for up to 4 attempts with
// exponential backoff, then a SIMPLER fallback prompt (only description /
// tags / happyHour / neighborhood) for up to 3 attempts with longer backoff,
// and finally enters a slow self-pacing "deferred" pool that re-attempts it
// (fresh fallback phase) about once every DEFERRED_RETRY_DELAY. Every step in
// that schedule is recoverable — nextEnrichmentStep has no dead end — but the
// delays are long enough that a stuck venue can never cause a request storm.

/** True when a stored description is actually usable — the exact gate the
 *  Gemini route uses to accept an enrichment result (and its cached-return
 *  short-circuit). Kept here so the client's needsEnrichment check agrees
 *  with the server (the regex mirrors the original server-only gate). */
export function isUsefulDescription(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.trim().length > 35 &&
    !/^\s*[\[]/.test(value)
  );
}

/** Whether a saved bar should be queued for enrichment. Deliberately checks
 *  more than detailsFetched: a legacy record with detailsFetched=true but a
 *  missing, empty, short, or otherwise unusable description still re-enters
 *  the queue (this is what repairs old records on page load). */
export function needsEnrichment(bar: {
  description?: unknown;
  detailsFetched?: boolean;
}): boolean {
  return !isUsefulDescription(bar.description) || !bar.detailsFetched;
}

/** Max requests in flight at once — the bounded queue cap. */
export const DETAIL_FETCH_CONCURRENCY = 2;

/** Attempts with the full prompt before switching to the simpler fallback. */
export const STANDARD_ATTEMPT_COUNT = 4;
/** Wait AFTER a failed standard attempt n before retrying (attempt 1 →
 *  5s, … attempt 4 → 60s). */
export const STANDARD_RETRY_DELAYS = [5000, 15000, 30000, 60000] as const;

/** First attempt number that uses the fallback prompt. */
export const FALLBACK_START_ATTEMPT = STANDARD_ATTEMPT_COUNT + 1; // 5
/** Fallback-phase attempt slots (5-8). Attempts 5-7 retry with the simpler
 *  prompt after 2m/5m/10m; attempt 8 is the DEFERRED re-attempt slot — each
 *  deferred cycle re-runs exactly that one slot, so a permanently-stuck bar
 *  costs at most ~6 requests/hour rather than a full phase restart. */
export const FALLBACK_ATTEMPT_COUNT = 4;
/** Wait AFTER a failed fallback attempt 5/6/7 (2m → 5m → 10m). */
export const FALLBACK_RETRY_DELAYS = [120000, 300000, 600000] as const;
/** The deferred re-attempt slot (attempt 8) — the last fallback attempt. */
export const DEFERRED_ATTEMPT =
  FALLBACK_START_ATTEMPT + FALLBACK_ATTEMPT_COUNT - 1;

/** Pacing for the deferred pool — one fresh fallback cycle per bar at most
 *  every 10 minutes, so a persistently failing bar keeps getting a chance
 *  without hammering the provider. */
export const DEFERRED_RETRY_DELAY = 10 * 60 * 1000;

export interface EnrichmentStep {
  /** Attempt number to run next. */
  attempt: number;
  /** True once the simpler fallback prompt phase begins (attempt >= 5). */
  usingFallback: boolean;
  /** Wait before running the next attempt; null when entering the deferred
   *  pool (the caller then uses DEFERRED_RETRY_DELAY). */
  delayMs: number | null;
  /** True when the bar enters the slow deferred re-attempt pool. */
  deferred: boolean;
}

/** Given the attempt number that JUST failed, decide the next step. Never a
 *  dead end: attempts 1-4 retry the standard prompt, 5-7 retry the fallback
 *  prompt, and anything after that defers (re-attemptable later, starting a
 *  fresh fallback phase). */
/** Given the attempt number that JUST failed, decide the next step. Never a
 *  dead end: attempts 1-4 retry the standard prompt (5s/15s/30s/60s), the
 *  fallback prompt takes over at attempt 5 (2m/5m/10m waits), and the last
 *  fallback slot (DEFERRED_ATTEMPT) is the deferred re-attempt — failing it
 *  defers the bar for DEFERRED_RETRY_DELAY and then re-runs exactly that one
 *  slot, so a stuck bar keeps getting a chance without ever looping a full
 *  retry phase or hammering the provider. `usingFallback` describes the NEXT
 *  attempt (the one whose number is in `attempt`). */
export function nextEnrichmentStep(attempt: number): EnrichmentStep {
  if (attempt >= 1 && attempt <= STANDARD_ATTEMPT_COUNT) {
    return {
      attempt: attempt + 1,
      usingFallback: attempt + 1 >= FALLBACK_START_ATTEMPT,
      delayMs: STANDARD_RETRY_DELAYS[attempt - 1] ?? 60000,
      deferred: false,
    };
  }
  if (attempt < DEFERRED_ATTEMPT) {
    const fbIdx = attempt - FALLBACK_START_ATTEMPT; // 0..2 for attempts 5..7
    return {
      attempt: attempt + 1,
      usingFallback: true,
      delayMs: FALLBACK_RETRY_DELAYS[fbIdx] ?? 600000,
      deferred: false,
    };
  }
  return {
    attempt: DEFERRED_ATTEMPT,
    usingFallback: true,
    delayMs: null,
    deferred: true,
  };
}

/** Should a bar be enqueued right now? `pending` is the reservation set —
 *  every bar that is already queued, waiting on a retry timer, deferred, or
 *  in flight. Consulting it here (plus inside runDetailsFetch) is what makes
 *  the auto-fetch pass immune to onSnapshot updates: a bar can never be
 *  double-enqueued no matter how many times bars changes. */
export function shouldQueueBar(
  bar: { description?: unknown; detailsFetched?: boolean },
  opts: {
    pending: ReadonlySet<string>;
    id: string;
    forceRefresh?: boolean;
  },
): boolean {
  if (opts.pending.has(opts.id)) return false;
  return !!opts.forceRefresh || needsEnrichment(bar);
}

/** Build the Gemini prompt for a saved bar. The standard prompt requests the
 *  full detail set (including capacityHint); the fallback prompt — used after
 *  the standard attempts have failed — requests only the essentials, giving a
 *  stubborn bar a better chance of a shorter, acceptable answer. */
export function buildEnrichmentPrompt(
  bar: { name: string; address?: string | null; neighborhood?: string | null },
  usingFallback: boolean,
): string {
  const location = bar.address || bar.neighborhood || "New York City";
  const head = `You are a NYC bar description writer.\n\nThe bar "${bar.name}" located at "${location}" has already been verified as a real, currently open business via Google Places.\n\n`;
  if (usingFallback) {
    return `${head}Using only what you know about this specific venue, return ONLY JSON:\n\n{"description":"2-3 sentence description","tags":["3-5 lowercase vibe words"],"happyHour":"short string or null","neighborhood":"short neighborhood"}\n\nRules:\n- Do NOT invent or rename the business.\n- If you have no reliable information, set description to an empty string.`;
  }
  return `${head}Using only what you know about this specific venue, return ONLY JSON:\n\n{"description":"two to three sentences covering vibe, drink style, and notable characteristics","tags":["3 to 5 short lowercase vibe words"],"happyHour":"short string or null","neighborhood":"short neighborhood name","capacityHint":0}\n\nRules:\n- Do NOT invent or rename the business.\n- If you have no reliable information, set description to an empty string.\n- Do not include a mapsLink field.`;
}

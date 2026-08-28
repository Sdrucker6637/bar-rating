"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFERRED_RETRY_DELAY = exports.DEFERRED_ATTEMPT = exports.FALLBACK_RETRY_DELAYS = exports.FALLBACK_ATTEMPT_COUNT = exports.FALLBACK_START_ATTEMPT = exports.STANDARD_RETRY_DELAYS = exports.STANDARD_ATTEMPT_COUNT = exports.DETAIL_FETCH_CONCURRENCY = void 0;
exports.isUsefulDescription = isUsefulDescription;
exports.needsEnrichment = needsEnrichment;
exports.isSearchEnrichmentOk = isSearchEnrichmentOk;
exports.nextEnrichmentStep = nextEnrichmentStep;
exports.isVenueAppropriateForRating = isVenueAppropriateForRating;
exports.shouldQueueBar = shouldQueueBar;
exports.buildEnrichmentPrompt = buildEnrichmentPrompt;
/** True when a stored description is actually usable — the exact gate the
 *  Gemini route uses to accept an enrichment result (and its cached-return
 *  short-circuit). Kept here so the client's needsEnrichment check agrees
 *  with the server (the regex mirrors the original server-only gate). */
function isUsefulDescription(value) {
    return (typeof value === "string" &&
        value.trim().length > 35 &&
        !/^\s*[\[]/.test(value));
}
/** Whether a saved bar should be queued for enrichment. Deliberately checks
 *  more than detailsFetched: a legacy record with detailsFetched=true but a
 *  missing, empty, short, or otherwise unusable description still re-enters
 *  the queue (this is what repairs old records on page load). */
function needsEnrichment(bar) {
    return !isUsefulDescription(bar.description) || !bar.detailsFetched;
}
/** Whether a search/suggestion enrichment result counts as success. The
 *  Gemini route 200s empty Gemini output as a valid-looking all-empty object
 *  (normalizeSuggestion fills every field with a default), so a truthy object
 *  must NEVER be treated as enriched — only a real, usable description is
 *  success. This is the gate enrichSearchResult uses before merging anything
 *  into a search result or clearing its "finding details…" state. */
function isSearchEnrichmentOk(info) {
    return (!!info &&
        typeof info.description === "string" &&
        isUsefulDescription(info.description));
}
/** Max requests in flight at once — the bounded queue cap. */
exports.DETAIL_FETCH_CONCURRENCY = 2;
/** Attempts with the full prompt before switching to the simpler fallback. */
exports.STANDARD_ATTEMPT_COUNT = 4;
/** Wait AFTER a failed standard attempt n before retrying (attempt 1 →
 *  5s, … attempt 4 → 60s). */
exports.STANDARD_RETRY_DELAYS = [5000, 15000, 30000, 60000];
/** First attempt number that uses the fallback prompt. */
exports.FALLBACK_START_ATTEMPT = exports.STANDARD_ATTEMPT_COUNT + 1; // 5
/** Fallback-phase attempt slots (5-8). Attempts 5-7 retry with the simpler
 *  prompt after 2m/5m/10m; attempt 8 is the DEFERRED re-attempt slot — each
 *  deferred cycle re-runs exactly that one slot, so a permanently-stuck bar
 *  costs at most ~6 requests/hour rather than a full phase restart. */
exports.FALLBACK_ATTEMPT_COUNT = 4;
/** Wait AFTER a failed fallback attempt 5/6/7 (2m → 5m → 10m). */
exports.FALLBACK_RETRY_DELAYS = [120000, 300000, 600000];
/** The deferred re-attempt slot (attempt 8) — the last fallback attempt. */
exports.DEFERRED_ATTEMPT = exports.FALLBACK_START_ATTEMPT + exports.FALLBACK_ATTEMPT_COUNT - 1;
/** Pacing for the deferred pool — one fresh fallback cycle per bar at most
 *  every 10 minutes, so a persistently failing bar keeps getting a chance
 *  without hammering the provider. */
exports.DEFERRED_RETRY_DELAY = 10 * 60 * 1000;
/** Given the attempt number that JUST failed, decide the next step. Never a
 *  dead end: attempts 1-4 retry the standard prompt (5s/15s/30s/60s), the
 *  fallback prompt takes over at attempt 5 (2m/5m/10m waits), and the last
 *  fallback slot (DEFERRED_ATTEMPT) is the deferred re-attempt — failing it
 *  defers the bar for DEFERRED_RETRY_DELAY and then re-runs exactly that one
 *  slot, so a stuck bar keeps getting a chance without ever looping a full
 *  retry phase or hammering the provider. `usingFallback` describes the NEXT
 *  attempt (the one whose number is in `attempt`). */
function nextEnrichmentStep(attempt) {
    if (attempt >= 1 && attempt <= exports.STANDARD_ATTEMPT_COUNT) {
        return {
            attempt: attempt + 1,
            usingFallback: attempt + 1 >= exports.FALLBACK_START_ATTEMPT,
            delayMs: exports.STANDARD_RETRY_DELAYS[attempt - 1] ?? 60000,
            deferred: false,
        };
    }
    if (attempt < exports.DEFERRED_ATTEMPT) {
        const fbIdx = attempt - exports.FALLBACK_START_ATTEMPT; // 0..2 for attempts 5..7
        return {
            attempt: attempt + 1,
            usingFallback: true,
            delayMs: exports.FALLBACK_RETRY_DELAYS[fbIdx] ?? 600000,
            deferred: false,
        };
    }
    return {
        attempt: exports.DEFERRED_ATTEMPT,
        usingFallback: true,
        delayMs: null,
        deferred: true,
    };
}
/** Venue classification from Google Places types. Used to determine if a
 *  venue is appropriate for the Bar Rating app before sending to Gemini.
 *  Matches the Gemini prompt's explicit allowed classification list. */
const BAR_VENUE_TYPES = new Set([
    "bar",
    "night_club",
    "pub",
    "wine_bar",
    "cocktail_bar",
    "lounge",
    "restaurant",
]);
/** Check if a venue's Google Places types indicate it's a legitimate
 *  drinking/dining establishment appropriate for the Bar Rating app.
 *  Returns true if types include any bar/restaurant/nightlife category,
 *  or if types are empty/missing (legacy records without Places data). */
function isVenueAppropriateForRating(types) {
    // If no types provided, allow — legacy records or manual adds may not
    // have Places classification, and we don't want to block them.
    if (!types || types.length === 0)
        return true;
    // Check if any of the venue's types match our bar/restaurant categories
    return types.some((t) => BAR_VENUE_TYPES.has(t));
}
/** Should a bar be enqueued right now? `pending` is the reservation set —
 *  every bar that is already queued, waiting on a retry timer, deferred, or
 *  in flight. Consulting it here (plus inside runDetailsFetch) is what makes
 *  the auto-fetch pass immune to onSnapshot updates: a bar can never be
 *  double-enqueued no matter how many times bars changes. */
function shouldQueueBar(bar, opts) {
    if (opts.pending.has(opts.id))
        return false;
    return !!opts.forceRefresh || needsEnrichment(bar);
}
/** Build the Gemini prompt for a saved bar. The standard prompt requests the
 *  full detail set (including capacityHint); the fallback prompt — used after
 *  the standard attempts have failed — requests only the essentials, giving a
 *  stubborn bar a better chance of a shorter, acceptable answer.
 *
 *  IMPORTANT: The prompt NEVER claims the venue has been "verified as a bar"
 *  by Google Places or any other source. It asks Gemini to describe the venue
 *  ONLY from what it actually knows, and to return an empty description if it
 *  is uncertain. This prevents hallucinated descriptions for venues that may
 *  not be real bars (e.g. apartments, offices, or misidentified places).
 *
 *  The prompt now includes Google Places classification data (types, rating)
 *  so Gemini can ground its description in actual venue classification rather
 *  than guessing from the venue name alone. */
function buildEnrichmentPrompt(bar, usingFallback) {
    const location = bar.address || bar.neighborhood || "New York City";
    // Build venue context from Google Places data — this is the primary evidence
    // Gemini should use, NOT the venue name alone.
    const venueType = bar.types && bar.types.length > 0
        ? bar.types.slice(0, 5).join(", ")
        : "unknown";
    const ratingStr = bar.rating != null && bar.rating > 0
        ? `${bar.rating.toFixed(1)} stars`
        : "no rating";
    const venueContext = `Venue: "${bar.name}" at "${location}".\nGoogle Places classification: [${venueType}]. Rating: ${ratingStr}.\n\n`;
    if (usingFallback) {
        // The fallback prompt explicitly requires a usable description: the
        // client gates on isUsefulDescription (>35 chars), so an empty/null/short
        // or all-empty response is treated as a failure and retried — the prompt
        // must not hand the model an easy empty-string escape hatch.
        return `${venueContext}Using the Google Places classification above as PRIMARY EVIDENCE (not guessing from the name), write a REAL description and return ONLY JSON:\n\n{"description":"a genuine 2-3 sentence write-up (at least 40 characters) of the venue's vibe, drink style, and notable characteristics","tags":["3-5 lowercase vibe words"],"happyHour":"short string or null","neighborhood":"short neighborhood"}\n\nRules:\n- Use the Google Places classification types above to determine what kind of venue this is.\n- If the types do NOT include bar/night_club/pub/wine_bar/lounge/restaurant/cocktail_bar, this is NOT a bar — set description to an empty string.\n- Describe ONLY if the venue is a legitimate drinking/dining establishment.\n- Do NOT invent or guess based on the venue name alone.\n- Do NOT fabricate vibes, tags, happy hours, or neighborhood data.\n- If you are not confident this is a real bar/cocktail venue, set description to an empty string.\n- The description MUST be a real, informative write-up of 40+ characters — never empty, null, or a one-word stub.\n- If you have little information, keep the description brief but real — describe the venue's style and atmosphere based only on what you actually know, never returning an empty string, null, or a stub.`;
    }
    return `${venueContext}Using the Google Places classification above as PRIMARY EVIDENCE (not guessing from the name), return ONLY JSON:\n\n{"description":"two to three sentences covering vibe, drink style, and notable characteristics","tags":["3 to 5 short lowercase vibe words"],"happyHour":"short string or null","neighborhood":"short neighborhood name","capacityHint":0}\n\nRules:\n- Use the Google Places classification types above to determine what kind of venue this is.\n- If the types do NOT include bar/night_club/pub/wine_bar/lounge/restaurant/cocktail_bar, this is NOT a bar — set description to an empty string.\n- Describe ONLY if the venue is a legitimate drinking/dining establishment.\n- Do NOT invent or guess based on the venue name alone.\n- Do NOT fabricate vibes, tags, happy hours, neighborhood data, or capacity.\n- If you are not confident this is a real bar/cocktail venue, set description to an empty string.\n- Do not include a mapsLink field.`;
}

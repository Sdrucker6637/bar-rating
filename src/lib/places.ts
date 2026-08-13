import { SURPRISE_VIBES } from "./constants";
import type { PlaceResult } from "./types";

// Session-only cache: repeating the same vibe search (or the same manual
// lookup) within PLACES_CACHE_TTL_MS reuses the prior response instead of
// re-billing the Places API. Cleared on page reload — bars you've already
// saved never hit this path again anyway, since verification only happens
// once, at add-time, and the result is persisted to Firestore.
const placesCache = new Map<string, { time: number; results: PlaceResult[] }>();
const PLACES_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface FetchPlacesOptions {
  neighborhood?: string;
  address?: string;
  ballerMode?: boolean;
  exploreMode?: boolean;
  limit?: number;
  noCache?: boolean;
  exactLookup?: boolean;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
}

export async function fetchPlaces(
  query: string,
  options: FetchPlacesOptions = {},
): Promise<PlaceResult[]> {
  const {
    neighborhood,
    address,
    ballerMode,
    exploreMode,
    limit,
    noCache,
    exactLookup,
    centerLat,
    centerLng,
    radiusMeters,
  } = options;

  const cacheKey = JSON.stringify({
    query,
    neighborhood,
    address,
    ballerMode: !!ballerMode,
    exploreMode: !!exploreMode,
    limit: limit || 5,
    exactLookup: !!exactLookup,
    centerLat,
    centerLng,
    radiusMeters,
  });
  if (!noCache) {
    const cached = placesCache.get(cacheKey);
    if (cached && Date.now() - cached.time < PLACES_CACHE_TTL_MS)
      return cached.results;
  }
  try {
    const response = await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        neighborhood,
        address,
        ballerMode: !!ballerMode,
        exploreMode: !!exploreMode,
        limit: limit || 5,
        exactLookup: !!exactLookup,
        centerLat,
        centerLng,
        radiusMeters,
      }),
    });
    const results = await response.json();
    const safe = Array.isArray(results) ? (results as PlaceResult[]) : [];
    // Never memoize an empty result: like the server-side cache, the session
    // cache must not become proof that a place doesn't exist. Only non-empty
    // results are worth reusing within the session.
    if (!noCache && safe.length > 0)
      placesCache.set(cacheKey, { time: Date.now(), results: safe });
    return safe;
  } catch (e) {
    return [];
  }
}

export async function fetchBarSuggestions(
  vibeQuery: string,
  _groupSize: number,
  excludeNames: string[],
  ballerMode: boolean,
  exploreMode: boolean,
): Promise<PlaceResult[]> {
  const results = await fetchPlaces(vibeQuery || "great bar", {
    ballerMode,
    exploreMode,
    limit: 8,
  });
  return results
    .filter((r) => !excludeNames.includes(r.name))
    .slice(0, 4);
}

export async function fetchRandomBar(
  _groupSize: number,
  excludeNames: string[],
  ballerMode: boolean,
  exploreMode: boolean,
): Promise<PlaceResult | null> {
  const vibe = SURPRISE_VIBES[Math.floor(Math.random() * SURPRISE_VIBES.length)];
  // noCache: true — Surprise Us should actually surprise you, not replay a cached batch.
  const results = await fetchPlaces(vibe, {
    ballerMode,
    exploreMode,
    limit: 10,
    noCache: true,
  });
  const fresh = results.filter((r) => !excludeNames.includes(r.name));
  if (fresh.length === 0) return null;
  return fresh[Math.floor(Math.random() * fresh.length)];
}

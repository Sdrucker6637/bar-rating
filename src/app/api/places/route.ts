import { NextResponse } from "next/server";

// Vercel serverless function (Node.js runtime). Replaces the old
// OpenStreetMap / Nominatim-backed api/search-bar.js.
//
// This is now the single source of truth for "does this bar exist and is it
// currently open" — used by vibe search, Surprise Us, and manual add/lookup.
// The Gemini endpoint (api/gemini.js) is unchanged and is only used to write
// flavor-text descriptions for bars that have already been verified here.
//
// SHARED CACHE: every successful Google Places search is cached in Firestore
// (collection "placesSearchCache"), keyed by the normalized search text +
// explore-mode radius. Identical searches from ANY user, on ANY device,
// within CACHE_TTL_MS of each other reuse the cached result instead of
// calling Google again. Baller Mode is intentionally NOT part of the cache
// key — the raw (unfiltered by price) result set is cached once, and the
// price/type filtering happens after every read, cached or not. This uses
// Firestore's REST API directly with no auth header, matching this app's
// existing open security rules (same access model the browser already uses
// via the Firebase web SDK) — no service account or extra dependency needed.
//
// Required env vars (set in Vercel Project Settings -> Environment Variables):
//   GOOGLE_PLACES_API_KEY
//   FIREBASE_PROJECT_ID   (e.g. "bar-rating" — same project as index.html)

const NYC_CENTER = { latitude: 40.7525, longitude: -74.001 }; // Hudson Yards
const NORMAL_RADIUS_METERS = 12000; // roughly a 30-40 min transit ride from Manhattan
const EXPLORE_RADIUS_METERS = 40000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_COLLECTION = "placesSearchCache";

// Places API (New) priceLevel enum, ranked low to high.
const PRICE_LEVEL_RANK: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const BAR_TYPES = ["bar", "night_club", "pub", "wine_bar"];

// An exact lookup candidate is only usable when its name/context score clears
// this floor — lenient enough for apostrophe/punctuation variants and common
// abbreviations, yet strict enough that an unrelated business sharing one word
// ("Angels Share" matching "Angels & Whiskey") is not returned as a match.
const EXACT_MATCH_THRESHOLD = 0.45;

// ---------- exact-lookup matching helpers ----------

/** Lowercases, converts curly apostrophes, strips punctuation, and collapses
 *  whitespace so "Angel's Share", "Angel’s Share", and "Angels Share" all
 *  normalize to the same string. Used ONLY for comparison — the user-visible
 *  name is never rewritten. */
function normalizeName(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 0..1 similarity between two business names: exact = 1, containment = 0.85,
 *  otherwise a Dice coefficient over word tokens. */
function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const ta = na.split(" ");
  const tb = nb.split(" ");
  const tbSet = new Set(tb);
  let overlap = 0;
  for (const t of ta) if (tbSet.has(t)) overlap++;
  return (2 * overlap) / (ta.length + tb.length);
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** "Angel's Share" -> "Angels Share" — a bounded query variant for Google
 *  searches that may not index the apostrophe form. */
function stripApostrophes(s: string): string {
  return s
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Small, bounded set of exact-lookup text queries, tried in order until one
 *  yields a plausible match. Never more than five Google requests total. */
function buildExactQueries(
  query: string,
  neighborhood: string,
  address: string,
): string[] {
  const q = query.trim();
  const nb = neighborhood.trim();
  const addr = address.trim();
  const join = (parts: string[]) => parts.filter(Boolean).join(", ");
  const variants = [
    join([q, nb, addr]),
    join([stripApostrophes(q), nb, addr]),
    join([q, nb]),
    join([q, addr]),
    join([q, "New York, NY"]),
  ].filter((s) => s.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    const key = v.toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

/** EXPLICITLY closed -> reject; OPERATIONAL or missing/unknown -> accept.
 *  Google often omits businessStatus, and that must not imply nonexistence. */
function laxStatusOk(status: string): boolean {
  return !/^CLOSED/.test(status || "");
}

/** Ranks how well a raw Google result matches the requested exact place:
 *  name similarity (dominant), then neighborhood/address overlap, operational
 *  status, and proximity to the search center. */
function scoreExactCandidate(p: RawPlace, ctx: LookupContext): number {
  let score = nameSimilarity(p.displayName || "", ctx.query);
  const nb = normalizeName(ctx.neighborhood);
  const addr = normalizeName(ctx.address);
  const nameAndAddr = normalizeName(
    `${p.displayName || ""} ${p.formattedAddress || ""}`,
  );
  if (nb && nameAndAddr.includes(nb)) score += 0.15;
  if (addr && nameAndAddr.includes(addr)) score += 0.15;
  const status = p.businessStatus || "";
  if (status === "OPERATIONAL") score += 0.1;
  else if (/^CLOSED/.test(status)) score -= 0.3;
  if (
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Number.isFinite(ctx.center.latitude) &&
    Number.isFinite(ctx.center.longitude) &&
    Number.isFinite(ctx.radius) &&
    ctx.radius > 0
  ) {
    const d = haversineMeters(
      ctx.center.latitude,
      ctx.center.longitude,
      p.latitude as number,
      p.longitude as number,
    );
    score += 0.02 * Math.max(0, 1 - d / ctx.radius);
  }
  return score;
}

// ---------- tiny cache-key helper (no crypto module needed) ----------
function hashString(str: string): string {
  // FNV-1a, good enough for a stable, short, collision-resistant doc id.
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}
function cacheKeyFor(
  textQuery: string,
  exploreMode: boolean,
  centerKey: string | null,
): string {
  const normalized = textQuery.trim().toLowerCase().replace(/\s+/g, " ");
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return `${slug || "q"}-${exploreMode ? "explore" : "normal"}-${centerKey || "nyc"}-${hashString(normalized + "|" + exploreMode + "|" + (centerKey || ""))}`;
}

// ---------- Firestore REST <-> JS value conversion ----------
type FsValue =
  | { nullValue: null }
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };

function toFirestoreValue(value: unknown): FsValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, FsValue> = {};
    for (const k of Object.keys(value as Record<string, unknown>))
      fields[k] = toFirestoreValue((value as Record<string, unknown>)[k]);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}
function fromFirestoreValue(v: FsValue | undefined | null): unknown {
  if (!v) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in v) {
    const out: Record<string, unknown> = {};
    const fields = v.mapValue.fields || {};
    for (const k of Object.keys(fields)) out[k] = fromFirestoreValue(fields[k]);
    return out;
  }
  return null;
}
function docToObject(doc: { fields?: Record<string, FsValue> }): Record<string, unknown> {
  const fields = (doc && doc.fields) || {};
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(fields)) out[k] = fromFirestoreValue(fields[k]);
  return out;
}

function firestoreDocUrl(projectId: string, docId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${CACHE_COLLECTION}/${docId}`;
}

async function readCache(
  projectId: string,
  docId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(firestoreDocUrl(projectId, docId));
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(
        "Firestore cache read failed",
        response.status,
        await response.text(),
      );
      return null;
    }
    const doc = await response.json();
    return docToObject(doc);
  } catch (e) {
    console.error("Firestore cache read error", e);
    return null;
  }
}

async function writeCache(
  projectId: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const fields: Record<string, FsValue> = {};
    for (const k of Object.keys(data)) fields[k] = toFirestoreValue(data[k]);
    const response = await fetch(firestoreDocUrl(projectId, docId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
      console.error(
        "Firestore cache write failed",
        response.status,
        await response.text(),
      );
    }
  } catch (e) {
    // Caching is a pure optimization — never fail the request over this.
    console.error("Firestore cache write error", e);
  }
}

interface RawPlace {
  displayName?: string;
  formattedAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
  mapsLink?: string;
  businessStatus?: string;
  priceLevel?: string;
  types?: string[];
  rating?: number | null;
}

interface LookupContext {
  apiKey: string;
  projectId: string | undefined;
  maxResultCount: number;
  ballerMode: boolean;
  exploreMode: boolean;
  exactLookup: boolean;
  query: string;
  neighborhood: string;
  address: string;
  center: { latitude: number; longitude: number };
  radius: number;
  centerKey: string | null;
}

interface ShapedPlace {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  mapsLink: string;
  rating: number | null;
}

class PlacesApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---------- filter + shape a raw Places result set for the client ----------
function filterAndShape(
  rawPlaces: RawPlace[],
  ctx: LookupContext,
): ShapedPlace[] {
  let list: RawPlace[];
  if (ctx.exactLookup) {
    // Exact lookups mean "find THIS business": rank candidates by match
    // quality and keep only plausible ones. Never reject on Google's
    // businessStatus, our internal type list, or price — a real business that
    // Google simply doesn't label must not become a false negative.
    list = rawPlaces
      .map((p) => ({ p, score: scoreExactCandidate(p, ctx) }))
      .filter(
        (x) =>
          laxStatusOk(x.p.businessStatus || "") &&
          x.score >= EXACT_MATCH_THRESHOLD,
      )
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.p.displayName || "").localeCompare(b.p.displayName || ""),
      )
      .map((x) => x.p);
  } else {
    // Normal discovery search — preserve the existing type/status/price
    // filtering exactly as before.
    list = rawPlaces
      .filter((p) => p.businessStatus === "OPERATIONAL")
      .filter((p) => (p.types || []).some((t) => BAR_TYPES.includes(t)))
      .filter((p) => {
        if (ctx.ballerMode) return true;
        const rank = PRICE_LEVEL_RANK[p.priceLevel || ""];
        return rank === undefined || rank <= 2;
      });
  }
  return list.slice(0, ctx.maxResultCount).map((p) => ({
    name: p.displayName || ctx.query,
    address: p.formattedAddress || "",
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    placeId: p.placeId || null,
    mapsLink:
      p.mapsLink ||
      (p.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${p.placeId}`
        : ""),
    rating: typeof p.rating === "number" ? p.rating : null,
  }));
}

// ---------- Google Places request ----------
async function queryGooglePlaces(
  textQuery: string,
  ctx: LookupContext,
): Promise<RawPlace[]> {
  const requestBody: Record<string, unknown> = {
    textQuery,
    maxResultCount: ctx.maxResultCount,
    locationBias: {
      circle: {
        center: ctx.center,
        radius: ctx.radius,
      },
    },
  };
  // Exact lookups are NOT constrained to our internal bar types — the
  // requested business may be categorized as cocktail_bar/lounge/restaurant/
  // night_club/etc. Normal discovery searches keep the "bar" type filter.
  if (!ctx.exactLookup) {
    requestBody.includedType = "bar";
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": ctx.apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.location",
          "places.businessStatus",
          "places.priceLevel",
          "places.types",
          "places.googleMapsUri",
          "places.rating",
        ].join(","),
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Places API error", response.status, errText);
    throw new PlacesApiError("Places API request failed", 502);
  }

  const data = await response.json();
  const places = Array.isArray(data.places) ? data.places : [];
  // Normalize into a flat shape once, so both the cache write and the
  // response shaping downstream work off the same simple structure.
  return places.map((p: Record<string, unknown>): RawPlace => ({
    displayName: (p.displayName as { text?: string } | undefined)?.text || "",
    formattedAddress: String(p.formattedAddress || ""),
    latitude: (p.location as { latitude?: number | null } | undefined)
      ?.latitude ?? null,
    longitude: (p.location as { longitude?: number | null } | undefined)
      ?.longitude ?? null,
    placeId: p.id ? String(p.id) : null,
    mapsLink: String(p.googleMapsUri || ""),
    businessStatus: String(p.businessStatus || ""),
    priceLevel: String(p.priceLevel || ""),
    types: Array.isArray(p.types) ? (p.types as string[]) : [],
    rating: typeof p.rating === "number" ? p.rating : null,
  }));
}

// ---------- cache-aware lookup ----------
// The shared Firestore cache is a pure optimization: it may answer a request
// with a previous NON-EMPTY result, but it must never be the source of truth
// for whether a business exists. Empty cached entries (a legacy bug) and any
// API failures are treated as misses and are never written. Non-empty results
// are cached as-is; price/type/status filtering happens after every read.
async function fetchOrCachePlaces(
  textQuery: string,
  ctx: LookupContext,
  cacheDocId: string | null,
): Promise<{
  rawPlaces: RawPlace[];
  fromCache: boolean;
  emptyIgnored: boolean;
}> {
  if (cacheDocId && ctx.projectId) {
    const cached = await readCache(ctx.projectId, cacheDocId);
    if (cached && Array.isArray(cached.places)) {
      const fresh =
        typeof cached.timestamp === "number" &&
        Date.now() - cached.timestamp < CACHE_TTL_MS;
      const places = cached.places as unknown[];
      if (fresh && places.length > 0) {
        return {
          rawPlaces: cached.places as RawPlace[],
          fromCache: true,
          emptyIgnored: false,
        };
      }
      if (fresh && places.length === 0) {
        // Legacy bad entry: a successful-but-empty Google response was cached
        // for 24h. An empty result proves nothing — treat it as a miss so
        // Google is asked again (and any fresh non-empty result overwrites
        // the entry). This is how the app self-heals existing places: []
        // documents without anyone wiping the collection.
        console.log(
          `[places:cache] ignoring EMPTY cached entry for "${textQuery}" (${Math.round(
            (Date.now() - (cached.timestamp as number)) / 1000,
          )}s old)`,
        );
        return { rawPlaces: [], fromCache: false, emptyIgnored: true };
      }
    }
  }
  const rawPlaces = await queryGooglePlaces(textQuery, ctx);
  // Never cache empty results or failures.
  if (rawPlaces.length > 0 && cacheDocId && ctx.projectId) {
    await writeCache(ctx.projectId, cacheDocId, {
      places: rawPlaces,
      timestamp: Date.now(),
      query: textQuery,
    });
  }
  return { rawPlaces, fromCache: false, emptyIgnored: false };
}

// ---------- exact-lookup flow ----------
// Tries the bounded query variants in order. A cached NON-EMPTY result is
// only trusted when it actually contains a plausible match for the requested
// place; otherwise the query is re-run against Google, because the cache must
// never decide that a place doesn't exist.
async function runExactLookup(ctx: LookupContext): Promise<ShapedPlace[]> {
  const queries = buildExactQueries(ctx.query, ctx.neighborhood, ctx.address);
  for (const textQuery of queries) {
    const cacheDocId = ctx.projectId
      ? cacheKeyFor(textQuery, ctx.exploreMode, ctx.centerKey)
      : null;
    let res = await fetchOrCachePlaces(textQuery, ctx, cacheDocId);
    if (res.fromCache && res.rawPlaces.length > 0) {
      const shaped = filterAndShape(res.rawPlaces, ctx);
      if (shaped.length > 0) {
        logExactLookup(ctx, textQuery, res, shaped);
        return shaped;
      }
      console.log(
        `[places:exact] cached "${textQuery}" had no plausible match — refreshing from Google`,
      );
      res = {
        rawPlaces: await queryGooglePlaces(textQuery, ctx),
        fromCache: false,
        emptyIgnored: false,
      };
      if (res.rawPlaces.length > 0 && cacheDocId && ctx.projectId) {
        await writeCache(ctx.projectId, cacheDocId, {
          places: res.rawPlaces,
          timestamp: Date.now(),
          query: textQuery,
        });
      }
    }
    const shaped = filterAndShape(res.rawPlaces, ctx);
    logExactLookup(ctx, textQuery, res, shaped);
    if (shaped.length > 0) return shaped;
  }
  return [];
}

function logExactLookup(
  ctx: LookupContext,
  textQuery: string,
  res: { fromCache: boolean; emptyIgnored: boolean; rawPlaces: RawPlace[] },
  shaped: ShapedPlace[],
) {
  const picked = shaped.length > 0 ? shaped[0].name : "none";
  console.log(
    `[places:exact] q="${ctx.query}" nb="${ctx.neighborhood || ""}" addr="${ctx.address || ""}" -> "${textQuery}" ` +
      `src=${res.fromCache ? "cache" : "google"}${res.emptyIgnored ? " (empty-cache-ignored)" : ""} ` +
      `raw=${res.rawPlaces.length} names=[${res.rawPlaces
        .slice(0, 10)
        .map((p) => p.displayName || "")
        .join(" | ")}] picked=${picked}`,
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GOOGLE_PLACES_API_KEY" },
      { status: 500 },
    );
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;

  const body = (await req.json().catch(() => ({}))) as {
    query?: string;
    neighborhood?: string;
    address?: string;
    ballerMode?: boolean;
    exploreMode?: boolean;
    limit?: number;
    exactLookup?: boolean;
    centerLat?: number;
    centerLng?: number;
    radiusMeters?: number;
  };
  const {
    query,
    neighborhood = "",
    address = "",
    ballerMode = false,
    exploreMode = false,
    limit = 5,
    exactLookup = false,
    centerLat,
    centerLng,
    radiusMeters,
  } = body;

  if (!query || !String(query).trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const maxResultCount = Math.min(Math.max(Number(limit) || 5, 1), 10);

  // Crawl-planning calls search near a specific stop's coordinates instead of
  // the fixed NYC center — when that's provided, fold it into the cache key
  // too, or a generic "bar" search near two different stops would collide.
  const hasCustomCenter =
    Number.isFinite(Number(centerLat)) && Number.isFinite(Number(centerLng));
  const effectiveCenter = hasCustomCenter
    ? { latitude: Number(centerLat), longitude: Number(centerLng) }
    : NYC_CENTER;
  const effectiveRadius = Number.isFinite(Number(radiusMeters))
    ? Number(radiusMeters)
    : exploreMode
      ? EXPLORE_RADIUS_METERS
      : NORMAL_RADIUS_METERS;
  const centerKey = hasCustomCenter
    ? `${effectiveCenter.latitude.toFixed(3)},${effectiveCenter.longitude.toFixed(3)}`
    : null;

  const ctx: LookupContext = {
    apiKey,
    projectId,
    maxResultCount,
    ballerMode,
    exploreMode,
    exactLookup,
    query: String(query).trim(),
    neighborhood,
    address,
    center: effectiveCenter,
    radius: effectiveRadius,
    centerKey,
  };

  try {
    if (exactLookup) {
      // Exact lookup = "I want THIS named business". Bounded fallbacks +
      // ranked matching + cache-never-authoritative; see runExactLookup.
      return NextResponse.json(await runExactLookup(ctx));
    }

    // Normal discovery search — single query, cache on the way out (never
    // empty results), filtering after the cache read. Behavior preserved.
    const textQuery =
      [query, neighborhood, address].filter(Boolean).join(", ") + " bar";
    const cacheDocId = projectId
      ? cacheKeyFor(textQuery, exploreMode, centerKey)
      : null;
    const { rawPlaces } = await fetchOrCachePlaces(textQuery, ctx, cacheDocId);
    return NextResponse.json(filterAndShape(rawPlaces, ctx));
  } catch (e) {
    if (e instanceof PlacesApiError) {
      // Google/API failure — a real error, NOT "no matching bar". Never
      // cached, never collapsed into an empty result.
      return NextResponse.json(
        { error: e.message || "Places API request failed" },
        { status: e.status || 502 },
      );
    }
    console.error("Places lookup failed", e);
    return NextResponse.json(
      { error: "Places lookup failed" },
      { status: 500 },
    );
  }
}

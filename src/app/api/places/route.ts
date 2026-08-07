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

interface ShapeOptions {
  ballerMode: boolean;
  query: string;
  maxResultCount: number;
  exactLookup: boolean;
}

// ---------- filter + shape a raw Places result set for the client ----------
function filterAndShape(
  rawPlaces: RawPlace[],
  { ballerMode, query, maxResultCount, exactLookup }: ShapeOptions,
) {
  return rawPlaces
    .filter((p) => p.businessStatus === "OPERATIONAL")
    .filter(
      (p) => exactLookup || (p.types || []).some((t) => BAR_TYPES.includes(t)),
    )
    .filter((p) => {
      if (ballerMode) return true;
      const rank = PRICE_LEVEL_RANK[p.priceLevel || ""];
      return rank === undefined || rank <= 2;
    })
    .slice(0, maxResultCount)
    .map((p) => ({
      name: p.displayName || query,
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

  const textQuery = exactLookup
    ? [query, neighborhood, address].filter(Boolean).join(", ")
    : [query, neighborhood, address].filter(Boolean).join(", ") + " bar";
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

  const cacheDocId = projectId ? cacheKeyFor(textQuery, exploreMode, centerKey) : null;

  // ---- 1. Try the shared cache first ----
  if (cacheDocId && projectId) {
    const cached = await readCache(projectId, cacheDocId);
    if (
      cached &&
      Array.isArray(cached.places) &&
      typeof cached.timestamp === "number"
    ) {
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        const shaped = filterAndShape(cached.places as RawPlace[], {
          ballerMode,
          query,
          maxResultCount,
          exactLookup,
        });
        return NextResponse.json(shaped);
      }
    }
  }

  // ---- 2. Cache miss (or no Firestore project configured) — call Google ----
  const requestBody: Record<string, unknown> = {
    textQuery,
    maxResultCount,
    locationBias: {
      circle: {
        center: effectiveCenter,
        radius: effectiveRadius,
      },
    },
  };
  if (!exactLookup) {
    requestBody.includedType = "bar";
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
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
      return NextResponse.json(
        { error: "Places API request failed" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const places = Array.isArray(data.places) ? data.places : [];

    // Normalize into a flat shape once, so both the cache write and the
    // response shaping downstream work off the same simple structure.
    const rawPlaces: RawPlace[] = places.map((p: Record<string, unknown>) => ({
      displayName: (p.displayName as { text?: string } | undefined)?.text || "",
      formattedAddress: p.formattedAddress || "",
      latitude: (p.location as { latitude?: number | null } | undefined)
        ?.latitude ?? null,
      longitude: (p.location as { longitude?: number | null } | undefined)
        ?.longitude ?? null,
      placeId: p.id || null,
      mapsLink: p.googleMapsUri || "",
      businessStatus: p.businessStatus || "",
      priceLevel: p.priceLevel || "",
      types: Array.isArray(p.types) ? (p.types as string[]) : [],
      rating: typeof p.rating === "number" ? p.rating : null,
    }));

    // ---- 3. Cache the successful (even if empty) result for next time ----
    if (cacheDocId && projectId) {
      await writeCache(projectId, cacheDocId, {
        places: rawPlaces,
        timestamp: Date.now(),
        query: textQuery,
      });
    }

    const shaped = filterAndShape(rawPlaces, {
      ballerMode,
      query,
      maxResultCount,
      exactLookup,
    });
    return NextResponse.json(shaped);
  } catch (e) {
    console.error("Places lookup failed", e);
    return NextResponse.json(
      { error: "Places lookup failed" },
      { status: 500 },
    );
  }
}

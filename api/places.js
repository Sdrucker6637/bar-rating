// api/places.js
// Vercel serverless function (Node.js runtime). Replaces the old
// OpenStreetMap / Nominatim-backed api/search-bar.js.
//
// This is now the single source of truth for "does this bar exist and is it
// currently open" — used by vibe search, Surprise Us, and manual add/lookup.
// The Gemini endpoint (api/gemini.js) is unchanged and is only used to write
// flavor-text descriptions for bars that have already been verified here.
//
// Required env var (set in Vercel Project Settings -> Environment Variables):
//   GOOGLE_PLACES_API_KEY

const NYC_CENTER = { latitude: 40.7128, longitude: -74.006 };
const NORMAL_RADIUS_METERS = 12000; // roughly a 30-40 min transit ride from Manhattan
const EXPLORE_RADIUS_METERS = 40000;

// Places API (New) priceLevel enum, ranked low to high.
const PRICE_LEVEL_RANK = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const BAR_TYPES = ["bar", "night_club", "pub", "wine_bar"];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GOOGLE_PLACES_API_KEY" });
    return;
  }

  const {
    query,
    neighborhood = "",
    address = "",
    ballerMode = false,
    exploreMode = false,
    limit = 5,
  } = req.body || {};

  if (!query || !String(query).trim()) {
    res.status(400).json({ error: "Missing query" });
    return;
  }

  const textQuery = [query, neighborhood, address].filter(Boolean).join(", ") + " bar";
  const maxResultCount = Math.min(Math.max(Number(limit) || 5, 1), 10);

  const requestBody = {
    textQuery,
    includedType: "bar",
    maxResultCount,
    locationBias: {
      circle: {
        center: NYC_CENTER,
        radius: exploreMode ? EXPLORE_RADIUS_METERS : NORMAL_RADIUS_METERS,
      },
    },
  };

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
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
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Places API error", response.status, errText);
      res.status(502).json({ error: "Places API request failed" });
      return;
    }

    const data = await response.json();
    const places = Array.isArray(data.places) ? data.places : [];

    const results = places
      // Hard requirement: never surface permanently (or temporarily) closed spots.
      .filter((p) => p.businessStatus === "OPERATIONAL")
      .filter((p) => (p.types || []).some((t) => BAR_TYPES.includes(t)))
      .filter((p) => {
        if (ballerMode) return true;
        const rank = PRICE_LEVEL_RANK[p.priceLevel];
        // Unknown price level -> let it through rather than losing a real bar
        // just because Google hasn't classified its price yet.
        return rank === undefined || rank <= 2;
      })
      .slice(0, maxResultCount)
      .map((p) => ({
        name: p.displayName?.text || query,
        address: p.formattedAddress || "",
        latitude: p.location?.latitude ?? null,
        longitude: p.location?.longitude ?? null,
        placeId: p.id || null,
        mapsLink: p.googleMapsUri || (p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : ""),
        rating: typeof p.rating === "number" ? p.rating : null,
      }));

    res.status(200).json(results);
  } catch (e) {
    console.error("Places lookup failed", e);
    res.status(500).json({ error: "Places lookup failed" });
  }
};
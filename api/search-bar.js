async function nominatimSearch(queryTerms) {
  const search = encodeURIComponent(queryTerms);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${search}&limit=8&addressdetails=1&countrycodes=us`,
    { headers: { "User-Agent": "TourDeAlcoholism" } }
  );
  const places = await response.json();
  return places.filter(p => {
    const addr = p.address || {};
    const state = (addr.state || "").toLowerCase();
    return state === "new york" || state === "ny";
  });
}

// Only keep bar/restaurant/pub/amenity-type results — exclude schools, streets, sanitation, etc.
function filterToBars(places) {
  const barTypes = ["bar", "restaurant", "pub", "nightclub", "cafe", "biergarten", "food_court", "fast_food", "lounge"];
  return places.filter(p => {
    const category = (p.category || "").toLowerCase();
    const type = (p.type || "").toLowerCase();
    // If category/type is missing, keep the result (can't classify it)
    if (!category || !type) return true;
    // Must be an amenity, tourism, or leisure POI
    if (!["amenity", "tourism", "leisure"].includes(category)) return false;
    // Must match a bar/restaurant-type
    return barTypes.some(bt => type.includes(bt));
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query, neighborhood, address } = req.body;

    // Always include "bar" to bias Nominatim toward bar/restaurant POIs
    // Include neighborhood and address when available to disambiguate same-name bars
    const baseTerms = [query + " bar", "New York City", neighborhood || "", address || ""].filter(Boolean).join(", ");

    const nyPlaces = await nominatimSearch(baseTerms);

    // Filter to only bar-type results — return empty if nothing qualifies
    // (the client-side Gemini geocoding fallback will handle the rest)
    const barPlaces = filterToBars(nyPlaces);

    const results = barPlaces.map((p) => {
      const barName = p.name || p.display_name.split(",")[0];
      return {
        name: barName,
        address: p.display_name,
        latitude: p.lat,
        longitude: p.lon,
        // Use bar name + NYC so Google Maps finds the business listing, not just a street address
        mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barName + ", New York City")}`,
      };
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to search bars" });
  }
}

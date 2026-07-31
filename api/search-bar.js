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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query, neighborhood } = req.body;

    // Base terms: always scope to NYC
    const baseTerms = [query, "New York City", neighborhood || ""].filter(Boolean).join(", ");

    // First pass: standard search
    let nyPlaces = await nominatimSearch(baseTerms);

    // Second pass: if nothing found, try appending "bar" for POI matching
    if (nyPlaces.length === 0) {
      const barTerms = [query + " bar", "New York City", neighborhood || ""].filter(Boolean).join(", ");
      nyPlaces = await nominatimSearch(barTerms);
    }

    const results = nyPlaces.map((p) => {
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

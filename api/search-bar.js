export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query, neighborhood } = req.body;

    // Scope every search to New York City so results are always local.
    // Include neighborhood when provided for better accuracy.
    const terms = [query, "New York City", neighborhood || ""].filter(Boolean).join(", ");
    const search = encodeURIComponent(terms);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${search}&limit=8&addressdetails=1&countrycodes=us`,
      {
        headers: { "User-Agent": "TourDeAlcoholism" },
      }
    );

    const places = await response.json();

    // Strict filter: only return results confirmed to be in New York state
    const nyPlaces = places.filter(p => {
      const addr = p.address || {};
      const state = (addr.state || "").toLowerCase();
      // Check for "new york" in state field or "ny" as state code
      return state === "new york" || state === "ny";
    });

    const results = nyPlaces.map((p) => ({
      name: p.name || p.display_name.split(",")[0],
      address: p.display_name,
      latitude: p.lat,
      longitude: p.lon,
      mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.display_name)}`,
    }));

    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to search bars" });
  }
}

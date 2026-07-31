export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query, neighborhood } = req.body;

    const search = encodeURIComponent(`${query} bar ${neighborhood || ""}`);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${search}&limit=5&addressdetails=1`,
      {
        headers: { "User-Agent": "TourDeAlcoholism" },
      }
    );

    const places = await response.json();

    const results = places.map((p) => ({
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

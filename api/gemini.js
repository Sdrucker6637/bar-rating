import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

// Parses whatever the model sent back into real JSON (object or array).
// Tries a direct parse first, then falls back to pulling out the first
// {...} or [...] block in case the model added stray text around it.
function safeParse(text) {
  const cleaned = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // fall through
  }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch (e) {
      // fall through
    }
  }
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (e) {
      // fall through
    }
  }
  return null;
}

function isUsefulDescription(value) {
  return typeof value === "string" && value.trim().length > 35 && !/^\s*[\[{]/.test(value);
}

function normalizeDetails(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const nested = typeof parsed.description === "string" ? safeParse(parsed.description) : null;
  const source = nested && typeof nested === "object" && !Array.isArray(nested) ? { ...parsed, ...nested } : parsed;
  const description = typeof source.description === "string" ? source.description.trim() : "";
  return {
    name: typeof source.name === "string" ? source.name.trim() : "",
    mapsLink: typeof source.mapsLink === "string" ? source.mapsLink.trim() : "",
    neighborhood: typeof source.neighborhood === "string" ? source.neighborhood.trim() : "",
    description,
    tags: Array.isArray(source.tags) ? source.tags.filter((tag) => typeof tag === "string" && tag.trim()).slice(0, 5) : [],
    happyHour: typeof source.happyHour === "string" ? source.happyHour.trim() : "",
    capacityHint: Number.isFinite(Number(source.capacityHint)) ? Number(source.capacityHint) : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { barId, prompt, forceRefresh = false } = req.body || {};

    let existingBar = null;
    let bars = null;
    let docRef = null;

    // Only use Firebase caching when we are fetching details
    // for an existing bar
    if (barId) {
      docRef = db.collection("tourDeAlcoholism").doc("sharedList");

      const snapshot = await docRef.get();
      const data = snapshot.data();

      bars = data?.bars || [];

      existingBar = bars.find((bar) => bar.id === barId);

      if (!existingBar) {
        return res.status(404).json({
          error: "Bar not found",
        });
      }

      // Return cached result — already structured, no parsing needed
      if (existingBar.detailsFetched && isUsefulDescription(existingBar.description) && !forceRefresh) {
        return res.status(200).json({ result: existingBar });
      }
    }

    // Call Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const geminiData = await response.json();

    // Surface Gemini errors (quota, invalid key, etc.)
    if (!response.ok) {
      console.error("Gemini error:", geminiData);

      return res.status(response.status).json({
        error: geminiData?.error?.message || "Gemini request failed",
      });
    }

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("\n") || "";

    const parsed = safeParse(rawText);

    // Search / random-pick calls (no barId): hand back whatever shape the
    // prompt asked for — an array for search suggestions, an object for a
    // single random pick. Never touches Firebase.
    if (!barId) {
      const result = Array.isArray(parsed)
        ? parsed.map(normalizeDetails).filter((bar) => bar && bar.name)
        : normalizeDetails(parsed);
      return res.status(200).json({ result });
    }

    // Bar-details call for a specific bar. If parsing failed, still mark it
    // fetched (so we don't hammer Gemini again every time it's opened) but
    // don't overwrite real fields with junk.
    const details = normalizeDetails(parsed);
    if (!details || !isUsefulDescription(details.description)) {
      // Never cache a failed lookup: Details/Refresh can safely retry it.
      return res.status(422).json({ error: "No usable bar description returned. Please try again." });
    }

    const mergedBar = {
      ...existingBar,
      mapsLink: details.mapsLink || existingBar.mapsLink,
      neighborhood: details.neighborhood || existingBar.neighborhood,
      description: details.description,
      tags: details.tags.length ? details.tags : existingBar.tags,
      happyHour: details.happyHour || existingBar.happyHour,
      capacity: details.capacityHint || existingBar.capacity,
      detailsFetched: true,
      lastUpdated: new Date().toISOString(),
    };

    const updatedBars = bars.map((bar) => (bar.id === barId ? mergedBar : bar));

    await docRef.update({
      bars: updatedBars,
    });

    return res.status(200).json({ result: mergedBar });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: error.message || "Failed to generate details",
    });
  }
}

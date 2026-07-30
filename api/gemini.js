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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { barId, prompt } = req.body;

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
      if (existingBar.detailsFetched) {
        return res.status(200).json({ result: existingBar });
      }
    }

    // Call Gemini
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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
      return res.status(200).json({ result: parsed });
    }

    // Bar-details call for a specific bar. If parsing failed, still mark it
    // fetched (so we don't hammer Gemini again every time it's opened) but
    // don't overwrite real fields with junk.
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      const fallbackBars = bars.map((bar) =>
        bar.id === barId ? { ...bar, detailsFetched: true } : bar
      );
      await docRef.update({ bars: fallbackBars });
      return res.status(200).json({ result: { ...existingBar, detailsFetched: true } });
    }

    const mergedBar = {
      ...existingBar,
      mapsLink: parsed.mapsLink || existingBar.mapsLink,
      neighborhood: parsed.neighborhood || existingBar.neighborhood,
      description: parsed.description || existingBar.description,
      tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : existingBar.tags,
      happyHour: parsed.happyHour !== undefined ? parsed.happyHour : existingBar.happyHour,
      capacity: parsed.capacityHint || existingBar.capacity,
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
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

function safeParse(text) {
  const cleaned = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // fall through
  }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch (e) { /* fall through */ }
  }
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch (e) { /* fall through */ }
  }
  return null;
}

function isUsefulDescription(value) {
  return typeof value === "string" && value.trim().length > 35 && !/^\s*[\[{]/.test(value);
}

function normalizeDetails(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const nested = typeof parsed.description === "string" ? safeParse(parsed.description) : null;
  const source =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...parsed, ...nested }
      : parsed;
  const description =
    typeof source.description === "string" ? source.description.trim() : "";
  return {
    name: typeof source.name === "string" ? source.name.trim() : "",
    neighborhood: typeof source.neighborhood === "string" ? source.neighborhood.trim() : "",
    description,
    tags: Array.isArray(source.tags)
      ? source.tags.filter((t) => typeof t === "string" && t.trim()).slice(0, 5)
      : [],
    happyHour: typeof source.happyHour === "string" ? source.happyHour.trim() : "",
    capacityHint: Number.isFinite(Number(source.capacityHint))
      ? Number(source.capacityHint)
      : null,
  };
}

function normalizeSuggestion(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return {
    name: typeof parsed.name === "string" ? parsed.name.trim() : "",
    neighborhood: typeof parsed.neighborhood === "string" ? parsed.neighborhood.trim() : "",
    description: typeof parsed.description === "string" ? parsed.description.trim() : "",
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((t) => typeof t === "string" && t.trim()).slice(0, 5)
      : [],
    happyHour: typeof parsed.happyHour === "string" ? parsed.happyHour.trim() : "",
    capacityHint: Number.isFinite(Number(parsed.capacityHint))
      ? Number(parsed.capacityHint)
      : null,
    mapsLink: typeof parsed.mapsLink === "string" ? parsed.mapsLink.trim() : "",
    address: typeof parsed.address === "string" ? parsed.address.trim() : "",
    latitude: Number.isFinite(Number(parsed.latitude)) ? Number(parsed.latitude) : null,
    longitude: Number.isFinite(Number(parsed.longitude)) ? Number(parsed.longitude) : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { barId, prompt, forceRefresh = false } = req.body || {};

    let existingBar = null;
    let bars = null;
    let docRef = null;

    // Only use Firebase caching when fetching details for an existing bar
    if (barId) {
      docRef = db.collection("tourDeAlcoholism").doc("sharedList");
      const snapshot = await docRef.get();
      const data = snapshot.data();
      bars = data?.bars || [];
      existingBar = bars.find((bar) => bar.id === barId);

      if (!existingBar) {
        return res.status(404).json({ error: "Bar not found" });
      }

      // Return cached result if already fetched
      if (
        existingBar.detailsFetched &&
        isUsefulDescription(existingBar.description) &&
        !forceRefresh
      ) {
        return res.status(200).json({ result: existingBar });
      }
    }

    // Call Gemini with a 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let geminiResponse;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${
          process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
        }:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini error:", geminiData);
      return res.status(geminiResponse.status).json({
        error: geminiData?.error?.message || "Gemini request failed",
      });
    }

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("\n") || "";

    const parsed = safeParse(rawText);

    // Search / random-pick calls (no barId): return suggestions array or single object
    if (!barId) {
      const result = Array.isArray(parsed)
        ? parsed.map(normalizeSuggestion).filter((b) => b && b.name)
        : normalizeSuggestion(parsed);
      return res.status(200).json({ result });
    }

    // Bar-details call for a specific verified bar
    const details = normalizeDetails(parsed);
    if (!details || !isUsefulDescription(details.description)) {
      return res.status(422).json({
        error: "No usable bar description returned. Please try again.",
      });
    }

    // Merge this bar's new details back into the array inside a transaction
    // that re-reads the doc at commit time, not using the `bars` snapshot
    // captured before the (up to 10s) Gemini call above. Without this, a
    // concurrent edit (disqualify, maps link, another bar's enrichment)
    // made while this request was in flight would get silently reverted
    // when this write landed with a stale full-array copy. Firestore
    // transactions also auto-retry if another write races this one.
    let mergedBar;
    try {
      mergedBar = await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(docRef);
        const freshBars = freshSnap.data()?.bars || [];
        const freshExisting = freshBars.find((bar) => bar.id === barId);
        if (!freshExisting) {
          throw new Error("BAR_REMOVED");
        }
        const merged = {
          ...freshExisting,
          // Never overwrite verified address/location data from Places
          neighborhood: details.neighborhood || freshExisting.neighborhood,
          description: details.description,
          tags: details.tags.length ? details.tags : freshExisting.tags,
          happyHour: details.happyHour || freshExisting.happyHour,
          capacity: details.capacityHint || freshExisting.capacity,
          detailsFetched: true,
          lastUpdated: new Date().toISOString(),
        };
        const updatedBars = freshBars.map((bar) => (bar.id === barId ? merged : bar));
        tx.update(docRef, { bars: updatedBars });
        return merged;
      });
    } catch (txError) {
      if (txError.message === "BAR_REMOVED") {
        // The bar was deleted by someone else while this request was in flight.
        return res.status(404).json({ error: "Bar not found" });
      }
      throw txError;
    }

    return res.status(200).json({ result: mergedBar });
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Gemini request timed out");
      return res.status(504).json({ error: "Gemini request timed out" });
    }
    console.error("Server error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate details" });
  }
}
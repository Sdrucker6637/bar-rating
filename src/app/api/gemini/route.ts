import { NextResponse } from "next/server";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin is initialized lazily so this module can be imported during
// `next build` (where env vars are absent) without throwing. At request time
// on Vercel the env vars are present and initialization happens once.
function ensureAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) return null;
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

interface Details {
  name?: string;
  neighborhood?: string;
  description?: string;
  tags?: unknown[];
  happyHour?: string;
  capacityHint?: number | null;
  mapsLink?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

function safeParse(text: string): unknown {
  const cleaned = (text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
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
      /* fall through */
    }
  }
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (e) {
      /* fall through */
    }
  }
  return null;
}

function isUsefulDescription(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.trim().length > 35 &&
    !/^\s*[\[]/.test(value)
  );
}

function normalizeDetails(parsed: unknown): Details | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const p = parsed as Record<string, unknown>;
  const nested =
    typeof p.description === "string" ? safeParse(p.description) : null;
  const source =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...p, ...(nested as Record<string, unknown>) }
      : p;
  const description =
    typeof source.description === "string" ? source.description.trim() : "";
  return {
    name: typeof source.name === "string" ? source.name.trim() : "",
    neighborhood:
      typeof source.neighborhood === "string" ? source.neighborhood.trim() : "",
    description,
    tags: Array.isArray(source.tags)
      ? source.tags
          .filter((t) => typeof t === "string" && t.trim())
          .slice(0, 5)
      : [],
    happyHour:
      typeof source.happyHour === "string" ? source.happyHour.trim() : "",
    capacityHint: Number.isFinite(Number(source.capacityHint))
      ? Number(source.capacityHint)
      : null,
  };
}

function normalizeSuggestion(parsed: unknown): Details | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const p = parsed as Record<string, unknown>;
  return {
    name: typeof p.name === "string" ? p.name.trim() : "",
    neighborhood:
      typeof p.neighborhood === "string" ? p.neighborhood.trim() : "",
    description: typeof p.description === "string" ? p.description.trim() : "",
    tags: Array.isArray(p.tags)
      ? p.tags.filter((t) => typeof t === "string" && t.trim()).slice(0, 5)
      : [],
    happyHour: typeof p.happyHour === "string" ? p.happyHour.trim() : "",
    capacityHint: Number.isFinite(Number(p.capacityHint))
      ? Number(p.capacityHint)
      : null,
    mapsLink: typeof p.mapsLink === "string" ? p.mapsLink.trim() : "",
    address: typeof p.address === "string" ? p.address.trim() : "",
    latitude: Number.isFinite(Number(p.latitude)) ? Number(p.latitude) : null,
    longitude: Number.isFinite(Number(p.longitude))
      ? Number(p.longitude)
      : null,
  };
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      barId?: string;
      prompt?: string;
      forceRefresh?: boolean;
    };
    const { barId, prompt, forceRefresh = false } = body;

    let existingBar: Record<string, unknown> | null = null;
    let docRef: FirebaseFirestore.DocumentReference | null = null;

    // Only use Firebase caching when fetching details for an existing bar
    let db: FirebaseFirestore.Firestore | null = null;
    if (barId) {
      db = ensureAdmin();
      if (!db) {
        return NextResponse.json(
          { error: "Server is missing Firebase credentials" },
          { status: 500 },
        );
      }
      docRef = db.collection("tourDeAlcoholism").doc("sharedList");
      const snapshot = await docRef.get();
      const data = snapshot.data();
      const bars = (data?.bars as Array<Record<string, unknown>>) || [];
      existingBar = bars.find((bar) => bar.id === barId) || null;

      if (!existingBar) {
        return NextResponse.json({ error: "Bar not found" }, { status: 404 });
      }

      // Return cached result if already fetched
      if (
        existingBar.detailsFetched &&
        isUsefulDescription(existingBar.description) &&
        !forceRefresh
      ) {
        return NextResponse.json({ result: existingBar });
      }
    }

    // Call Gemini with a 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${
          process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
        }:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY || "",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini error:", geminiData);
      return NextResponse.json(
        {
          error:
            geminiData?.error?.message || "Gemini request failed",
        },
        { status: geminiResponse.status },
      );
    }

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("\n") || "";

    const parsed = safeParse(rawText);

    // Search / random-pick calls (no barId): return suggestions array or single object
    if (!barId) {
      const result = Array.isArray(parsed)
        ? parsed.map(normalizeSuggestion).filter((b) => b && b.name)
        : normalizeSuggestion(parsed);
      return NextResponse.json({ result });
    }

    // Bar-details call for a specific verified bar
    const details = normalizeDetails(parsed);
    if (!details || !isUsefulDescription(details.description)) {
      return NextResponse.json(
        {
          error: "No usable bar description returned. Please try again.",
        },
        { status: 422 },
      );
    }

    // Merge this bar's new details back into the array inside a transaction
    // that re-reads the doc at commit time, not using the `bars` snapshot
    // captured before the (up to 10s) Gemini call above. Without this, a
    // concurrent edit (disqualify, maps link, another bar's enrichment)
    // made while this request was in flight would get silently reverted
    // when this write landed with a stale full-array copy. Firestore
    // transactions also auto-retry if another write races this one.
    let mergedBar: Record<string, unknown>;
    try {
      mergedBar = await (db as FirebaseFirestore.Firestore).runTransaction(
        async (tx) => {
        const freshSnap = await tx.get(docRef as FirebaseFirestore.DocumentReference);
        const freshBars = (freshSnap.data()?.bars as Array<Record<string, unknown>>) || [];
        const freshExisting = freshBars.find((bar) => bar.id === barId);
        if (!freshExisting) {
          throw new Error("BAR_REMOVED");
        }
        const merged = {
          ...freshExisting,
          // Never overwrite verified address/location data from Places
          neighborhood: details.neighborhood || freshExisting.neighborhood,
          description: details.description,
          tags: details.tags && details.tags.length ? details.tags : freshExisting.tags,
          happyHour: details.happyHour || freshExisting.happyHour,
          capacity: details.capacityHint || freshExisting.capacity,
          detailsFetched: true,
          lastUpdated: new Date().toISOString(),
        };
        const updatedBars = freshBars.map((bar) =>
          bar.id === barId ? merged : bar,
        );
        tx.update(docRef as FirebaseFirestore.DocumentReference, { bars: updatedBars });
        return merged;
      });
    } catch (txError) {
      if ((txError as Error).message === "BAR_REMOVED") {
        // The bar was deleted by someone else while this request was in flight.
        return NextResponse.json({ error: "Bar not found" }, { status: 404 });
      }
      throw txError;
    }

    return NextResponse.json({ result: mergedBar });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.error("Gemini request timed out");
      return NextResponse.json(
        { error: "Gemini request timed out" },
        { status: 504 },
      );
    }
    console.error("Server error:", error);
    return NextResponse.json(
      {
        error:
          (error as Error).message || "Failed to generate details",
      },
      { status: 500 },
    );
  }
}

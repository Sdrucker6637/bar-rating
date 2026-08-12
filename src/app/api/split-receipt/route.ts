import { NextResponse } from "next/server";

// Takes one or more base64-encoded receipt images for a SINGLE place and
// asks Gemini to extract itemized line items, tax, tip, and the place name.
// The images may be screenshots of a digital receipt OR photographs of a
// physical paper receipt — both feed the same pipeline. Multiple images are
// sent in one call so Gemini can see them together and avoid re-listing a
// line that appears in more than one (e.g. a long receipt that didn't fit in
// a single image, with shots/photos that overlap). No Firestore involved —
// this is a stateless parse.

interface ReceiptItem {
  name: string;
  price: number | null;
  quantity: number;
}

interface Receipt {
  placeName: string;
  items: ReceiptItem[];
  tax: number;
  tip: number;
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

// Backstop for the "don't duplicate items across screenshots" rule — Gemini
// is instructed to dedupe itself, but this catches anything that slips
// through by dropping later items with an identical name + price.
function dedupeItems(items: ReceiptItem[]): ReceiptItem[] {
  const seen = new Set<string>();
  const out: ReceiptItem[] = [];
  for (const it of items) {
    const key = `${it.name.trim().toLowerCase()}|${it.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function normalizeReceipt(parsed: unknown): Receipt | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return null;
  const p = parsed as Record<string, unknown>;
  const rawItems = Array.isArray(p.items)
    ? (p.items as Record<string, unknown>[])
        .map((it) => ({
          name: typeof it.name === "string" ? it.name.trim() : "",
          price: Number.isFinite(Number(it.price)) ? Number(it.price) : null,
          quantity:
            Number.isFinite(Number(it.quantity)) && Number(it.quantity) > 0
              ? Number(it.quantity)
              : 1,
        }))
        .filter((it): it is ReceiptItem => !!it.name && it.price !== null)
    : [];
  return {
    placeName: typeof p.placeName === "string" ? p.placeName.trim() : "",
    items: dedupeItems(rawItems),
    tax: Number.isFinite(Number(p.tax)) ? Number(p.tax) : 0,
    tip: Number.isFinite(Number(p.tip)) ? Number(p.tip) : 0,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      images?: { base64: string; mimeType?: string }[];
    };
    const images = Array.isArray(body.images) ? body.images : [];
    if (images.length === 0) {
      return NextResponse.json({ error: "Missing images" }, { status: 400 });
    }

    const prompt = `You are reading one or more images of the SAME itemized restaurant/bar receipt. Each image may be EITHER a screenshot of a digital receipt OR a photograph of a physical paper receipt — treat both the same way.

Photographs can be imperfect: slightly angled, long and narrow, shadowed, unevenly lit, a little blurry, crumpled, or showing the table/background/edges around the receipt. Ignore all of that. Sometimes a long receipt doesn't fit in a single image, so multiple images may cover overlapping or continuing sections of the same receipt.

Return ONLY JSON in this exact shape, nothing else:

{"placeName":"string or null","items":[{"name":"string","price":0.00,"quantity":1}],"tax":0.00,"tip":0.00}

Rules:
- Extract every purchasable line item (food, drink, etc.) as an item with its name and price.
- "placeName" is the bar/restaurant name if it's visible anywhere in the images, otherwise null.
- "price" is the line's total price (already multiplied by quantity if the receipt shows it that way) — do not double-count quantity.
- If the same line item appears in more than one image because they overlap, only include it ONCE in the result.
- If quantity isn't shown, use 1.
- If tax or tip aren't visible, use 0.
- Do NOT list subtotal, tax, tip, total, discounts, or payment information as items — only actual purchasable items.
- If the image is too blurry or unreadable to extract any items confidently, return an empty items list.
- Do not invent items that aren't in the images.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

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
            contents: [
              {
                parts: [
                  { text: prompt },
                  ...images.map((img) => ({
                    inline_data: {
                      mime_type: img.mimeType || "image/jpeg",
                      data: img.base64,
                    },
                  })),
                ],
              },
            ],
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
        { error: geminiData?.error?.message || "Gemini request failed" },
        { status: geminiResponse.status },
      );
    }

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("\n") || "";

    const parsed = safeParse(rawText);
    const receipt = normalizeReceipt(parsed);

    if (!receipt || receipt.items.length === 0) {
      return NextResponse.json(
        {
          error:
            "Couldn't read that receipt. Try a clearer photo with the entire receipt visible, or add items manually.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ result: receipt });
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
      { error: (error as Error).message || "Failed to parse receipt" },
      { status: 500 },
    );
  }
}

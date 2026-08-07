import { NextResponse } from "next/server";

// Takes a base64-encoded receipt screenshot and asks Gemini to extract
// itemized line items, tax, and tip. Used only by the "Split the Bill" tab.
// No Firestore involved — this is a stateless parse, same pattern as the
// no-barId branch of the gemini route.

interface ReceiptItem {
  name: string;
  price: number | null;
  quantity: number;
}

interface Receipt {
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

function normalizeReceipt(parsed: unknown): Receipt | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return null;
  const p = parsed as Record<string, unknown>;
  const items = Array.isArray(p.items)
    ? (p.items as Record<string, unknown>[])
        .map((it) => ({
          name: typeof it.name === "string" ? it.name.trim() : "",
          price: Number.isFinite(Number(it.price)) ? Number(it.price) : null,
          quantity:
            Number.isFinite(Number(it.quantity)) && Number(it.quantity) > 0
              ? Number(it.quantity)
              : 1,
        }))
        .filter((it) => it.name && it.price !== null)
    : [];
  return {
    items,
    tax: Number.isFinite(Number(p.tax)) ? Number(p.tax) : 0,
    tip: Number.isFinite(Number(p.tip)) ? Number(p.tip) : 0,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      imageBase64?: string;
      mimeType?: string;
    };
    const { imageBase64, mimeType = "image/jpeg" } = body;
    if (!imageBase64) {
      return NextResponse.json(
        { error: "Missing imageBase64" },
        { status: 400 },
      );
    }

    const prompt = `You are reading a screenshot of an itemized restaurant/bar receipt.

Return ONLY JSON in this exact shape, nothing else:

{"items":[{"name":"string","price":0.00,"quantity":1}],"tax":0.00,"tip":0.00}

Rules:
- "price" is the line's total price (already multiplied by quantity if the receipt shows it that way) — do not double-count quantity.
- If quantity isn't shown, use 1.
- If tax or tip aren't visible on the receipt, use 0.
- Do not include subtotal or total as items.
- Do not invent items that aren't in the image.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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
                  { inline_data: { mime_type: mimeType, data: imageBase64 } },
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
    const receipt = normalizeReceipt(parsed);

    if (!receipt || receipt.items.length === 0) {
      return NextResponse.json(
        {
          error:
            "Couldn't read any items from that screenshot. Try a clearer image, or add items manually.",
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
      {
        error: (error as Error).message || "Failed to parse receipt",
      },
      { status: 500 },
    );
  }
}

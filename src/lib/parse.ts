export function safeParse(
  text: string,
  isArray?: boolean,
): unknown {
  const cleaned = (text || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // fall through to bracket extraction
  }
  const re = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const m = cleaned.match(re);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch (e) {
      // give up
    }
  }
  return null;
}

const PRICE_LEVEL_SYMBOLS: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

/** Google Places' priceLevel enum ("PRICE_LEVEL_MODERATE", …) rendered as the
 *  familiar $ scale, or null when the field is missing/unrecognized. */
export function priceLevelSymbol(priceLevel: string | undefined): string | null {
  if (!priceLevel) return null;
  return PRICE_LEVEL_SYMBOLS[priceLevel] ?? null;
}

export function displayDescription(value: unknown): string {
  if (typeof value !== "string") return "";
  const parsed = safeParse(value, false);
  return parsed &&
    !Array.isArray(parsed) &&
    typeof (parsed as { description?: unknown }).description === "string"
    ? ((parsed as { description: string }).description as string).trim()
    : value.trim();
}

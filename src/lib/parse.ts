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

export function displayDescription(value: unknown): string {
  if (typeof value !== "string") return "";
  const parsed = safeParse(value, false);
  return parsed &&
    !Array.isArray(parsed) &&
    typeof (parsed as { description?: unknown }).description === "string"
    ? ((parsed as { description: string }).description as string).trim()
    : value.trim();
}

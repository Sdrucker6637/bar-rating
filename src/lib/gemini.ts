import { isUsefulDescription } from "./enrichment";

const geminiCache: Record<string, unknown> = {};

/** The route 200s empty Gemini output as a valid-looking all-empty object
 *  (search/suggestion calls have no barId, so they skip the route's 422
 *  usable-description gate). Caching that empty object would poison retries:
 *  a re-queued attempt with the same prompt would hit the cache and "fail"
 *  instantly without ever calling Gemini again. Only cache results that
 *  actually carry a usable description. */
function isCacheableResult(value: unknown): boolean {
  if (!value || Array.isArray(value)) return false;
  const single = value as { description?: unknown };
  return isUsefulDescription(single.description);
}

export async function callGemini(
  prompt: string,
  barId: string | null,
  forceRefresh: boolean,
): Promise<unknown> {
  const key = barId || prompt;
  if (!forceRefresh && geminiCache[key]) return geminiCache[key];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let response: Response | undefined;
  try {
    response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        barId,
        forceRefresh: !!forceRefresh,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    console.error("[gemini] request failed", e);
    return null;
  }
  clearTimeout(timeoutId);
  if (!response) return null;
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error(`[gemini] ${response.status} for barId=${barId || "(none)"}`, errText);
    return null;
  }
  let data: { result?: unknown } | null = null;
  try {
    data = await response.json();
  } catch (e) {
    console.error("[gemini] response was not valid JSON", e);
    return null;
  }
  if (!data || !data.result) {
    console.warn(`[gemini] no result field for barId=${barId || "(none)"}`, data);
  }
  if (data?.result && isCacheableResult(data.result)) {
    geminiCache[key] = data.result;
  }
  return data?.result || null;
}

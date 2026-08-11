/**
 * Fairly splits `totalCents` across entries proportional to `weight`,
 * guaranteeing the returned cents sum to EXACTLY `totalCents` (largest-
 * remainder method). This is what keeps e.g. a $8.00 item split 3 ways
 * from displaying as $2.67 + $2.67 + $2.67 = $8.01 — the leftover cent(s)
 * are handed to whichever share got rounded down the most.
 *
 * Used by both SplitClient's placeTotals() (grand per-person totals) and
 * SplitBillView's per-item display, so the on-screen breakdown for a
 * single item always matches what actually gets billed.
 */
export function distributeCents(
  totalCents: number,
  entries: Array<{ id: string; weight: number }>,
): Record<string, number> {
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return {};
  const shares = entries.map((e) => {
    const exact = (totalCents * e.weight) / totalWeight;
    return { id: e.id, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  const allocated = shares.reduce((sum, s) => sum + s.cents, 0);
  const leftover = totalCents - allocated;
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < leftover; i++) {
    byRemainder[i % byRemainder.length].cents += 1;
  }
  const out: Record<string, number> = {};
  shares.forEach((s) => {
    out[s.id] = s.cents;
  });
  return out;
}

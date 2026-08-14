import type { Bar, RankingBattle } from "./types";

/**
 * Global ranking rules (pure functions — no Firestore, no React).
 *
 * Primary:   numerical score (higher ranks higher)
 * Secondary: Bar Battle tiebreak (only consulted for bars with EQUAL scores)
 * Final:     deterministic fallback (name, then id) when battles don't fully
 *            decide a group — e.g. cyclic results (A>B, B>C, C>A) or bars
 *            that have never battled.
 *
 * A battle is only ever consulted when BOTH bars currently have the same
 * score. Battles between bars whose scores have since diverged are ignored,
 * and a battle never changes a score — it only reorders an exact tie.
 */

/** Scores are averages of 0.5-step ratings, so exact ties are the norm; a
 *  tiny epsilon keeps float noise from splitting a mathematically-equal tie
 *  into two "different" scores. */
const EPSILON = 1e-9;

export function scoresEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

export interface RankedEntry<T> {
  item: T;
  score: number | null;
}

export interface BattlePair {
  bar1: Bar;
  bar2: Bar;
  /** The shared score that made these two tie. */
  score: number;
}

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/**
 * Order a list of entries by score, breaking exact ties with recorded Bar
 * Battles. The full leaderboard uses this; the result is deterministic for a
 * given (bars, battles) state, so the displayed order is stable across
 * clients and reloads.
 *
 * Within a tie group each bar is scored by its battle record (wins desc,
 * losses asc — a simple Copeland-style count). This is cycle-safe: cyclic
 * results simply leave the tied members at equal counts, where the
 * name/id fallback produces a stable order instead of an unstable one.
 */
export function rankEntries<T extends { id: string; name: string }>(
  entries: RankedEntry<T>[],
  battles: RankingBattle[],
): T[] {
  const nullGroup: RankedEntry<T>[] = [];
  const groups = new Map<string, RankedEntry<T>[]>();
  for (const e of entries) {
    if (e.score === null || e.score === undefined || isNaN(e.score)) {
      nullGroup.push(e);
      continue;
    }
    const key = e.score.toFixed(9);
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }

  const out: T[] = [];
  // Score groups from highest to lowest, battle-ordered within each.
  const keys = [...groups.keys()].sort((a, b) => Number(b) - Number(a));
  for (const key of keys) {
    out.push(...orderGroup(groups.get(key)!, battles));
  }
  // Unscored bars go last (they have no rating to tie on), stable by name.
  nullGroup.sort(
    (a, b) =>
      a.item.name.localeCompare(b.item.name) || a.item.id.localeCompare(b.item.id),
  );
  out.push(...nullGroup.map((e) => e.item));
  return out;
}

function orderGroup<T extends { id: string; name: string }>(
  group: RankedEntry<T>[],
  battles: RankingBattle[],
): T[] {
  const ids = new Set(group.map((e) => e.item.id));
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  for (const btl of battles) {
    // Only battles between two bars currently in THIS tie group count —
    // a battle recorded while they were tied is ignored once their scores
    // diverge (or one of them leaves the group).
    if (!ids.has(btl.bar1Id) || !ids.has(btl.bar2Id)) continue;
    if (btl.winnerId === btl.bar1Id) {
      wins.set(btl.bar1Id, (wins.get(btl.bar1Id) || 0) + 1);
      losses.set(btl.bar2Id, (losses.get(btl.bar2Id) || 0) + 1);
    } else if (btl.winnerId === btl.bar2Id) {
      wins.set(btl.bar2Id, (wins.get(btl.bar2Id) || 0) + 1);
      losses.set(btl.bar1Id, (losses.get(btl.bar1Id) || 0) + 1);
    }
    // A malformed battle (winner is neither bar) is ignored.
  }
  return [...group]
    .sort(
      (a, b) =>
        (wins.get(b.item.id) || 0) - (wins.get(a.item.id) || 0) ||
        (losses.get(a.item.id) || 0) - (losses.get(b.item.id) || 0) ||
        a.item.name.localeCompare(b.item.name) ||
        a.item.id.localeCompare(b.item.id),
    )
    .map((e) => e.item);
}

/**
 * The pairs that still need a Bar Battle, in the order the user should
 * resolve them. Walk the current battle-ordered ranking and pick adjacent
 * bars that (a) share the same score, (b) are ranked and not disqualified,
 * and (c) have never battled. Recording a battle permanently removes that
 * pair from this set, so the process terminates and a battled pair is never
 * asked about again.
 */
export function pendingBattlePairs(
  entries: RankedEntry<Bar>[],
  battles: RankingBattle[],
): BattlePair[] {
  const battled = new Set(battles.map((b) => pairKey(b.bar1Id, b.bar2Id)));
  const eligible = entries.filter(
    (e) =>
      !e.item.disqualified &&
      e.score !== null &&
      e.score !== undefined &&
      !isNaN(e.score),
  );
  const ordered = rankEntries(eligible, battles);
  const scoreById = new Map(eligible.map((e) => [e.item.id, e.score as number]));

  const pairs: BattlePair[] = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    const a = ordered[i];
    const b = ordered[i + 1];
    const sa = scoreById.get(a.id);
    const sb = scoreById.get(b.id);
    if (sa === undefined || sb === undefined || !scoresEqual(sa, sb)) continue;
    if (battled.has(pairKey(a.id, b.id))) continue;
    pairs.push({ bar1: a, bar2: b, score: sa });
  }
  return pairs;
}

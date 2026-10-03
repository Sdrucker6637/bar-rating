/**
 * The Crew — who picked which bar. Mirrors ranking.ts's shape: plain
 * functions over plain data, no Firestore, no React.
 *
 * There are no accounts, so a "person" is just the name typed into the
 * ranking form. Names are matched case- and whitespace-insensitively:
 * "Spencer", "spencer" and " Spencer  " are all the same Spencer, and their
 * picks pool together on the crew board. A bar can instead be credited to
 * the app itself (Surprise Us, Nearby, a planned crawl stop), which competes
 * on the same board as one more contender.
 */

import type { Bar, RankingBattle } from "./types";
import { avgWithFood, avgWithoutFood } from "./scoring";
import { rankEntries } from "./ranking";

/** Board key reserved for "the app chose it" — can't collide with a typed
 *  name because pickerKey() never produces a leading underscore pair. */
export const APP_PICKER_KEY = "__app__";
export const APP_PICKER_NAME = "The App";

/** Collapse runs of whitespace and trim — the stored form of a typed name. */
export function cleanPickerName(raw: string | undefined | null): string {
  return (raw || "").replace(/\s+/g, " ").trim();
}

/** The identity used to pool picks: same letters, any case/spacing. */
export function pickerKey(raw: string): string {
  return cleanPickerName(raw).toLowerCase();
}

export interface Picker {
  key: string;
  name: string;
  isApp: boolean;
}

/** Who gets credit for a bar, or null if nobody was recorded. */
export function pickerOf(b: Bar): Picker | null {
  if (b.appPicked) return { key: APP_PICKER_KEY, name: APP_PICKER_NAME, isApp: true };
  const name = cleanPickerName(b.addedBy);
  if (!name) return null;
  return { key: pickerKey(name), name, isApp: false };
}

/** Bars whose origin means the app made the call — the form defaults the
 *  credit to the app for these (still overridable). */
export function originIsAppPick(origin: Bar["origin"] | undefined): boolean {
  return origin === "surprise" || origin === "nearby" || origin === "crawl";
}

const capitalized = (name: string) => (/^\p{Lu}/u.test(name) ? 1 : 0);

/** For each person, the spelling to show: whichever variant they've used
 *  most (ties → a capitalized spelling, then the most recent bar's). */
function displayNames(bars: Bar[]): Map<string, string> {
  const tallies = new Map<string, Map<string, { n: number; last: number }>>();
  bars.forEach((b) => {
    const p = pickerOf(b);
    if (!p || p.isApp) return;
    const variants = tallies.get(p.key) || new Map();
    const v = variants.get(p.name) || { n: 0, last: 0 };
    v.n += 1;
    v.last = Math.max(v.last, b.createdAt || 0);
    variants.set(p.name, v);
    tallies.set(p.key, variants);
  });
  const out = new Map<string, string>();
  tallies.forEach((variants, key) => {
    const best = [...variants.entries()].sort(
      (a, b) =>
        b[1].n - a[1].n ||
        capitalized(b[0]) - capitalized(a[0]) ||
        b[1].last - a[1].last ||
        a[0].localeCompare(b[0]),
    )[0];
    out.set(key, best[0]);
  });
  return out;
}

/** Every person who has ever picked a bar (any status), most picks first —
 *  the quick-pick chips in the ranking form. Excludes the app. */
export function knownPickers(bars: Bar[]): string[] {
  const names = displayNames(bars);
  const counts = new Map<string, number>();
  bars.forEach((b) => {
    const p = pickerOf(b);
    if (p && !p.isApp) counts.set(p.key, (counts.get(p.key) || 0) + 1);
  });
  return [...names.entries()]
    .sort((a, b) => (counts.get(b[0]) || 0) - (counts.get(a[0]) || 0) || a[1].localeCompare(b[1]))
    .map(([, name]) => name);
}

/** The display spelling for whatever was typed, if that person already
 *  exists — lets the form say "adds to Spencer's picks". */
export function matchKnownPicker(bars: Bar[], typed: string): string | null {
  const key = pickerKey(typed);
  if (!key) return null;
  return displayNames(bars).get(key) ?? null;
}

export interface CrewPick {
  bar: Bar;
  score: number | null;
  /** Position on the overall leaderboard, null if disqualified/unscored. */
  rank: number | null;
}

export interface CrewEntry {
  key: string;
  name: string;
  isApp: boolean;
  /** Every visited bar credited to this picker, best first. */
  picks: CrewPick[];
  /** Picks with a live score (not disqualified, at least one rating). */
  scoredCount: number;
  /** Mean overall score of the scored picks, null if none. */
  average: number | null;
  best: CrewPick | null;
  worst: CrewPick | null;
  /** How many picks currently sit in the overall top 3. */
  podiums: number;
  /** True if this picker's bar is the overall #1 right now. */
  holdsLead: boolean;
  disqualified: number;
}

/**
 * The crew board: one entry per picker over the visited bars, ordered by
 * average pick score (desc), then more picks, then name. Pickers with no
 * scored picks yet sort last. Overall ranks come from rankEntries, the
 * same function the bar leaderboard renders with, so "#1" always agrees.
 */
export function crewStandings(
  bars: Bar[],
  battles: RankingBattle[],
  foodMode: "with" | "without" = "with",
): CrewEntry[] {
  const visited = bars.filter((b) => b.status === "visited");
  const scoreOf = (b: Bar) =>
    b.disqualified ? null : foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b);

  const ranked = rankEntries(
    visited
      .filter((b) => !b.disqualified)
      .map((b) => ({ item: b, score: scoreOf(b) }))
      .filter((e): e is { item: Bar; score: number } => e.score !== null),
    battles,
  );
  const rankById = new Map(ranked.map((b, i) => [b.id, i + 1]));
  const names = displayNames(bars);

  const groups = new Map<string, CrewEntry>();
  visited.forEach((b) => {
    const p = pickerOf(b);
    if (!p) return;
    let e = groups.get(p.key);
    if (!e) {
      e = {
        key: p.key,
        name: p.isApp ? APP_PICKER_NAME : names.get(p.key) || p.name,
        isApp: p.isApp,
        picks: [],
        scoredCount: 0,
        average: null,
        best: null,
        worst: null,
        podiums: 0,
        holdsLead: false,
        disqualified: 0,
      };
      groups.set(p.key, e);
    }
    e.picks.push({ bar: b, score: scoreOf(b), rank: rankById.get(b.id) ?? null });
  });

  const entries = [...groups.values()];
  entries.forEach((e) => {
    e.picks.sort(
      (a, b) =>
        (a.rank ?? Infinity) - (b.rank ?? Infinity) ||
        (b.score ?? -1) - (a.score ?? -1) ||
        a.bar.name.localeCompare(b.bar.name),
    );
    const scored = e.picks.filter((p) => p.score !== null);
    e.scoredCount = scored.length;
    e.average = scored.length
      ? scored.reduce((sum, p) => sum + (p.score as number), 0) / scored.length
      : null;
    e.best = scored[0] ?? null;
    e.worst = scored.length > 1 ? scored[scored.length - 1] : null;
    e.podiums = e.picks.filter((p) => p.rank !== null && p.rank <= 3).length;
    e.holdsLead = e.picks.some((p) => p.rank === 1);
    e.disqualified = e.picks.filter((p) => p.bar.disqualified).length;
  });

  return entries.sort(
    (a, b) =>
      (a.average === null ? 1 : 0) - (b.average === null ? 1 : 0) ||
      (b.average ?? 0) - (a.average ?? 0) ||
      b.picks.length - a.picks.length ||
      a.name.localeCompare(b.name),
  );
}

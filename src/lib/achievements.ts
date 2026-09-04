/**
 * The achievement catalog and every pure check function that decides
 * whether one has been earned. Mirrors ranking.ts's shape: no Firestore, no
 * React — plain functions over plain data, called from tour-context.tsx
 * (which owns detecting new unlocks and persisting them) and from
 * SplitClient.tsx (for the split-the-bill trio, which never touches
 * Firestore itself).
 *
 * There are no accounts in this app, so nothing here is "earned by a
 * person" — an achievement is a fact about the shared house list becoming
 * true at least once. Once true, it is written to `achievementUnlocks` on
 * the shared doc and never re-evaluated: later edits (disqualifying a
 * 9-scoring bar, removing a bar, editing a rating) never revoke it. Each
 * check function below only answers "is this true RIGHT NOW" — the
 * one-time/permanent guarantee lives in tour-context's diff-against-
 * already-unlocked logic, not here.
 */

import type { Bar, RankingBattle } from "./types";
import { avgWithFood, avgWithoutFood, estimateWalkMinutes, haversineMeters } from "./scoring";
import { rankEntries } from "./ranking";

export type AchievementCategory =
  | "exploration"
  | "rating"
  | "battle"
  | "wishlist"
  | "crawl"
  | "split";

export interface AchievementDef {
  key: string;
  name: string;
  desc: string;
  category: AchievementCategory;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- Exploration ----
  { key: "bar_hopper", name: "Bar Hopper", desc: "Visit 10 bars.", category: "exploration" },
  { key: "bar_slut", name: "Bar Slut", desc: "Visit 25 bars.", category: "exploration" },
  { key: "local_legend", name: "Local Legend", desc: "Visit 5 bars in the same neighborhood.", category: "exploration" },
  { key: "touch_grass", name: "Touch Grass", desc: "Visit bars in 10 different neighborhoods.", category: "exploration" },
  { key: "gps_gremlin", name: "GPS Gremlin", desc: "Add or visit a bar found through Nearby.", category: "exploration" },
  { key: "fuck_around_find_out", name: "Fuck Around & Find Out", desc: "Use Surprise Us and actually go rate the bar it gave you.", category: "exploration" },
  { key: "one_for_the_road", name: "One for the Road", desc: "Add a bar straight from a crawl stop.", category: "exploration" },
  { key: "absolutely_no_reason", name: "Absolutely No Reason", desc: "Add a bar with no notes, tags, or description at all.", category: "exploration" },

  // ---- Rating ----
  { key: "whore_for_the_score", name: "Whore for the Score", desc: "Fully rate 10 bars.", category: "rating" },
  { key: "professional_bar_enjoyer", name: "Professional Bar Enjoyer", desc: "Fully rate 25 bars.", category: "rating" },
  { key: "golden_throne", name: "Golden Throne", desc: "Award a bar bonus points just for its bathroom.", category: "rating" },
  { key: "the_connoisseur", name: "The Connoisseur", desc: "Give a bar the exact same score in every category.", category: "rating" },
  { key: "harsh_critic", name: "Harsh Critic", desc: "Every category ≤4.", category: "rating" },
  { key: "generous_soul", name: "Generous Soul", desc: "Every category ≥9.", category: "rating" },
  { key: "red_flag", name: "Red Flag", desc: "One category ≤3, another ≥9, same bar.", category: "rating" },
  { key: "money_talks", name: "Money Talks", desc: "Value is a bar's highest-rated category.", category: "rating" },
  { key: "food_critic", name: "Food Critic", desc: "Food ≥9 and Drinks ≤6.", category: "rating" },
  { key: "fuck_thats_good", name: "Fuck, That's Good", desc: "Overall score 9+.", category: "rating" },
  { key: "fuck_thats_bad", name: "Fuck, That's Bad", desc: "Overall score ≤4.", category: "rating" },
  { key: "good_head", name: "Good Head", desc: "Vibe score of 9+.", category: "rating" },
  { key: "we_need_to_talk", name: "We Need to Talk", desc: "Service score of 3 or below.", category: "rating" },
  { key: "go_big_or_go_home", name: "Go Big or Go Home", desc: "Visit a bar with 20+ capacity.", category: "rating" },
  { key: "tight_squeeze", name: "Tight Squeeze", desc: "Visit a bar with 5 or less capacity.", category: "rating" },
  { key: "i_can_fix_her", name: "I Can Fix Her", desc: "A bar scores ≤5 overall but has one category at 8+.", category: "rating" },

  // ---- Leaderboard & Bar Battle ----
  { key: "house_record", name: "The House Record", desc: "The first bar to ever reach #1.", category: "battle" },
  { key: "top_shelf", name: "Top Shelf", desc: "Have at least 10 ranked bars on the board.", category: "battle" },
  { key: "peoples_champion", name: "The People's Champion", desc: "Win a Bar Battle that flips who's #1.", category: "battle" },
  { key: "cockfight", name: "Cockfight", desc: "Take part in your first Bar Battle.", category: "battle" },
  { key: "sword_fight", name: "Sword Fight", desc: "Take part in 5 Bar Battles total.", category: "battle" },
  { key: "bottoms_up", name: "Bottoms Up", desc: "Pick the lower-ranked bar in a battle.", category: "battle" },
  { key: "split_decision", name: "Split Decision", desc: "Win any tiebreaker vote.", category: "battle" },
  { key: "time_loop", name: "Time Loop", desc: "Cause a three-way tie where nobody actually wins.", category: "battle" },
  { key: "cherry_picked", name: "Cherry Picked", desc: "Personally settle every vote in a multi-way tie in one go.", category: "battle" },
  { key: "its_not_you_its_me", name: "It's Not You, It's Me", desc: "Disqualify a bar from the running.", category: "battle" },
  { key: "redemption_arc", name: "Redemption Arc", desc: "Reinstate a bar you'd disqualified.", category: "battle" },

  // ---- Wishlist ----
  { key: "window_shopper", name: "Window Shopper", desc: "Add your first wishlist bar.", category: "wishlist" },
  { key: "i_have_a_type", name: "I Have a Type", desc: "Wishlist 5 bars in the same neighborhood.", category: "wishlist" },
  { key: "someday", name: "Someday", desc: "10+ bars sitting on the wishlist.", category: "wishlist" },
  { key: "wishlist_hoarder", name: "Wishlist Hoarder", desc: "20+ bars sitting on the wishlist.", category: "wishlist" },
  { key: "finally", name: "Finally", desc: "Visit your first wishlisted bar.", category: "wishlist" },
  { key: "dream_to_reality", name: "Dream → Reality", desc: "Visit 5 wishlisted bars.", category: "wishlist" },
  { key: "one_night_stand", name: "One-Night Stand", desc: "Wishlist a bar, then pull it the same night.", category: "wishlist" },
  { key: "doesnt_fit_our_group", name: "Doesn't Fit Our Group", desc: "Get bounced by the capacity filter three times.", category: "wishlist" },

  // ---- Crawl Planning ----
  { key: "third_base", name: "Third Base", desc: "Plan a 3-stop crawl.", category: "crawl" },
  { key: "no_survivors", name: "No Survivors", desc: "Plan the full 8-stop crawl.", category: "crawl" },
  { key: "no_plan_just_vibes", name: "No Plan, Just Vibes", desc: "Start a crawl with no starting bar picked.", category: "crawl" },
  { key: "sole_survivor", name: "Sole Survivor", desc: "A whole crawl where every walk stays short.", category: "crawl" },
  { key: "quickie", name: "Quickie", desc: "Two crawl stops just a couple minutes apart.", category: "crawl" },
  { key: "menace_to_sobriety", name: "Menace to Sobriety", desc: "Bathroom bonuses at 3 different bars in one crawl.", category: "crawl" },
  { key: "walk_of_shame", name: "Walk of Shame", desc: "The last leg of a crawl turns into a real hike.", category: "crawl" },
  { key: "commitment_issues", name: "Commitment Issues", desc: "Swap the same crawl stop three-plus times.", category: "crawl" },

  // ---- Split the Bill ----
  { key: "itemized_to_death", name: "Itemized to Death", desc: "Hand-assign every item instead of splitting evenly.", category: "split" },
  { key: "exact_change", name: "Exact Change", desc: "Someone's share lands on a round dollar amount.", category: "split" },
  { key: "sugar_daddy_sugar_mama", name: "Sugar Daddy / Sugar Mama", desc: "Cover the whole group's bill at 2+ places in one night.", category: "split" },
];

export const ACHIEVEMENTS_BY_KEY: Map<string, AchievementDef> = new Map(
  ACHIEVEMENTS.map((a) => [a.key, a]),
);

const RATING_KEYS = ["vibe", "value", "service", "food", "drinks"] as const;

function ratingValues(b: Bar): number[] {
  return RATING_KEYS.map((k) => b[k]).filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(Number(v)),
  );
}

function overallScore(b: Bar): number | null {
  const withFood = avgWithFood(b);
  return withFood !== null ? withFood : avgWithoutFood(b);
}

function hasFullRating(b: Bar): boolean {
  return !b.disqualified && avgWithFood(b) !== null;
}

function neighborhoodCounts(bars: Bar[]): Map<string, number> {
  const counts = new Map<string, number>();
  bars.forEach((b) => {
    const n = (b.neighborhood || "").trim();
    if (!n) return;
    counts.set(n, (counts.get(n) || 0) + 1);
  });
  return counts;
}

/** Groups battled bars by their current exact score — the same tie-group
 *  concept ranking.ts uses internally, rebuilt here (from ranking.ts's
 *  exported pieces alone) so the battle-based achievements below can reason
 *  about "this pair's tie group" without reaching into ranking.ts's
 *  private helpers. */
function scoreGroupsOf(bars: Bar[], foodMode: "with" | "without"): Map<string, Bar[]> {
  const groups = new Map<string, Bar[]>();
  bars.forEach((b) => {
    if (b.disqualified) return;
    const score = foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b);
    if (score === null) return;
    const key = score.toFixed(9);
    const list = groups.get(key);
    if (list) list.push(b);
    else groups.set(key, [b]);
  });
  return groups;
}

/** Battle-derived checks: which of house_record / top_shelf / peoples_champion
 *  / bottoms_up / time_loop are true right now, given the current bars and
 *  every recorded battle. Reuses rankEntries (the same function the real
 *  leaderboard renders with) so "who's #1" here always matches the UI. */
function checkBattleDerivedKeys(
  bars: Bar[],
  battles: RankingBattle[],
): Set<string> {
  const out = new Set<string>();
  const foodMode: "with" | "without" = "with";
  const scored = bars
    .filter((b) => !b.disqualified)
    .map((b) => ({ item: b, score: avgWithFood(b) }))
    .filter((e): e is { item: Bar; score: number } => e.score !== null);

  if (scored.length > 0) out.add("house_record");
  if (scored.length >= 10) out.add("top_shelf");

  // Time Loop: a cyclic win graph within any current score-tie group of 3+.
  const groups = scoreGroupsOf(bars, foodMode);
  for (const group of groups.values()) {
    if (group.length < 3) continue;
    const ids = new Set(group.map((b) => b.id));
    const wins = new Map<string, string[]>();
    battles.forEach((btl) => {
      if (!ids.has(btl.bar1Id) || !ids.has(btl.bar2Id)) return;
      const loser = btl.winnerId === btl.bar1Id ? btl.bar2Id : btl.bar1Id;
      if (![btl.bar1Id, btl.bar2Id].includes(btl.winnerId)) return; // malformed
      const list = wins.get(btl.winnerId) || [];
      list.push(loser);
      wins.set(btl.winnerId, list);
    });
    // DFS cycle detection over the win graph restricted to this group.
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    let cyclic = false;
    const visit = (id: string) => {
      if (cyclic) return;
      color.set(id, GRAY);
      for (const next of wins.get(id) || []) {
        const c = color.get(next) ?? WHITE;
        if (c === GRAY) {
          cyclic = true;
          return;
        }
        if (c === WHITE) visit(next);
      }
      color.set(id, BLACK);
    };
    for (const id of ids) {
      if ((color.get(id) ?? WHITE) === WHITE) visit(id);
      if (cyclic) break;
    }
    if (cyclic) out.add("time_loop");
  }

  // People's Champion / Bottoms Up: replay each battle in recorded order and
  // compare against (a) the ranking without it, and (b) the group's plain
  // name/id order (what would decide it with zero battles) to tell whether
  // the winner was the current #1-maker or the "underdog" pick.
  const sortedBattles = [...battles].sort((a, b) => a.createdAt - b.createdAt);
  for (const btl of sortedBattles) {
    if (![btl.bar1Id, btl.bar2Id].includes(btl.winnerId)) continue;
    const without = battles.filter((x) => x.id !== btl.id);
    const rankWithout = rankEntries(scored, without);
    const rankWith = rankEntries(scored, battles);
    const topWithout = rankWithout[0]?.id ?? null;
    const topWith = rankWith[0]?.id ?? null;
    if (topWith !== topWithout && topWith === btl.winnerId) {
      out.add("peoples_champion");
    }
    const group = groups.get(
      (scored.find((e) => e.item.id === btl.bar1Id)?.score ?? -1).toFixed(9),
    );
    if (group) {
      const baseline = [...group].sort(
        (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      );
      const winnerBaselineIdx = baseline.findIndex((b) => b.id === btl.winnerId);
      const loserId = btl.winnerId === btl.bar1Id ? btl.bar2Id : btl.bar1Id;
      const loserBaselineIdx = baseline.findIndex((b) => b.id === loserId);
      if (
        winnerBaselineIdx >= 0 &&
        loserBaselineIdx >= 0 &&
        winnerBaselineIdx > loserBaselineIdx
      ) {
        out.add("bottoms_up");
      }
    }
  }

  return out;
}

/**
 * The main derivation pass: every achievement checkable purely from the
 * shared list's current state (plus the two small counters that live
 * alongside it). Called on every bars/battles change; the caller diffs the
 * result against already-unlocked keys and persists only what's new.
 */
export function checkDerivedAchievements(
  bars: Bar[],
  battles: RankingBattle[],
  capacityFilterMisses: number,
): Set<string> {
  const out = new Set<string>();
  const visited = bars.filter((b) => b.status === "visited");
  const toTry = bars.filter((b) => b.status === "to-try");

  // ---- Exploration ----
  if (visited.length >= 10) out.add("bar_hopper");
  if (visited.length >= 25) out.add("bar_slut");
  const visitedHoods = neighborhoodCounts(visited);
  if ([...visitedHoods.values()].some((n) => n >= 5)) out.add("local_legend");
  if (visitedHoods.size >= 10) out.add("touch_grass");
  if (bars.some((b) => b.origin === "nearby")) out.add("gps_gremlin");
  if (
    bars.some(
      (b) => b.origin === "surprise" && b.status === "visited" && overallScore(b) !== null,
    )
  )
    out.add("fuck_around_find_out");
  if (bars.some((b) => b.origin === "crawl")) out.add("one_for_the_road");
  if (
    bars.some(
      (b) =>
        !b.notes?.trim() &&
        (!b.tags || b.tags.length === 0) &&
        !b.description?.trim(),
    )
  )
    out.add("absolutely_no_reason");

  // ---- Rating ----
  const fullyRated = bars.filter(hasFullRating);
  if (fullyRated.length >= 10) out.add("whore_for_the_score");
  if (fullyRated.length >= 25) out.add("professional_bar_enjoyer");
  if (bars.some((b) => b.bathroomBonus > 0)) out.add("golden_throne");
  for (const b of bars) {
    const vals = ratingValues(b);
    if (vals.length === 5 && vals.every((v) => v === vals[0])) out.add("the_connoisseur");
    if (vals.length === 5 && vals.every((v) => v <= 4)) out.add("harsh_critic");
    if (vals.length === 5 && vals.every((v) => v >= 9)) out.add("generous_soul");
    if (vals.length > 0 && Math.min(...vals) <= 3 && Math.max(...vals) >= 9) out.add("red_flag");
    if (
      vals.length === 5 &&
      b.value !== null &&
      RATING_KEYS.every((k) => k === "value" || (b[k] as number) <= (b.value as number))
    )
      out.add("money_talks");
    if (b.food !== null && b.food >= 9 && b.drinks !== null && b.drinks <= 6)
      out.add("food_critic");
    const overall = overallScore(b);
    if (overall !== null && overall >= 9) out.add("fuck_thats_good");
    if (overall !== null && overall <= 4) out.add("fuck_thats_bad");
    if (b.vibe !== null && b.vibe >= 9) out.add("good_head");
    if (b.service !== null && b.service <= 3) out.add("we_need_to_talk");
    if (b.status === "visited" && b.capacity !== null && b.capacity >= 20)
      out.add("go_big_or_go_home");
    if (
      b.status === "visited" &&
      b.capacity !== null &&
      b.capacity > 0 &&
      b.capacity <= 5
    )
      out.add("tight_squeeze");
    if (overall !== null && overall <= 5 && vals.length > 0 && Math.max(...vals) >= 8)
      out.add("i_can_fix_her");
  }

  // ---- Leaderboard & Bar Battle ----
  checkBattleDerivedKeys(bars, battles).forEach((k) => out.add(k));
  if (battles.length >= 1) {
    out.add("cockfight");
    out.add("split_decision");
  }
  if (battles.length >= 5) out.add("sword_fight");
  if (bars.some((b) => b.disqualified)) out.add("its_not_you_its_me");
  if (bars.some((b) => b.wasDisqualified && !b.disqualified)) out.add("redemption_arc");

  // ---- Wishlist ----
  if (toTry.length >= 1) out.add("window_shopper");
  if (toTry.length >= 10) out.add("someday");
  if (toTry.length >= 20) out.add("wishlist_hoarder");
  const wishHoods = neighborhoodCounts(toTry);
  if ([...wishHoods.values()].some((n) => n >= 5)) out.add("i_have_a_type");
  const fromWishlist = visited.filter((b) => b.cameFromWishlist);
  if (fromWishlist.length >= 1) out.add("finally");
  if (fromWishlist.length >= 5) out.add("dream_to_reality");
  if (capacityFilterMisses >= 3) out.add("doesnt_fit_our_group");

  return out;
}

/** removeBar checks this BEFORE deleting the record — the bar won't exist
 *  to check afterward. "Same night" is approximated as within 24h of
 *  creation; legacy bars with no createdAt never match (there's no honest
 *  answer for when they were really added). */
export function isOneNightStand(bar: Bar): boolean {
  if (bar.status !== "to-try" || !bar.createdAt) return false;
  return Date.now() - bar.createdAt < 24 * 60 * 60 * 1000;
}

/** Bathroom-bonus bars, cross-referenced against the names of the most
 *  recently PLANNED crawl (kept even after the crawl modal closes, so a
 *  rating entered afterward can still count). Best-effort by nature — the
 *  app doesn't track "which crawl a rating happened during" as a hard
 *  link, just name overlap with the last plan. */
export function checkMenaceToSobriety(
  lastCrawlStopNames: Set<string>,
  bars: Bar[],
): boolean {
  if (lastCrawlStopNames.size === 0) return false;
  const hits = bars.filter(
    (b) => lastCrawlStopNames.has(b.name) && b.bathroomBonus > 0,
  );
  return hits.length >= 3;
}

interface CrawlStopLike {
  name: string;
  latitude: number | null;
  longitude: number | null;
}

/** Everything derivable from one finished crawl plan: length-based badges
 *  and the "every walk stayed short" / "one walk was very short" pair. Call
 *  once right after a plan finishes. */
export function checkCrawlPlanAchievements(stops: CrawlStopLike[]): string[] {
  const out: string[] = [];
  if (stops.length >= 3) out.push("third_base");
  if (stops.length >= 8) out.push("no_survivors");
  if (stops.length < 2) return out;
  const walkMinutes: number[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (
      !Number.isFinite(a.latitude) ||
      !Number.isFinite(a.longitude) ||
      !Number.isFinite(b.latitude) ||
      !Number.isFinite(b.longitude)
    )
      continue;
    walkMinutes.push(
      estimateWalkMinutes(
        haversineMeters(
          a.latitude as number,
          a.longitude as number,
          b.latitude as number,
          b.longitude as number,
        ),
      ),
    );
  }
  if (walkMinutes.length > 0 && walkMinutes.every((m) => m <= 8)) out.push("sole_survivor");
  if (walkMinutes.some((m) => m <= 2)) out.push("quickie");
  if (walkMinutes.some((m) => m >= 15)) out.push("walk_of_shame");
  return out;
}

/** Split-the-bill trio — none of this data is ever persisted (see
 *  SplitClient.tsx), so this runs client-side at the Summary step and only
 *  the achievement UNLOCK itself gets written. */
export function checkSplitAchievements(
  items: Array<{ assignedTo: Record<string, number>; quantity: number }>,
  usedSplitEvenlyAnywhere: boolean,
  perPersonTotals: number[],
  payerCoverCount: number,
): string[] {
  const out: string[] = [];
  if (
    items.length >= 8 &&
    !usedSplitEvenlyAnywhere &&
    items.every((it) => Object.keys(it.assignedTo).length <= 1)
  )
    out.push("itemized_to_death");
  if (perPersonTotals.some((t) => t > 0 && Math.abs(t - Math.round(t)) < 0.001))
    out.push("exact_change");
  if (payerCoverCount >= 2) out.push("sugar_daddy_sugar_mama");
  return out;
}

/** Diff helper: which of the currently-true keys aren't recorded yet. */
export function pickNewlyUnlocked(
  currentlyTrue: Set<string> | string[],
  alreadyUnlockedKeys: Set<string>,
): string[] {
  const list = Array.isArray(currentlyTrue) ? currentlyTrue : [...currentlyTrue];
  return list.filter((k) => !alreadyUnlockedKeys.has(k));
}

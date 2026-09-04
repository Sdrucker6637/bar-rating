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
  /** One emoji shown in the badge's medallion — the one deliberate spot in
   *  the app that uses emoji: achievements are the house's fun/silly/naughty
   *  corner, distinct in tone from the monochrome line-icon language
   *  everywhere else (see Icon.tsx), and each badge needs to read apart
   *  from its neighbors at a glance, not just by name. */
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- Exploration ----
  { key: "bar_hopper", name: "Bar Hopper", desc: "Visit 10 bars.", category: "exploration" , icon: "👟" },
  { key: "bar_slut", name: "Bar Slut", desc: "Visit 25 bars.", category: "exploration" , icon: "🥾" },
  { key: "local_legend", name: "Local Legend", desc: "Visit 5 bars in the same neighborhood.", category: "exploration" , icon: "📍" },
  { key: "touch_grass", name: "Touch Grass", desc: "Visit bars in 10 different neighborhoods.", category: "exploration" , icon: "🌿" },
  { key: "gps_gremlin", name: "GPS Gremlin", desc: "Add or visit a bar found through Nearby.", category: "exploration" , icon: "📡" },
  { key: "fuck_around_find_out", name: "Fuck Around & Find Out", desc: "Use Surprise Us and actually go rate the bar it gave you.", category: "exploration" , icon: "🎲" },
  { key: "one_for_the_road", name: "One for the Road", desc: "Add a bar straight from a crawl stop.", category: "exploration" , icon: "🚪" },
  { key: "absolutely_no_reason", name: "Absolutely No Reason", desc: "Add a bar with no notes, tags, or description at all.", category: "exploration" , icon: "❓" },
  { key: "bar_ho", name: "Bar Ho", desc: "Visit 50 bars.", category: "exploration", icon: "🍸" },
  { key: "century_club", name: "Century Club", desc: "Visit 100 bars.", category: "exploration", icon: "💯" },
  { key: "neighborhood_menace", name: "Neighborhood Menace", desc: "Visit bars in 15 different neighborhoods.", category: "exploration", icon: "🗺️" },
  { key: "off_the_beaten_path", name: "Off the Beaten Path", desc: "Visit a bar more than a mile from every other bar you've visited.", category: "exploration", icon: "🧭" },

  // ---- Rating ----
  { key: "whore_for_the_score", name: "Whore for the Score", desc: "Fully rate 10 bars.", category: "rating" , icon: "💯" },
  { key: "professional_bar_enjoyer", name: "Professional Bar Enjoyer", desc: "Fully rate 25 bars.", category: "rating" , icon: "🎓" },
  { key: "golden_throne", name: "Golden Throne", desc: "Award a bar bonus points just for its bathroom.", category: "rating" , icon: "🚽" },
  { key: "the_connoisseur", name: "The Connoisseur", desc: "Give a bar the exact same score in every category.", category: "rating" , icon: "🧐" },
  { key: "harsh_critic", name: "Harsh Critic", desc: "Every category ≤4.", category: "rating" , icon: "😤" },
  { key: "generous_soul", name: "Generous Soul", desc: "Every category ≥9.", category: "rating" , icon: "😇" },
  { key: "red_flag", name: "Red Flag", desc: "One category ≤3, another ≥9, same bar.", category: "rating" , icon: "🚩" },
  { key: "money_talks", name: "Money Talks", desc: "Value is a bar's highest-rated category.", category: "rating" , icon: "💰" },
  { key: "food_critic", name: "Food Critic", desc: "Food ≥9 and Drinks ≤6.", category: "rating" , icon: "🍽️" },
  { key: "fuck_thats_good", name: "Fuck, That's Good", desc: "Overall score 9+.", category: "rating" , icon: "👍" },
  { key: "fuck_thats_bad", name: "Fuck, That's Bad", desc: "Overall score ≤4.", category: "rating" , icon: "👎" },
  { key: "good_head", name: "Good Head", desc: "Vibe score of 9+.", category: "rating" , icon: "🗣️" },
  { key: "we_need_to_talk", name: "We Need to Talk", desc: "Service score of 3 or below.", category: "rating" , icon: "💬" },
  { key: "go_big_or_go_home", name: "Go Big or Go Home", desc: "Visit a bar with 20+ capacity.", category: "rating" , icon: "🏟️" },
  { key: "tight_squeeze", name: "Tight Squeeze", desc: "Visit a bar with 5 or less capacity.", category: "rating" , icon: "🤏" },
  { key: "i_can_fix_her", name: "I Can Fix Her", desc: "A bar scores ≤5 overall but has one category at 8+.", category: "rating" , icon: "🔧" },
  { key: "hot_cold", name: "Hot & Cold", desc: "Give one bar both a 10 and a 1.", category: "rating", icon: "🥵" },
  { key: "nothing_to_see_here", name: "Nothing to See Here", desc: "Give a bar exactly 5 in every category.", category: "rating", icon: "😐" },
  { key: "five_star_general", name: "Five-Star General", desc: "Give a bar 10 in 3 or more categories.", category: "rating", icon: "🌟" },
  { key: "the_10_spot", name: "The 10 Spot", desc: "Give 10 different bars at least one 10.", category: "rating", icon: "🔟" },
  { key: "the_mid", name: "The Mid", desc: "Get an overall score of exactly 5.0.", category: "rating", icon: "😑" },
  { key: "no_standards", name: "No Standards", desc: "Give a bar 5 or below in every category.", category: "rating", icon: "📉" },

  // ---- Leaderboard & Bar Battle ----
  { key: "king_of_the_hill", name: "King of the Hill", desc: "Have a bar you've rated reach #1.", category: "battle" , icon: "🏆" },
  { key: "top_shelf", name: "Top Shelf", desc: "Have a bar you've rated reach the top 3.", category: "battle" , icon: "🥂" },
  { key: "peoples_champion", name: "The People's Champion", desc: "Win a Bar Battle that flips who's #1.", category: "battle" , icon: "🎖️" },
  { key: "cockfight", name: "Cockfight", desc: "Take part in your first Bar Battle.", category: "battle" , icon: "⚔️" },
  { key: "sword_fight", name: "Sword Fight", desc: "Take part in 5 Bar Battles total.", category: "battle" , icon: "🤺" },
  { key: "bottoms_up", name: "Bottoms Up", desc: "Pick the lower-ranked bar in a battle.", category: "battle" , icon: "🔻" },
  { key: "split_decision", name: "Split Decision", desc: "Win any tiebreaker vote.", category: "battle" , icon: "⚖️" },
  { key: "time_loop", name: "Time Loop", desc: "Cause a three-way tie where nobody actually wins.", category: "battle" , icon: "🌀" },
  { key: "cherry_picked", name: "Cherry Picked", desc: "Personally settle every vote in a multi-way tie in one go.", category: "battle" , icon: "🍒" },
  { key: "redemption_arc", name: "Back From the Dead", desc: "Reinstate a bar you'd disqualified.", category: "battle" , icon: "🔄" },
  { key: "the_underdog", name: "The Underdog", desc: "A bar outside the top 10 wins a Bar Battle.", category: "battle", icon: "🐕" },
  { key: "mortal_kombat", name: "Mortal Kombat", desc: "Have the same bar win 3 Bar Battles.", category: "battle", icon: "💀" },
  { key: "upstart", name: "Upstart", desc: "A newly added bar reaches the top 3.", category: "battle", icon: "🌱" },
  { key: "serial_killer", name: "Serial Killer", desc: "One bar beats 3 different opponents.", category: "battle", icon: "🔪" },

  // ---- Wishlist ----
  { key: "window_shopper", name: "Window Shopper", desc: "Add your first wishlist bar.", category: "wishlist" , icon: "👀" },
  { key: "i_have_a_type", name: "I Have a Type", desc: "Wishlist 5 bars in the same neighborhood.", category: "wishlist" , icon: "🏷️" },
  { key: "someday", name: "Someday", desc: "10+ bars sitting on the wishlist.", category: "wishlist" , icon: "📅" },
  { key: "wishlist_hoarder", name: "Wishlist Hoarder", desc: "20+ bars sitting on the wishlist.", category: "wishlist" , icon: "📦" },
  { key: "finally", name: "Finally", desc: "Visit your first wishlisted bar.", category: "wishlist" , icon: "✅" },
  { key: "dream_to_reality", name: "Dream → Reality", desc: "Visit 5 wishlisted bars.", category: "wishlist" , icon: "⭐" },
  { key: "speed_dating", name: "Speed Dating", desc: "Wishlist a bar and visit it within 24 hours.", category: "wishlist" , icon: "⏱️" },
  { key: "doesnt_fit_our_group", name: "Doesn't Fit Our Group", desc: "Get bounced by the capacity filter three times.", category: "wishlist" , icon: "🚷" },

  // ---- Crawl Planning ----
  { key: "third_base", name: "Third Base", desc: "Plan a 3-stop crawl.", category: "crawl" , icon: "3️⃣" },
  { key: "no_survivors", name: "No Survivors", desc: "Plan the full 8-stop crawl.", category: "crawl" , icon: "💀" },
  { key: "no_plan_just_vibes", name: "No Plan, Just Vibes", desc: "Start a crawl with no starting bar picked.", category: "crawl" , icon: "🧭" },
  { key: "sole_survivor", name: "Sole Survivor", desc: "A whole crawl where every walk stays short.", category: "crawl" , icon: "🚶" },
  { key: "quickie", name: "Quickie", desc: "Two crawl stops just a couple minutes apart.", category: "crawl" , icon: "⚡" },
  { key: "menace_to_sobriety", name: "Menace to Sobriety", desc: "Bathroom bonuses at 3 different bars in one crawl.", category: "crawl" , icon: "🐐" },
  { key: "walk_of_shame", name: "Walk of Shame", desc: "The last leg of a crawl turns into a real hike.", category: "crawl" , icon: "🔥" },
  { key: "commitment_issues", name: "Commitment Issues", desc: "Swap the same crawl stop three-plus times.", category: "crawl" , icon: "🔁" },
  { key: "the_warm_up", name: "The Warm-Up", desc: "Complete a 2-stop crawl.", category: "crawl", icon: "🥃" },
  { key: "full_send", name: "Full Send", desc: "Complete the full 8-stop crawl without changing any stops.", category: "crawl", icon: "🚀" },
  { key: "scenic_route", name: "Scenic Route", desc: "Complete a crawl involving 2+ miles of walking.", category: "crawl", icon: "🏞️" },
  { key: "marathon", name: "Marathon", desc: "Complete a crawl involving 5+ miles of walking.", category: "crawl", icon: "🏃" },
  { key: "domino_effect", name: "Domino Effect", desc: "Change crawl stops 3 or more times.", category: "crawl", icon: "🁣" },

  // ---- Split the Bill ----
  { key: "itemized_to_death", name: "Itemized to Death", desc: "Hand-assign every item instead of splitting evenly.", category: "split" , icon: "🧾" },
  { key: "exact_change", name: "Exact Change", desc: "Someone's share lands on a round dollar amount.", category: "split" , icon: "🎯" },
  { key: "sugar_daddy_sugar_mama", name: "Sugar Daddy / Sugar Mama", desc: "Cover the whole group's bill at 2+ places in one night.", category: "split" , icon: "💸" },
  { key: "math_is_hard", name: "Math Is Hard", desc: "Split a bill among 5 or more people.", category: "split", icon: "🧮" },
  { key: "dead_even", name: "Dead Even", desc: "Everyone's share comes out exactly equal.", category: "split", icon: "⚖️" },
  { key: "whos_paying", name: "Who's Paying?", desc: "One person covers the entire bill.", category: "split", icon: "🙋" },
  { key: "generous_to_a_fault", name: "Generous to a Fault", desc: "One person pays more than 75% of the bill.", category: "split", icon: "🎁" },
];

export const ACHIEVEMENTS_BY_KEY: Map<string, AchievementDef> = new Map(
  ACHIEVEMENTS.map((a) => [a.key, a]),
);

const RATING_KEYS = ["vibe", "value", "service", "food", "drinks"] as const;

// Disqualified bars have no valid score anywhere else in the app (the
// leaderboard shows "N/A", avgWithFood/avgWithoutFood both return null) —
// every achievement below that reads a rating has to honor that too, or a
// disqualified bar can earn a per-category badge (e.g. Generous Soul) that
// its own overall-score sibling (Fuck, That's Good) correctly refuses,
// which reads as a bug even though each check is "right" in isolation.
function ratingValues(b: Bar): number[] {
  if (b.disqualified) return [];
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

const MILE_METERS = 1609.344;

/** Off the Beaten Path: some visited bar with coordinates sits more than a
 *  mile from every OTHER visited bar with coordinates. Reuses
 *  haversineMeters (scoring.ts) rather than a second distance
 *  implementation. Bars without coordinates are simply excluded from both
 *  sides of the comparison — there's no honest distance to compute for
 *  them, and treating "unknown" as "far away" would be a fabricated signal. */
function isOffTheBeatenPath(visited: Bar[]): boolean {
  const located = visited.filter(
    (b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude),
  );
  if (located.length < 2) return false;
  return located.some((a) =>
    located
      .filter((b) => b.id !== a.id)
      .every(
        (b) =>
          haversineMeters(
            a.latitude as number,
            a.longitude as number,
            b.latitude as number,
            b.longitude as number,
          ) > MILE_METERS,
      ),
  );
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

// "Newly added" for Upstart — no explicit threshold was specified, so this
// picks a documented, reasonable window rather than inventing an undefined
// concept. Adjustable if the house wants a different cutoff.
const UPSTART_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Battle-derived checks: which of king_of_the_hill / top_shelf /
 *  peoples_champion / bottoms_up / time_loop / the_underdog / mortal_kombat
 *  / upstart / serial_killer are true right now, given the current bars and
 *  every recorded battle. Reuses rankEntries (the same function the real
 *  leaderboard renders with) so "who's #1" and "top 3/10" here always match
 *  the UI. All of these read CURRENT state (current scores + every battle
 *  ever recorded) rather than a point-in-time historical ranking — the app
 *  doesn't persist "what the ranking looked like at battle time," and this
 *  is the same limitation peoples_champion/bottoms_up already accepted. */
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

  if (scored.length > 0) out.add("king_of_the_hill");
  // "Reach the top 3" is automatically true for whichever bars occupy
  // positions 1-3 the moment there are at least 3 ranked bars to place —
  // there's no meaningfully different way to tie this to leaderboard
  // position without inventing a per-bar "reached top 3" history field.
  if (scored.length >= 3) out.add("top_shelf");

  const rankedFull = rankEntries(scored, battles);

  // Upstart: a bar added recently (see UPSTART_WINDOW_MS) currently sitting
  // in the top 3.
  const now = Date.now();
  if (
    rankedFull
      .slice(0, 3)
      .some((b) => b.createdAt && now - b.createdAt <= UPSTART_WINDOW_MS)
  ) {
    out.add("upstart");
  }

  // Mortal Kombat / Serial Killer: tally wins per bar. Battles dedupe to one
  // record per unordered pair (recording a new one replaces the old), so a
  // bar can never hold two simultaneous battle records against the same
  // opponent — "3 total wins" and "3 distinct opponents beaten" are
  // therefore the same count under this data model, and these two
  // achievements will always unlock together.
  const winCounts = new Map<string, number>();
  battles.forEach((btl) => {
    if (![btl.bar1Id, btl.bar2Id].includes(btl.winnerId)) return;
    winCounts.set(btl.winnerId, (winCounts.get(btl.winnerId) || 0) + 1);
  });
  if ([...winCounts.values()].some((n) => n >= 3)) {
    out.add("mortal_kombat");
    out.add("serial_killer");
  }

  // The Underdog: the winner of some battle currently sits outside the
  // top 10 of the full leaderboard.
  const outsideTop10 = new Set(rankedFull.slice(10).map((b) => b.id));
  if (battles.some((btl) => outsideTop10.has(btl.winnerId))) {
    out.add("the_underdog");
  }

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
    const topWithout = rankWithout[0]?.id ?? null;
    const topWith = rankedFull[0]?.id ?? null;
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
  if (visited.length >= 50) out.add("bar_ho");
  if (visited.length >= 100) out.add("century_club");
  if (visitedHoods.size >= 15) out.add("neighborhood_menace");
  if (isOffTheBeatenPath(visited)) out.add("off_the_beaten_path");

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
    if (
      !b.disqualified &&
      b.food !== null &&
      b.food >= 9 &&
      b.drinks !== null &&
      b.drinks <= 6
    )
      out.add("food_critic");
    const overall = overallScore(b);
    if (overall !== null && overall >= 9) out.add("fuck_thats_good");
    if (overall !== null && overall <= 4) out.add("fuck_thats_bad");
    if (!b.disqualified && b.vibe !== null && b.vibe >= 9) out.add("good_head");
    if (!b.disqualified && b.service !== null && b.service <= 3)
      out.add("we_need_to_talk");
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
    if (vals.includes(1) && vals.includes(10)) out.add("hot_cold");
    if (vals.length === 5 && vals.every((v) => v === 5)) out.add("nothing_to_see_here");
    if (vals.filter((v) => v === 10).length >= 3) out.add("five_star_general");
    if (vals.length === 5 && vals.every((v) => v <= 5)) out.add("no_standards");
    // Float-safe: overall is an average of 0.5-step ratings, so an exact 5
    // can land a hair off 5 in floating point.
    if (overall !== null && Math.abs(overall - 5) < 1e-9) out.add("the_mid");
  }
  if (bars.filter((b) => ratingValues(b).includes(10)).length >= 10)
    out.add("the_10_spot");

  // ---- Leaderboard & Bar Battle ----
  checkBattleDerivedKeys(bars, battles).forEach((k) => out.add(k));
  if (battles.length >= 1) {
    out.add("cockfight");
    out.add("split_decision");
  }
  if (battles.length >= 5) out.add("sword_fight");
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

/** Speed Dating — "wishlist a bar and visit it within 24 hours." Checked at
 *  the exact moment a wishlisted bar is marked visited, against the PRE-
 *  transition record (status still "to-try", createdAt still the original
 *  wishlist-add time — see the two call sites in tour-context.tsx for why
 *  that's the reliable timestamp here, not a new "visitedAt" field: the app
 *  has no such field, and this checks "has less than 24h elapsed since
 *  creation" at the moment of the transition itself, which is equivalent to
 *  and doesn't require one). Legacy bars with no createdAt never match —
 *  there's no honest answer for when they were really added. */
export function isSpeedDating(barBeforeVisit: Bar): boolean {
  if (barBeforeVisit.status !== "to-try" || !barBeforeVisit.createdAt) return false;
  return Date.now() - barBeforeVisit.createdAt < 24 * 60 * 60 * 1000;
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

/** Everything derivable from one finished crawl plan: length-based badges,
 *  the "every walk stayed short" / "one walk was very short" pair, and total
 *  walking distance. Call once right after a plan finishes. */
export function checkCrawlPlanAchievements(stops: CrawlStopLike[]): string[] {
  const out: string[] = [];
  if (stops.length >= 2) out.push("the_warm_up");
  if (stops.length >= 3) out.push("third_base");
  if (stops.length >= 8) out.push("no_survivors");
  if (stops.length < 2) return out;
  const walkMinutes: number[] = [];
  let totalMeters = 0;
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
    const meters = haversineMeters(
      a.latitude as number,
      a.longitude as number,
      b.latitude as number,
      b.longitude as number,
    );
    totalMeters += meters;
    walkMinutes.push(estimateWalkMinutes(meters));
  }
  if (walkMinutes.length > 0 && walkMinutes.every((m) => m <= 8)) out.push("sole_survivor");
  if (walkMinutes.some((m) => m <= 2)) out.push("quickie");
  if (walkMinutes.some((m) => m >= 15)) out.push("walk_of_shame");
  const totalMiles = totalMeters / MILE_METERS;
  if (totalMiles >= 2) out.push("scenic_route");
  if (totalMiles >= 5) out.push("marathon");
  return out;
}

/** Full Send: the crawl that was just finished had all 8 stops AND nothing
 *  has been swapped since. The app has no explicit "crawl completed" event
 *  (the modal is simply closed, discarding all crawl state) — closing the
 *  modal after a full, unmodified 8-stop plan is the closest available
 *  proxy for "went through with it" and is checked at that point, not at
 *  plan-generation time (where replaces are always 0 by definition and this
 *  would be indistinguishable from no_survivors). */
export function checkFullSend(stopCount: number, totalReplaces: number): boolean {
  return stopCount >= 8 && totalReplaces === 0;
}

/** Domino Effect: 3+ replace actions across the WHOLE crawl (any slots),
 *  distinct from Commitment Issues (the SAME slot swapped 3+ times). */
export function checkDominoEffect(totalReplaces: number): boolean {
  return totalReplaces >= 3;
}

/** Split-the-bill set — none of this data is ever persisted (see
 *  SplitClient.tsx), so this runs client-side at the Summary step and only
 *  the achievement UNLOCK itself gets written.
 *
 *  Dollar comparisons use cents (round to the nearest cent, compare
 *  integers) rather than raw float equality — every total here already
 *  comes from splitMath.ts's cents-exact distributeCents, so this just
 *  avoids re-introducing float error at the comparison step. */
export function checkSplitAchievements(
  items: Array<{ assignedTo: Record<string, number>; quantity: number }>,
  usedSplitEvenlyAnywhere: boolean,
  perPersonTotals: number[],
  payerCoverCount: number,
  placeCrewSizes: number[],
  allPlacesSamePayer: boolean,
): string[] {
  const out: string[] = [];
  if (
    items.length >= 8 &&
    !usedSplitEvenlyAnywhere &&
    items.every((it) => Object.keys(it.assignedTo).length <= 1)
  )
    out.push("itemized_to_death");
  const cents = perPersonTotals.map((t) => Math.round(t * 100));
  if (cents.some((c) => c > 0 && c % 100 === 0)) out.push("exact_change");
  if (payerCoverCount >= 2) out.push("sugar_daddy_sugar_mama");

  if (placeCrewSizes.some((n) => n >= 5)) out.push("math_is_hard");
  if (allPlacesSamePayer) out.push("whos_paying");

  const payingCents = cents.filter((c) => c > 0);
  if (payingCents.length >= 2) {
    const first = payingCents[0];
    if (payingCents.every((c) => c === first)) out.push("dead_even");
    const totalCents = payingCents.reduce((a, c) => a + c, 0);
    if (totalCents > 0 && payingCents.some((c) => c > totalCents * 0.75))
      out.push("generous_to_a_fault");
  }
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

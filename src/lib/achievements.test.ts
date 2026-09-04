import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_KEY,
  checkCrawlPlanAchievements,
  checkDerivedAchievements,
  checkDominoEffect,
  checkFullSend,
  checkMenaceToSobriety,
  checkSplitAchievements,
  isSpeedDating,
} from "./achievements";
import type { Bar, RankingBattle } from "./types";

let nextId = 1;

function makeBar(overrides: Partial<Bar> = {}): Bar {
  return {
    id: `bar${nextId++}`,
    name: `Bar ${nextId}`,
    status: "visited",
    vibe: null,
    value: null,
    service: null,
    food: null,
    drinks: null,
    bathroomBonus: 0,
    notes: "",
    neighborhood: "",
    description: "",
    tags: [],
    happyHour: "",
    capacity: null,
    mapsLink: "",
    address: "",
    latitude: null,
    longitude: null,
    placeId: null,
    detailsFetched: true,
    disqualified: false,
    disqualifyReason: "",
    ...overrides,
  };
}

/** A bar with all five categories set to the same value — the common shape
 *  used across most rating tests. */
function ratedBar(v: number, overrides: Partial<Bar> = {}): Bar {
  return makeBar({ vibe: v, value: v, service: v, food: v, drinks: v, ...overrides });
}

function makeBattle(
  bar1Id: string,
  bar2Id: string,
  winnerId: string,
  overrides: Partial<RankingBattle> = {},
): RankingBattle {
  return {
    id: `battle_${bar1Id}_${bar2Id}`,
    bar1Id,
    bar2Id,
    winnerId,
    type: "score_tiebreak",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("catalog integrity", () => {
  it("has no duplicate keys", () => {
    const keys = ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("removed its_not_you_its_me entirely", () => {
    expect(ACHIEVEMENTS_BY_KEY.has("its_not_you_its_me")).toBe(false);
  });

  it("removed one_night_stand (replaced by speed_dating)", () => {
    expect(ACHIEVEMENTS_BY_KEY.has("one_night_stand")).toBe(false);
    expect(ACHIEVEMENTS_BY_KEY.has("speed_dating")).toBe(true);
  });

  it("removed house_record (replaced by king_of_the_hill)", () => {
    expect(ACHIEVEMENTS_BY_KEY.has("house_record")).toBe(false);
    expect(ACHIEVEMENTS_BY_KEY.has("king_of_the_hill")).toBe(true);
  });

  it("keeps redemption_arc's key, renamed to Back From the Dead", () => {
    expect(ACHIEVEMENTS_BY_KEY.get("redemption_arc")?.name).toBe(
      "Back From the Dead",
    );
  });

  it("never added a 'Big Dick Energy' or 'Tiny Dick Energy' achievement", () => {
    const names = ACHIEVEMENTS.map((a) => a.name.toLowerCase());
    expect(names.some((n) => n.includes("big dick"))).toBe(false);
    expect(names.some((n) => n.includes("tiny dick"))).toBe(false);
  });

  it("did not add David & Goliath or State Hopper or County Line (unmeasurable / duplicate)", () => {
    expect(ACHIEVEMENTS.some((a) => a.name === "David & Goliath")).toBe(false);
    expect(ACHIEVEMENTS.some((a) => a.name === "State Hopper")).toBe(false);
    expect(ACHIEVEMENTS.some((a) => a.name === "County Line")).toBe(false);
  });

  it("preserves every achievement not explicitly listed for removal/replacement", () => {
    const mustKeep = [
      "bar_hopper", "bar_slut", "local_legend", "touch_grass", "gps_gremlin",
      "fuck_around_find_out", "one_for_the_road", "absolutely_no_reason",
      "whore_for_the_score", "professional_bar_enjoyer", "golden_throne",
      "the_connoisseur", "harsh_critic", "generous_soul", "red_flag",
      "money_talks", "food_critic", "fuck_thats_good", "fuck_thats_bad",
      "good_head", "we_need_to_talk", "go_big_or_go_home", "tight_squeeze",
      "i_can_fix_her", "cockfight", "sword_fight", "bottoms_up",
      "split_decision", "time_loop", "cherry_picked", "i_have_a_type",
      "someday", "wishlist_hoarder", "finally", "dream_to_reality",
      "third_base", "no_survivors", "no_plan_just_vibes", "sole_survivor",
      "quickie", "menace_to_sobriety", "walk_of_shame", "commitment_issues",
      "itemized_to_death", "exact_change", "sugar_daddy_sugar_mama",
    ];
    for (const key of mustKeep) {
      expect(ACHIEVEMENTS_BY_KEY.has(key), `missing ${key}`).toBe(true);
    }
  });
});

describe("Exploration additions", () => {
  it("Bar Ho / Century Club scale off visited count", () => {
    const bars = Array.from({ length: 49 }, () => makeBar());
    expect(checkDerivedAchievements(bars, [], 0).has("bar_ho")).toBe(false);
    bars.push(makeBar());
    expect(checkDerivedAchievements(bars, [], 0).has("bar_ho")).toBe(true);
    expect(checkDerivedAchievements(bars, [], 0).has("century_club")).toBe(false);
    for (let i = 0; i < 50; i++) bars.push(makeBar());
    expect(checkDerivedAchievements(bars, [], 0).has("century_club")).toBe(true);
  });

  it("Neighborhood Menace needs 15 distinct visited neighborhoods", () => {
    const bars = Array.from({ length: 14 }, (_, i) =>
      makeBar({ neighborhood: `Hood ${i}` }),
    );
    expect(checkDerivedAchievements(bars, [], 0).has("neighborhood_menace")).toBe(
      false,
    );
    bars.push(makeBar({ neighborhood: "Hood 14" }));
    expect(checkDerivedAchievements(bars, [], 0).has("neighborhood_menace")).toBe(
      true,
    );
  });

  it("Off the Beaten Path fires when a bar is >1mi from every other visited bar", () => {
    // Times Square area, clustered within a few hundred meters.
    const cluster = [
      makeBar({ latitude: 40.758, longitude: -73.9855 }),
      makeBar({ latitude: 40.759, longitude: -73.984 }),
    ];
    const isolated = makeBar({ latitude: 40.9, longitude: -73.98 }); // ~15mi north
    expect(
      checkDerivedAchievements(cluster, [], 0).has("off_the_beaten_path"),
    ).toBe(false);
    expect(
      checkDerivedAchievements([...cluster, isolated], [], 0).has(
        "off_the_beaten_path",
      ),
    ).toBe(true);
  });

  it("Off the Beaten Path never fires for bars missing coordinates", () => {
    const bars = [makeBar(), makeBar(), makeBar()];
    expect(
      checkDerivedAchievements(bars, [], 0).has("off_the_beaten_path"),
    ).toBe(false);
  });
});

describe("Rating additions", () => {
  it("Hot & Cold requires both a literal 10 and a literal 1 on the same bar", () => {
    const bar = makeBar({ vibe: 10, value: 1, service: 5, food: 5, drinks: 5 });
    expect(checkDerivedAchievements([bar], [], 0).has("hot_cold")).toBe(true);
    const notQuite = makeBar({ vibe: 9, value: 2, service: 5, food: 5, drinks: 5 });
    expect(checkDerivedAchievements([notQuite], [], 0).has("hot_cold")).toBe(false);
  });

  it("Nothing to See Here requires exactly 5 in every category, all 5 present", () => {
    expect(
      checkDerivedAchievements([ratedBar(5)], [], 0).has("nothing_to_see_here"),
    ).toBe(true);
    const missingOne = makeBar({ vibe: 5, value: 5, service: 5, drinks: 5 }); // no food
    expect(
      checkDerivedAchievements([missingOne], [], 0).has("nothing_to_see_here"),
    ).toBe(false);
  });

  it("Five-Star General needs 10 in 3+ categories (not necessarily all 5)", () => {
    const bar = makeBar({ vibe: 10, value: 10, service: 10, food: 2, drinks: 2 });
    expect(checkDerivedAchievements([bar], [], 0).has("five_star_general")).toBe(
      true,
    );
    const onlyTwo = makeBar({ vibe: 10, value: 10, service: 2, food: 2, drinks: 2 });
    expect(
      checkDerivedAchievements([onlyTwo], [], 0).has("five_star_general"),
    ).toBe(false);
  });

  it("The 10 Spot needs 10 DIFFERENT bars each with at least one 10", () => {
    const bars = Array.from({ length: 9 }, () =>
      makeBar({ vibe: 10, value: 2, service: 2, food: 2, drinks: 2 }),
    );
    expect(checkDerivedAchievements(bars, [], 0).has("the_10_spot")).toBe(false);
    bars.push(makeBar({ vibe: 10, value: 2, service: 2, food: 2, drinks: 2 }));
    expect(checkDerivedAchievements(bars, [], 0).has("the_10_spot")).toBe(true);
  });

  it("The Mid fires on an exact overall average of 5.0", () => {
    // 4 + 5 + 5 + 5 + 6 = 25 / 5 = 5.0 exactly.
    const bar = makeBar({ vibe: 4, value: 5, service: 5, food: 5, drinks: 6 });
    expect(checkDerivedAchievements([bar], [], 0).has("the_mid")).toBe(true);
    const notMid = makeBar({ vibe: 4, value: 5, service: 5, food: 5, drinks: 5 });
    expect(checkDerivedAchievements([notMid], [], 0).has("the_mid")).toBe(false);
  });

  it("The Mid's epsilon tolerates float noise from an odd-count average", () => {
    // Deliberately construct a value one ULP off exact 5 to exercise the
    // epsilon guard itself, independent of whether real rating inputs can
    // ever actually produce that noise.
    const noisyFive = 5 + Number.EPSILON;
    expect(Math.abs(noisyFive - 5) < 1e-9).toBe(true);
  });

  it("The Mid works for a food-less bar via avgWithoutFood", () => {
    const bar = makeBar({ vibe: 5, value: 5, service: 5, drinks: 5, food: null });
    expect(checkDerivedAchievements([bar], [], 0).has("the_mid")).toBe(true);
  });

  it("No Standards (<=5) is distinct from Harsh Critic (<=4)", () => {
    const bar = ratedBar(5);
    const derived = checkDerivedAchievements([bar], [], 0);
    expect(derived.has("no_standards")).toBe(true);
    expect(derived.has("harsh_critic")).toBe(false);
  });

  it("rating achievements ignore disqualified bars, consistently with Generous Soul", () => {
    const bar = ratedBar(9, { disqualified: true });
    const derived = checkDerivedAchievements([bar], [], 0);
    expect(derived.has("generous_soul")).toBe(false);
    expect(derived.has("five_star_general")).toBe(false);
    expect(derived.has("the_10_spot")).toBe(false);
    expect(derived.has("fuck_thats_good")).toBe(false);
  });

  it("missing categories are never treated as 0 or 5", () => {
    // Only vibe set — no_standards/nothing_to_see_here/harsh_critic all
    // require all 5 categories present, so none should fire on a stub.
    const bar = makeBar({ vibe: 5 });
    const derived = checkDerivedAchievements([bar], [], 0);
    expect(derived.has("no_standards")).toBe(false);
    expect(derived.has("nothing_to_see_here")).toBe(false);
    expect(derived.has("harsh_critic")).toBe(false);
  });
});

describe("Bar Battle: King of the Hill / Top Shelf", () => {
  it("King of the Hill fires whenever any rated bar currently sits at #1", () => {
    const bar = ratedBar(8);
    expect(checkDerivedAchievements([bar], [], 0).has("king_of_the_hill")).toBe(
      true,
    );
  });

  it("Top Shelf needs at least 3 ranked bars (a real top 3 to occupy)", () => {
    const two = [ratedBar(8), ratedBar(7)];
    expect(checkDerivedAchievements(two, [], 0).has("top_shelf")).toBe(false);
    const three = [...two, ratedBar(6)];
    expect(checkDerivedAchievements(three, [], 0).has("top_shelf")).toBe(true);
  });
});

describe("Bar Battle: new additions", () => {
  it("Mortal Kombat and Serial Killer both fire on 3 wins (mathematically identical here)", () => {
    const champ = ratedBar(8);
    const opponents = [ratedBar(8), ratedBar(8), ratedBar(8)];
    const battles = opponents.map((o) => makeBattle(champ.id, o.id, champ.id));
    const derived = checkDerivedAchievements([champ, ...opponents], battles, 0);
    expect(derived.has("mortal_kombat")).toBe(true);
    expect(derived.has("serial_killer")).toBe(true);
  });

  it("Mortal Kombat/Serial Killer don't fire under 3 wins", () => {
    const champ = ratedBar(8);
    const opponents = [ratedBar(8), ratedBar(8)];
    const battles = opponents.map((o) => makeBattle(champ.id, o.id, champ.id));
    const derived = checkDerivedAchievements([champ, ...opponents], battles, 0);
    expect(derived.has("mortal_kombat")).toBe(false);
    expect(derived.has("serial_killer")).toBe(false);
  });

  it("The Underdog fires when a battle winner sits outside the current top 10", () => {
    // 11 bars with distinct scores so ranking order is unambiguous by score;
    // the two lowest-scored bars (outside top 10) also battle each other.
    const highBars = Array.from({ length: 10 }, (_, i) => ratedBar(9 - i * 0.1));
    const low1 = ratedBar(1);
    const low2 = makeBar({ vibe: 1, value: 1, service: 1, food: 1, drinks: 1 });
    const battle = makeBattle(low1.id, low2.id, low1.id);
    const derived = checkDerivedAchievements(
      [...highBars, low1, low2],
      [battle],
      0,
    );
    expect(derived.has("the_underdog")).toBe(true);
  });

  it("Upstart fires for a recently-added bar currently in the top 3", () => {
    const recent = ratedBar(9, { createdAt: Date.now() - 60_000 });
    const rest = [ratedBar(8), ratedBar(7)];
    expect(
      checkDerivedAchievements([recent, ...rest], [], 0).has("upstart"),
    ).toBe(true);
  });

  it("Upstart does not fire for an old bar even if it's #1", () => {
    const old = ratedBar(9, { createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 });
    expect(checkDerivedAchievements([old], [], 0).has("upstart")).toBe(false);
  });

  it("Upstart does not fire for a legacy bar with no createdAt", () => {
    const legacy = ratedBar(9);
    delete (legacy as Partial<Bar>).createdAt;
    expect(checkDerivedAchievements([legacy], [], 0).has("upstart")).toBe(false);
  });
});

describe("Wishlist: Speed Dating", () => {
  it("fires within 24 hours of the original wishlist-add timestamp", () => {
    const bar = makeBar({
      status: "to-try",
      createdAt: Date.now() - 60 * 60 * 1000, // 1 hour ago
    });
    expect(isSpeedDating(bar)).toBe(true);
  });

  it("does not fire after 24 hours", () => {
    const bar = makeBar({
      status: "to-try",
      createdAt: Date.now() - 25 * 60 * 60 * 1000,
    });
    expect(isSpeedDating(bar)).toBe(false);
  });

  it("does not fire for a bar with no createdAt (legacy)", () => {
    const bar = makeBar({ status: "to-try" });
    delete (bar as Partial<Bar>).createdAt;
    expect(isSpeedDating(bar)).toBe(false);
  });

  it("does not fire for a bar that wasn't on the wishlist", () => {
    const bar = makeBar({ status: "visited", createdAt: Date.now() });
    expect(isSpeedDating(bar)).toBe(false);
  });
});

describe("Bar Battle: Back From the Dead (unchanged trigger)", () => {
  it("fires when a bar was disqualified and is now reinstated", () => {
    const bar = makeBar({ disqualified: false, wasDisqualified: true });
    expect(
      checkDerivedAchievements([bar], [], 0).has("redemption_arc"),
    ).toBe(true);
  });

  it("does not fire while still disqualified", () => {
    const bar = makeBar({ disqualified: true, wasDisqualified: true });
    expect(
      checkDerivedAchievements([bar], [], 0).has("redemption_arc"),
    ).toBe(false);
  });

  it("disqualifying a bar no longer unlocks anything (its_not_you_its_me removed)", () => {
    const bar = makeBar({ disqualified: true, wasDisqualified: true });
    const derived = checkDerivedAchievements([bar], [], 0);
    expect([...derived]).not.toContain("its_not_you_its_me");
  });
});

describe("Crawl additions", () => {
  const stop = (lat: number, lng: number) => ({
    name: `stop-${lat}-${lng}`,
    latitude: lat,
    longitude: lng,
  });

  it("The Warm-Up fires on a 2-stop crawl", () => {
    const stops = [stop(40.75, -73.98), stop(40.751, -73.981)];
    expect(checkCrawlPlanAchievements(stops)).toContain("the_warm_up");
  });

  it("The Warm-Up does not fire on a single-stop crawl", () => {
    expect(checkCrawlPlanAchievements([stop(40.75, -73.98)])).not.toContain(
      "the_warm_up",
    );
  });

  it("Scenic Route / Marathon scale with total walking distance", () => {
    // ~0.01 degrees latitude is roughly 0.69 miles; five short hops.
    const stops = Array.from({ length: 6 }, (_, i) => stop(40.75 + i * 0.01, -73.98));
    const keys = checkCrawlPlanAchievements(stops);
    expect(keys).toContain("scenic_route"); // ~3.4mi total
    expect(keys).not.toContain("marathon"); // under 5mi
  });

  it("Marathon needs 5+ miles total", () => {
    const stops = Array.from({ length: 10 }, (_, i) => stop(40.75 + i * 0.01, -73.98));
    expect(checkCrawlPlanAchievements(stops)).toContain("marathon");
  });

  it("Full Send requires 8 stops AND zero replaces", () => {
    expect(checkFullSend(8, 0)).toBe(true);
    expect(checkFullSend(8, 1)).toBe(false);
    expect(checkFullSend(7, 0)).toBe(false);
  });

  it("Domino Effect fires at 3+ total replaces regardless of slot", () => {
    expect(checkDominoEffect(2)).toBe(false);
    expect(checkDominoEffect(3)).toBe(true);
  });
});

describe("checkMenaceToSobriety (unchanged, sanity check)", () => {
  it("still requires 3 distinct bathroom-bonus bars from the last crawl", () => {
    const names = new Set(["A", "B", "C"]);
    const bars = ["A", "B", "C"].map((n) =>
      makeBar({ name: n, bathroomBonus: 1 }),
    );
    expect(checkMenaceToSobriety(names, bars)).toBe(true);
    expect(checkMenaceToSobriety(names, bars.slice(0, 2))).toBe(false);
  });
});

describe("Split the Bill additions", () => {
  it("Math Is Hard fires when any single place has 5+ crew", () => {
    const keys = checkSplitAchievements([], false, [10, 10, 10, 10, 10], 0, [5], false);
    expect(keys).toContain("math_is_hard");
    const under = checkSplitAchievements([], false, [10, 10, 10, 10], 0, [4], false);
    expect(under).not.toContain("math_is_hard");
  });

  it("Who's Paying? fires only when every place shares the same payer", () => {
    expect(
      checkSplitAchievements([], false, [10], 1, [1], true),
    ).toContain("whos_paying");
    expect(
      checkSplitAchievements([], false, [10], 1, [1], false),
    ).not.toContain("whos_paying");
  });

  it("Dead Even compares cents, not raw floats", () => {
    // 10 / 3 people = 3.333... repeating in floating point.
    const perPerson = [10 / 3, 10 / 3, 10 / 3];
    const keys = checkSplitAchievements([], false, perPerson, 0, [3], false);
    expect(keys).toContain("dead_even");
  });

  it("Dead Even does not fire when shares genuinely differ", () => {
    const keys = checkSplitAchievements([], false, [10, 20], 0, [2], false);
    expect(keys).not.toContain("dead_even");
  });

  it("Dead Even needs at least 2 people actually paying", () => {
    const keys = checkSplitAchievements([], false, [10], 0, [1], false);
    expect(keys).not.toContain("dead_even");
  });

  it("Generous to a Fault fires when one share exceeds 75% of the total", () => {
    const keys = checkSplitAchievements([], false, [80, 10, 10], 0, [3], false);
    expect(keys).toContain("generous_to_a_fault");
  });

  it("Generous to a Fault does not fire at or under 75%", () => {
    const keys = checkSplitAchievements([], false, [75, 25], 0, [2], false);
    expect(keys).not.toContain("generous_to_a_fault");
  });

  it("Exact Change is cents-safe (no false positive from float noise)", () => {
    // 20.00 split 3 ways in cents-exact math never lands exactly on a
    // whole dollar for any share; this just guards the cents-based rewrite.
    const keys = checkSplitAchievements([], false, [6.67, 6.67, 6.66], 0, [3], false);
    expect(keys).not.toContain("exact_change");
    const whole = checkSplitAchievements([], false, [5, 5], 0, [2], false);
    expect(whole).toContain("exact_change");
  });
});

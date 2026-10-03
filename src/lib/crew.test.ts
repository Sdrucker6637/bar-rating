import { describe, expect, it } from "vitest";
import {
  APP_PICKER_KEY,
  crewStandings,
  knownPickers,
  matchKnownPicker,
  pickerOf,
} from "./crew";
import { ACHIEVEMENTS_BY_KEY, checkCrewAchievements } from "./achievements";
import type { Bar } from "./types";

let nextId = 1;

function bar(score: number | null, overrides: Partial<Bar> = {}): Bar {
  const id = `bar${nextId++}`;
  return {
    id,
    name: `Bar ${id}`,
    status: "visited",
    vibe: score,
    value: score,
    service: score,
    food: score,
    drinks: score,
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

describe("picker identity", () => {
  it("treats the same name in any case/spacing as one person", () => {
    const bars = [
      bar(8, { addedBy: "Spencer" }),
      bar(6, { addedBy: "spencer" }),
      bar(7, { addedBy: "  Spencer " }),
    ];
    const crew = crewStandings(bars, []);
    expect(crew).toHaveLength(1);
    expect(crew[0].name).toBe("Spencer");
    expect(crew[0].picks).toHaveLength(3);
    expect(crew[0].average).toBeCloseTo(7);
  });

  it("collapses inner whitespace too", () => {
    expect(pickerOf(bar(5, { addedBy: "Mary   Kate" }))?.key).toBe(
      pickerOf(bar(5, { addedBy: "mary kate" }))?.key,
    );
  });

  it("credits the app when appPicked, ignoring any typed name", () => {
    const p = pickerOf(bar(5, { appPicked: true, addedBy: "Spencer" }));
    expect(p?.isApp).toBe(true);
    expect(p?.key).toBe(APP_PICKER_KEY);
  });

  it("returns null when nobody is credited", () => {
    expect(pickerOf(bar(5))).toBeNull();
    expect(pickerOf(bar(5, { addedBy: "   " }))).toBeNull();
  });

  it("suggests known names most-picked first, and matches typed variants", () => {
    const bars = [
      bar(5, { addedBy: "Alex" }),
      bar(5, { addedBy: "Spencer" }),
      bar(5, { addedBy: "spencer" }),
      bar(5, { appPicked: true }),
    ];
    expect(knownPickers(bars)).toEqual(["Spencer", "Alex"]);
    expect(matchKnownPicker(bars, "SPENCER ")).toBe("Spencer");
    expect(matchKnownPicker(bars, "Jordan")).toBeNull();
  });
});

describe("crewStandings", () => {
  it("ranks by average pick score and puts unscored pickers last", () => {
    const bars = [
      bar(9, { addedBy: "A" }),
      bar(5, { addedBy: "B" }),
      bar(7, { appPicked: true }),
      bar(null, { addedBy: "C" }),
    ];
    const crew = crewStandings(bars, []);
    expect(crew.map((e) => e.name)).toEqual(["A", "The App", "B", "C"]);
    expect(crew[0].holdsLead).toBe(true);
    expect(crew[3].average).toBeNull();
  });

  it("excludes disqualified picks from the average but still lists them", () => {
    const bars = [
      bar(8, { addedBy: "A" }),
      bar(2, { addedBy: "A", disqualified: true }),
    ];
    const [a] = crewStandings(bars, []);
    expect(a.picks).toHaveLength(2);
    expect(a.average).toBe(8);
    expect(a.disqualified).toBe(1);
  });

  it("ignores wishlist bars", () => {
    const crew = crewStandings([bar(8, { addedBy: "A", status: "to-try" })], []);
    expect(crew).toHaveLength(0);
  });
});

describe("Crew achievements", () => {
  it("every crew key exists in the catalog", () => {
    const bars = [
      bar(9, { addedBy: "A" }),
      bar(9, { addedBy: "A" }),
      bar(9, { addedBy: "A" }),
      bar(9, { addedBy: "A" }),
      bar(9, { addedBy: "A" }),
      bar(3, { addedBy: "B" }),
      bar(5, { addedBy: "C", disqualified: true }),
      bar(5, { addedBy: "D" }),
      ...Array.from({ length: 5 }, () => bar(6, { appPicked: true })),
    ];
    const got = checkCrewAchievements(bars, []);
    for (const key of got.keys()) {
      expect(ACHIEVEMENTS_BY_KEY.get(key)?.category, key).toBe("crew");
    }
    expect(got.get("kingmaker")).toBe("A");
    expect(got.get("hat_trick")).toBe("A");
    expect(got.get("tastemaker")).toBe("A");
    expect(got.get("golden_palate")).toBe("A");
    expect(got.get("you_picked_this")).toContain("B");
    expect(got.get("scapegoat")).toContain("C");
    expect(got.has("the_whole_crew")).toBe(true);
    expect(got.has("trust_the_process")).toBe(true);
    expect(got.get("human_after_all")).toBe("A");
    expect(got.has("skynet_was_right")).toBe(false);
    expect(got.has("rise_of_the_machines")).toBe(false);
  });

  it("Rise of the Machines / Skynet when the app out-picks everyone", () => {
    const bars = [
      ...Array.from({ length: 3 }, () => bar(9, { appPicked: true })),
      ...Array.from({ length: 3 }, () => bar(6, { addedBy: "Spencer" })),
    ];
    const got = checkCrewAchievements(bars, []);
    expect(got.has("rise_of_the_machines")).toBe(true);
    expect(got.has("skynet_was_right")).toBe(true);
    expect(got.has("human_after_all")).toBe(false);
    expect(got.get("calling_dibs")).toBe("Spencer");
  });

  it("nothing unlocks with no credits at all", () => {
    expect(checkCrewAchievements([bar(9), bar(3)], []).size).toBe(0);
  });
});

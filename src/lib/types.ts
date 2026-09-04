export type BarStatus = "visited" | "to-try";

/** One global Bar Battle — a pairwise tiebreak decision between two bars that
 *  finished with the same score. Shared by everyone (not per-user); the
 *  winner only affects ORDERING within a score tie, never the scores
 *  themselves. Stored on the shared document as `rankingBattles`.
 *
 *  At most one battle exists per unordered pair — recording a new one
 *  replaces the old, so there are never duplicate or conflicting records.
 *  `bar1Id`/`bar2Id` are the two contenders and `winnerId` is one of them.
 *  `createdAt` is a client timestamp (the app has no auth, matching the
 *  existing bar records, which carry no createdBy either). */
export interface RankingBattle {
  id: string;
  bar1Id: string;
  bar2Id: string;
  winnerId: string;
  type: "score_tiebreak";
  createdAt: number;
}

/** How a bar record came to exist — drives a few achievement checks (e.g.
 *  "added via Nearby", "added straight from a crawl stop"). Optional and
 *  absent on every bar predating this field; a missing origin just never
 *  matches an origin-specific achievement, which is the correct behavior
 *  for legacy bars whose real origin was never recorded. */
export type BarOrigin = "manual" | "surprise" | "nearby" | "search" | "crawl";

export interface Bar {
  id: string;
  name: string;
  status: BarStatus;
  vibe: number | null;
  value: number | null;
  service: number | null;
  food: number | null;
  drinks: number | null;
  bathroomBonus: number;
  notes: string;
  neighborhood: string;
  description: string;
  tags: string[];
  happyHour: string;
  capacity: number | null;
  mapsLink: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  /** Google Places types from venue classification. */
  types?: string[];
  detailsFetched: boolean;
  disqualified: boolean;
  disqualifyReason: string;
  /** Client timestamp (Date.now()) when this record was created. Absent on
   *  bars that predate this field — achievement checks that need it (e.g.
   *  "removed within a day of adding") simply never match a legacy bar
   *  missing it, which is the only honest behavior since the real creation
   *  time was never recorded. */
  createdAt?: number;
  /** How this bar was added — see BarOrigin. */
  origin?: BarOrigin;
  /** True once this bar has ever been visited after having sat on the
   *  wishlist first (set the moment status flips to-try -> visited via a
   *  wishlist match). Never cleared once set — it's a historical fact about
   *  the bar, not a live description of its current status. */
  cameFromWishlist?: boolean;
  /** True once this bar has ever been disqualified, even if it was later
   *  reinstated (disqualified: false). Never cleared once set — lets
   *  "reinstated a bar you'd disqualified" be checked from current state
   *  alone, without needing a change history. */
  wasDisqualified?: boolean;
}

/** A Google Places result, possibly enriched with Gemini flavor text. */
export interface PlaceResult {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  mapsLink: string;
  rating?: number | null;
  /** Google Places types (e.g. ["bar", "night_club", "pub", "wine_bar"]).
   *  Used to ground Gemini descriptions with actual venue classification. */
  types?: string[];
  /** Google Places price level (e.g. "PRICE_LEVEL_MODERATE"). */
  priceLevel?: string;
  neighborhood?: string;
  description?: string;
  tags?: string[];
  happyHour?: string;
  capacityHint?: number | null;
  notes?: string;
  _placeIntent?: "visited" | "wishlist" | "crawlStart";
  _wishFormId?: string;
  /** Which discovery flow produced this result — carried through into the
   *  saved Bar's `origin` field when the user adds it. Set by runSearch
   *  ("search"), runRandomSearch ("surprise"), runNearbySearch ("nearby"),
   *  and the crawl flow ("crawl"); absent for a manual add. */
  _origin?: BarOrigin;
}

/** One permanent, one-time achievement unlock — see src/lib/achievements.ts
 *  for the full catalog. There are no accounts, so an unlock belongs to the
 *  shared house, not a person: no name, just what happened and when. Once
 *  written, an unlock is never removed or re-evaluated, even if the bar or
 *  battle that earned it later changes — it's a record of a moment, not a
 *  live description of current state. */
export interface AchievementUnlock {
  /** Matches one AchievementDef.key in src/lib/achievements.ts. */
  key: string;
  /** Client timestamp (Date.now()) when this was first detected as true. */
  unlockedAt: number;
  /** Short free-text context shown on the badge card (e.g. a bar name, or
   *  a battle's two contenders) — never a person's name. */
  context?: string;
}

export interface VisitedForm {
  id: string | null;
  name: string;
  vibe: string;
  value: string;
  service: string;
  food: string;
  drinks: string;
  bathroomBonus: string;
  notes: string;
}

export interface WishForm {
  id: string | null;
  name: string;
  neighborhood: string;
  notes: string;
}

export interface SplitPerson {
  id: string;
  name: string;
}

export interface SplitItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: Record<string, number>; // personId -> units assigned
}

/** One uploaded screenshot of a receipt (a place may have several). */
export interface SplitScreenshot {
  id: string;
  base64: string;
  mimeType: string;
  previewUrl: string;
}

/** One tab in the Split flow — one bar/place with its own receipt(s),
 *  items, and the subset of the group ("crew") who were there. */
export interface SplitPlace {
  id: string;
  name: string;
  /** True once the user has hand-edited the name — stops later Gemini
   *  parses from overwriting a name the user chose themselves. */
  nameEdited: boolean;
  screenshots: SplitScreenshot[];
  items: SplitItem[];
  tax: number;
  tip: number;
  /** Subset of the master `SplitPerson` roster who were at this place. */
  crewIds: string[];
  parsing: boolean;
  parseError: string | null;
  /** How many screenshots were included in the last successful parse — used
   *  to skip re-reading receipts that haven't changed. */
  parsedShotCount: number;
  /** How this place's bill is divided: "item" = assign items to people,
   *  "even" = split the whole bill proportionally by rounds. */
  splitMethod: "item" | "even";
  /** Even-split participation, personId -> rounds they were present for.
   *  Only meaningful when `splitMethod === "even"`. */
  evenRounds: Record<string, number>;
  /** People explicitly excluded from paying (their share is covered by the
   *  rest of the crew). Distinct from a person with 0 rounds. */
  evenExcluded: string[];
  /** The bill's total round count — full participation equals this number.
   *  People are capped at it and new crew members default to it. */
  evenMaxRounds: number;
  /** Who fronted this place's bill — a `SplitPerson` id, or null if nobody's
   *  been picked yet. Purely informational (doesn't affect any totals) but
   *  carried into every share message so everyone knows who to pay back. */
  paidBy: string | null;
}

export interface SplitTotals {
  perPersonSubtotal: Record<string, number>;
  perPersonTotal: Record<string, number>;
  assignedSubtotal: number;
  unassignedUnitsCount: number;
}

/** Sum of every place's perPersonTotal, keyed by person id. */
export interface SplitGrandTotals {
  perPersonTotal: Record<string, number>;
}

/** One personalized share message for a participant. Excluded people get a
 *  message too, but `excluded` tells the UI not to offer a payment request. */
export interface SplitShareMessage {
  personId: string;
  name: string;
  message: string;
  excluded: boolean;
}

/** The sharing payload for one split (a place or the whole trip): a single
 *  group message plus one personalized message per participant. Used by both
 *  split methods — Even Split messages carry round accounting, Item by Item
 *  messages carry that person's assigned items. */
export interface SplitShareResults {
  group: string;
  individuals: SplitShareMessage[];
}

export interface PlacesModalState {
  suggestion: PlaceResult;
  results: PlaceResult[];
  searching: boolean;
}

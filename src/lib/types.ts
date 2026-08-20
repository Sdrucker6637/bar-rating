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
  detailsFetched: boolean;
  disqualified: boolean;
  disqualifyReason: string;
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
  neighborhood?: string;
  description?: string;
  tags?: string[];
  happyHour?: string;
  capacityHint?: number | null;
  notes?: string;
  _placeIntent?: "visited" | "wishlist" | "crawlStart";
  _wishFormId?: string;
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

export interface PlacesModalState {
  suggestion: PlaceResult;
  results: PlaceResult[];
  searching: boolean;
}

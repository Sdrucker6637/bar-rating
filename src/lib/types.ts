export type BarStatus = "visited" | "to-try";

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

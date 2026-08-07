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
  // Enrichment fields (filled in by Gemini after the place is verified)
  neighborhood?: string;
  description?: string;
  tags?: string[];
  happyHour?: string;
  capacityHint?: number | null;
  notes?: string;
  // Internal routing flags (never persisted)
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

export interface SplitTotals {
  perPersonSubtotal: Record<string, number>;
  perPersonTotal: Record<string, number>;
  assignedSubtotal: number;
  unassignedUnitsCount: number;
}

export interface PlacesModalState {
  suggestion: PlaceResult;
  results: PlaceResult[];
  searching: boolean;
}

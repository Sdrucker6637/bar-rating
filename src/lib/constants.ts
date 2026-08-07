import type { Bar, VisitedForm, WishForm } from "./types";

/** Base shape every bar record starts from. */
export const base: Omit<
  Bar,
  | "id"
  | "name"
  | "status"
  | "vibe"
  | "value"
  | "service"
  | "food"
  | "drinks"
  | "notes"
  | "bathroomBonus"
> = {
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
  detailsFetched: false,
  disqualified: false,
  disqualifyReason: "",
};

export const DOC_PATH = { collection: "tourDeAlcoholism", doc: "sharedList" };

export const emptyVisitedForm: VisitedForm = {
  id: null,
  name: "",
  vibe: "",
  value: "",
  service: "",
  food: "",
  drinks: "",
  bathroomBonus: "",
  notes: "",
};

export const emptyWishForm: WishForm = {
  id: null,
  name: "",
  neighborhood: "",
  notes: "",
};

export const SURPRISE_VIBES = [
  "cozy neighborhood",
  "lively cocktail",
  "classic dive",
  "speakeasy",
  "rooftop",
  "wine",
  "beer hall",
  "late night",
  "live music",
];

// Cold → hot ramps with clearly distinct endpoints so low and high bars read
// instantly against the dark map tiles. The cold ends are teal/green — the
// old navy (#1B2A4A) and near-black green (#0F2E26) matched the map's dark
// tiles and vanished. Visited runs teal → brass → gold → near-white;
// wishlist runs green → sage → mint (density-based).
export const HEAT_GRADIENTS: Record<
  "visited" | "wishlist",
  Record<number, string>
> = {
  visited: {
    0.0: "#2E6E8C", // teal — bottom tier (pops against the navy map)
    0.25: "#4A8FB0", // lighter teal-blue
    0.5: "#8A6D2F", // brass (app accent)
    0.75: "#D9A83C", // bright gold
    1.0: "#FFE3A0", // warm near-white — top rated
  },
  wishlist: {
    0.0: "#24533F", // green — sparse (lighter than the map, still reads)
    0.25: "#2F6249", // dark green
    0.5: "#3E7A57", // green
    0.75: "#6FAD85", // sage
    1.0: "#B7E6C3", // light mint — densest cluster
  },
};

// Wishlist markers have no scores to vary by, so they keep a single color —
// mint, matching the top of the wishlist ramp. Visited markers are colored
// straight from the visited gradient instead (see MapView).
export const HEAT_DOT_COLOR: Record<"wishlist", string> = {
  wishlist: "#B7E6C3",
};

/** Crawl planning (straight-line walking-time approximation) */
export const WALK_SPEED_MPS = 1.34; // ~4.8 km/h average walking pace
export const WALK_DETOUR_FACTOR = 1.3; // streets aren't straight lines
export const MAX_BEELINE_METERS = 600; // straight-line cutoff approximating a 10-min walk

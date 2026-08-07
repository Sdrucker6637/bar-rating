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

export const HEAT_GRADIENTS: Record<
  "visited" | "wishlist",
  Record<number, string>
> = {
  visited: {
    0.2: "#302938",
    0.4: "#3A4F66",
    0.6: "#8A6D2F",
    0.8: "#C9A876",
    1.0: "#E5B93F",
  },
  wishlist: {
    0.2: "#1F2E28",
    0.4: "#2E4438",
    0.6: "#3F5D4E",
    0.8: "#5C8D74",
    1.0: "#7FA88E",
  },
};

export const HEAT_DOT_COLOR: Record<"visited" | "wishlist", string> = {
  visited: "#C9A876",
  wishlist: "#7FA88E",
};

/** Crawl planning (straight-line walking-time approximation) */
export const WALK_SPEED_MPS = 1.34; // ~4.8 km/h average walking pace
export const WALK_DETOUR_FACTOR = 1.3; // streets aren't straight lines
export const MAX_BEELINE_METERS = 600; // straight-line cutoff approximating a 10-min walk

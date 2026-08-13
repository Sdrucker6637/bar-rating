"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import { db } from "./firebase";
import { base, DOC_PATH, emptyVisitedForm, emptyWishForm } from "./constants";
import { seedBars } from "./seed";
import { avgWithFood, avgWithoutFood, haversineMeters } from "./scoring";
import { displayDescription } from "./parse";
import { callGemini } from "./gemini";
import { fetchPlaces, fetchBarSuggestions, fetchRandomBar } from "./places";
import { SURPRISE_VIBES } from "./constants";
import type { Bar, PlaceResult, VisitedForm, WishForm } from "./types";

export type CrawlStop = PlaceResult & { distanceMeters?: number };

// House rules for the "Fits our group" size: default 6, valid range 1–20.
// Every read of the stored value (Firestore snapshot, seed) and every write
// clamps through here, so a stale/out-of-range value can never surface in
// the UI or leak into filtering.
const DEFAULT_GROUP_SIZE = 6;
const clampGroupSize = (n: number) =>
  Math.min(20, Math.max(1, Math.round(n)));

export interface PlacesModalState {
  suggestion: PlaceResult;
  results: PlaceResult[];
  searching: boolean;
}

interface TourContextValue {
  // ---- data ----
  bars: Bar[] | null;
  loading: boolean;
  connError: boolean;
  saveError: boolean;
  groupSize: number;
  setGroupSize: (n: number) => void;
  visited: Bar[];
  toTry: Bar[];
  filteredVisited: Bar[];
  filteredToTry: Bar[];
  fetchingIds: Set<string>;

  // ---- leaderboard filters ----
  search: string;
  setSearch: (s: string) => void;
  foodMode: "with" | "without";
  setFoodMode: (m: "with" | "without") => void;

  // ---- find page ----
  vibeQuery: string;
  setVibeQuery: (s: string) => void;
  fitsGroupOnly: boolean;
  setFitsGroupOnly: (b: boolean) => void;
  ballerMode: boolean;
  setBallerMode: (b: boolean) => void;
  exploreMode: boolean;
  setExploreMode: (b: boolean) => void;
  searchResults: PlaceResult[];
  searching: boolean;
  searchDone: boolean;
  enrichingNames: Set<string>;
  runSearch: () => Promise<void>;
  runRandomSearch: () => Promise<void>;
  runNearbySearch: () => Promise<void>;
  addSuggestionToWishlist: (s: PlaceResult) => void;
  rankSuggestion: (s: PlaceResult) => void;

  // ---- crawl modal ----
  showCrawlModal: boolean;
  setShowCrawlModal: (b: boolean) => void;
  crawlStartInput: string;
  setCrawlStartInput: (s: string) => void;
  crawlCount: number;
  setCrawlCount: (n: number) => void;
  crawlPlanning: boolean;
  crawlStops: CrawlStop[];
  crawlError: string | null;
  replacingIndex: number | null;
  crawlEnrichingNames: Set<string>;
  startCrawlPlanning: () => Promise<void>;
  replaceStop: (index: number) => Promise<void>;
  removeCrawlStop: (name: string) => void;
  closeCrawlModal: () => void;

  // ---- bar actions ----
  startManualAdd: (type: "visited" | "wishlist") => void;
  markVisited: (b: Bar) => void;
  editVisited: (b: Bar) => void;
  removeBar: (id: string) => void;
  toggleDisqualify: (b: Bar) => void;

  // ---- modals ----
  showVisitedForm: boolean;
  setShowVisitedForm: (b: boolean) => void;
  visitedForm: VisitedForm;
  setVisitedForm: (f: VisitedForm) => void;
  visitedSuggestion: PlaceResult | null;
  showWishForm: boolean;
  setShowWishForm: (b: boolean) => void;
  wishForm: WishForm;
  setWishForm: (f: WishForm) => void;
  showVisitedNamePrompt: boolean;
  setShowVisitedNamePrompt: (b: boolean) => void;
  visitedNameInput: string;
  setVisitedNameInput: (s: string) => void;
  visitedHoodInput: string;
  setVisitedHoodInput: (s: string) => void;
  showInfo: boolean;
  setShowInfo: (b: boolean) => void;
  placesModal: PlacesModalState | null;
  setPlacesModal: (m: PlacesModalState | null) => void;
  startPlacesLookup: (s: Partial<PlaceResult> & { name: string }) => Promise<void>;
  confirmPlaceSelection: (r: Partial<PlaceResult>) => void;
  saveVisitedForm: (e: FormEvent) => Promise<void>;
  saveWishForm: (e: FormEvent) => Promise<void>;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

/** Legacy leaderboard records predate the mapsLink field (added with the
 *  Places flow), so they load with an empty string and the card's Map action
 *  silently disappears. Backfill a Google Maps search link from the name and
 *  whatever location the record has — the same fallback the app already uses
 *  for new bars that Places returns without a mapsLink. Only fills EMPTY
 *  links; never overwrites an existing one. */
/** Returns true when a geocoder result's name plausibly matches the bar being
 *  resolved — case/punctuation-insensitive exact match or one name containing
 *  the other. Guards the coordinate backfill against fuzzy matches silently
 *  writing wrong coordinates (e.g. "Angels Share" resolving to an unrelated
 *  business that shares no name words). */
function nameMatches(resultName: string, barName: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  const a = norm(resultName);
  const b = norm(barName);
  if (!a || !b) return true; // nothing to compare — don't block
  return a.includes(b) || b.includes(a);
}

function healMissingMapsLinks(raw: Bar[]): { bars: Bar[]; changed: boolean } {
  let changed = false;
  const bars = raw.map((b) => {
    if (b.mapsLink) return b;
    changed = true;
    const location = b.address || b.neighborhood || "New York City";
    return {
      ...b,
      mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${b.name}, ${location}`,
      )}`,
    };
  });
  return { bars, changed };
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [bars, setBars] = useState<Bar[] | null>(null);
  const barsRef = useRef<Bar[] | null>(null);
  useEffect(() => {
    barsRef.current = bars;
  }, [bars]);
  // Bars whose coordinate backfill already ran this session (success or
  // failure) — a bar that failed gets one fresh attempt on the next full page
  // load, matching the failedIds details-fetch pattern.
  const coordAttemptedRef = useRef<Set<string>>(new Set());
  // Every bar name shown as a search/surprise result this session, whether or
  // not it was saved — kept out of future results so retrying a search or
  // hitting Surprise Us repeatedly doesn't just replay what you already saw.
  const [seenNames, setSeenNames] = useState<Set<string>>(() => new Set());
  const [groupSize, setGroupSizeState] = useState(DEFAULT_GROUP_SIZE);
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState(false);
  const [search, setSearch] = useState("");
  const [foodMode, setFoodMode] = useState<"with" | "without">("with");
  const [showVisitedForm, setShowVisitedForm] = useState(false);
  const [visitedForm, setVisitedForm] = useState<VisitedForm>(emptyVisitedForm);
  const [showWishForm, setShowWishForm] = useState(false);
  const [wishForm, setWishForm] = useState<WishForm>(emptyWishForm);
  const [saveError, setSaveError] = useState(false);
  const [vibeQuery, setVibeQuery] = useState("");
  const [fitsGroupOnly, setFitsGroupOnly] = useState(false);
  const [ballerMode, setBallerMode] = useState(false);
  const [exploreMode, setExploreMode] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [fetchingIds, setFetchingIds] = useState<Set<string>>(() => new Set());
  // Bars where the last enrichment attempt this session failed (Gemini error,
  // timeout, or "no usable description"). Skipped by the auto-fetch effect so
  // a permanently-stuck bar doesn't retry on every single bars-state change —
  // it'll get one fresh attempt again on the next full page load.
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const [enrichingNames, setEnrichingNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [showInfo, setShowInfo] = useState(false);
  const [visitedSuggestion, setVisitedSuggestion] = useState<PlaceResult | null>(
    null,
  );
  const [placesModal, setPlacesModal] = useState<PlacesModalState | null>(null);
  const [showVisitedNamePrompt, setShowVisitedNamePrompt] = useState(false);
  const [visitedNameInput, setVisitedNameInput] = useState("");
  const [visitedHoodInput, setVisitedHoodInput] = useState("");
  const [showCrawlModal, setShowCrawlModal] = useState(false);
  const [crawlStartInput, setCrawlStartInput] = useState("");
  const [crawlCount, setCrawlCount] = useState(3);
  const [crawlPlanning, setCrawlPlanning] = useState(false);
  const [crawlStops, setCrawlStops] = useState<CrawlStop[]>([]);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [crawlEnrichingNames, setCrawlEnrichingNames] = useState<Set<string>>(
    () => new Set(),
  );

  const docRef = db.collection(DOC_PATH.collection).doc(DOC_PATH.doc);

  useEffect(() => {
    const unsub = docRef.onSnapshot(
      (snap) => {
        if (snap.exists) {
          const data = snap.data() || {};
          const healed = healMissingMapsLinks((data.bars as Bar[]) || []);
          setBars(healed.bars);
          // One-time heal: legacy bars load with an empty mapsLink, which hides
          // the card's Map action. Write the backfilled links back so the
          // stored copy is fixed too — idempotent, so the follow-up snapshot
          // finds nothing to change and the loop stops.
          if (healed.changed) {
            docRef.set({ bars: healed.bars }, { merge: true }).catch(() => {});
          }
          const stored = Number(data.groupSize);
          if (Number.isFinite(stored)) {
            if (stored >= 1 && stored <= 20) {
              setGroupSizeState(stored);
            } else {
              // Out-of-range legacy value (e.g. 29 from an old version) —
              // reset to the house default and correct the stored copy so
              // it doesn't keep winning on every reload.
              setGroupSizeState(DEFAULT_GROUP_SIZE);
              docRef
                .set({ groupSize: DEFAULT_GROUP_SIZE }, { merge: true })
                .catch(() => {});
            }
          }
        } else {
          docRef
            .set({ bars: seedBars, groupSize: DEFAULT_GROUP_SIZE })
            .catch(() => setConnError(true));
          setBars(seedBars);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setConnError(true);
        setBars(seedBars);
        setLoading(false);
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (updater: Bar[] | ((prev: Bar[]) => Bar[])): Promise<void> => {
      const prevBars = barsRef.current || [];
      const next = typeof updater === "function" ? updater(prevBars) : updater;
      barsRef.current = next;
      setBars(next);
      return docRef
        .set({ bars: next }, { merge: true })
        .then(() => setSaveError(false))
        .catch(() => setSaveError(true));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  const setGroupSize = useCallback(
    (n: number) => {
      const clamped = clampGroupSize(n);
      setGroupSizeState(clamped);
      docRef.set({ groupSize: clamped }, { merge: true }).catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  const updateBar = useCallback(
    (id: string, patch: Partial<Bar>) => {
      setBars((prev) => {
        const next = (prev || []).map((b) =>
          b.id === id ? { ...b, ...patch } : b,
        );
        barsRef.current = next;
        docRef
          .set({ bars: next }, { merge: true })
          .catch(() => setSaveError(true));
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  // Legacy bars (seeded or pre-Places) carry no coordinates, which the Tour
  // Map and crawl planning require. Backfill them through the same Google
  // Places exact-lookup the add-bar flow uses; when that's unavailable (no
  // GOOGLE_PLACES_API_KEY, or no result) fall back to OpenStreetMap's free
  // geocoder bounded to NYC so a fuzzy match can't land in another city.
  // The found coordinates are persisted once via updateBar, so every device
  // and the map pick them up without repeating the lookup.
  const healBarCoordinates = useCallback(
    async (bar: Bar) => {
      const results = await fetchPlaces(bar.name, {
        neighborhood: bar.neighborhood || "",
        address: bar.address || "",
        limit: 1,
        exactLookup: true,
      });
      const hit = results.find(
        (r) =>
          Number.isFinite(r.latitude) &&
          Number.isFinite(r.longitude) &&
          nameMatches(r.name, bar.name),
      );
      if (hit) {
        updateBar(bar.id, {
          latitude: hit.latitude ?? null,
          longitude: hit.longitude ?? null,
          placeId: hit.placeId || bar.placeId,
          address: hit.address || bar.address,
          mapsLink: hit.mapsLink || bar.mapsLink,
        });
        return;
      }
      try {
        // Nominatim's usage policy allows ~1 request/second — space fallback
        // lookups out so a batch heal doesn't get throttled.
        await new Promise((r) => setTimeout(r, 1100));
        const q = encodeURIComponent(
          `${bar.name}, ${bar.address || bar.neighborhood || "New York City, NY"}`,
        );
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&viewbox=-74.26,40.92,-73.70,40.70&bounded=1&accept-language=en`,
        );
        const list = (await res.json()) as Array<{
          lat: string;
          lon: string;
          display_name?: string;
        }>;
        const first = Array.isArray(list) ? list[0] : null;
        const resultName = first?.display_name
          ? first.display_name.split(",")[0].trim()
          : "";
        if (
          first &&
          Number.isFinite(Number(first.lat)) &&
          Number.isFinite(Number(first.lon)) &&
          nameMatches(resultName, bar.name)
        ) {
          updateBar(bar.id, {
            latitude: Number(first.lat),
            longitude: Number(first.lon),
          });
        }
      } catch {
        // Leave the bar without coordinates — a future load retries it.
      }
    },
    [updateBar],
  );

  // Kick off the coordinate backfill once bars load. Idempotent: bars that
  // already have finite coordinates are skipped, and every bar is attempted
  // at most once per session, so a successful heal can't loop or re-call.
  useEffect(() => {
    if (!bars || connError) return;
    const missing = bars.filter(
      (b) =>
        !(Number.isFinite(b.latitude) && Number.isFinite(b.longitude)) &&
        !coordAttemptedRef.current.has(b.id),
    );
    if (missing.length === 0) return;
    missing.forEach((b) => coordAttemptedRef.current.add(b.id));
    // Sequential, not parallel: the Nominatim fallback paces itself at ~1
    // request/second, so a batch of legacy bars must be resolved one at a
    // time or the geocoder would throttle the whole heal.
    (async () => {
      for (const b of missing) {
        await healBarCoordinates(b);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, connError]);

  const runDetailsFetch = useCallback((bar: Bar, forceRefresh?: boolean) => {
    setFetchingIds((s) => new Set(s).add(bar.id));
    const prompt = `You are a NYC bar description writer.\n\nThe bar "${bar.name}" located at "${bar.address || bar.neighborhood || "New York City"}" has already been verified as a real, currently open business via Google Places.\n\nUsing only what you know about this specific venue, return ONLY JSON:\n\n{"description":"two to three sentences covering vibe, drink style, and notable characteristics","tags":["3 to 5 short lowercase vibe words"],"happyHour":"short string or null","neighborhood":"short neighborhood name","capacityHint":0}\n\nRules:\n- Do NOT invent or rename the business.\n- If you have no reliable information, set description to an empty string.\n- Do not include a mapsLink field.`;
    callGemini(prompt, bar.id, !!forceRefresh).then((data) => {
      // No client-side write here on purpose: the API route now persists this
      // bar's details itself inside a Firestore transaction. Writing it again
      // from here, based on this client's local (possibly a beat stale) copy
      // of `bars`, would risk silently reverting someone else's concurrent
      // edit — the live onSnapshot listener will pick up the server's write.
      if (!data) setFailedIds((s) => new Set(s).add(bar.id));
      setFetchingIds((s) => {
        const n = new Set(s);
        n.delete(bar.id);
        return n;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bars) return;
    bars.forEach((bar) => {
      if (
        !bar.detailsFetched &&
        !fetchingIds.has(bar.id) &&
        !failedIds.has(bar.id)
      )
        runDetailsFetch(bar);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars]);

  const startManualAdd = useCallback((type: "visited" | "wishlist") => {
    if (type === "visited") {
      setVisitedSuggestion(null);
      setVisitedForm(emptyVisitedForm);
      setShowVisitedNamePrompt(true);
    } else {
      setWishForm(emptyWishForm);
      setShowWishForm(true);
    }
  }, []);

  const startPlacesLookup = useCallback(
    async (suggestion: Partial<PlaceResult> & { name: string }) => {
      setPlacesModal({
        suggestion: suggestion as PlaceResult,
        results: [],
        searching: true,
      });
      try {
        const results = await fetchPlaces(suggestion.name, {
          neighborhood: suggestion.neighborhood || "",
          address: suggestion.address || "",
          limit: 5,
          exactLookup: true,
        });
        setPlacesModal({
          suggestion: suggestion as PlaceResult,
          results,
          searching: false,
        });
      } catch (e) {
        setPlacesModal({
          suggestion: suggestion as PlaceResult,
          results: [],
          searching: false,
        });
      }
    },
    [],
  );

  const addSuggestionToWishlist = useCallback(
    (s: PlaceResult) => {
      const mapsLink =
        s.mapsLink ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          s.name + (s.address ? ", " + s.address : ", New York City"),
        )}`;
      const isEdit = s._wishFormId;
      const id = isEdit ? s._wishFormId : `b${Date.now()}`;
      const hasDescription =
        typeof s.description === "string" && s.description.trim().length > 10;
      const record: Bar = {
        id: id as string,
        name: s.name,
        status: "to-try",
        vibe: null,
        value: null,
        service: null,
        food: null,
        drinks: null,
        bathroomBonus: 0,
        notes: s.notes || "",
        neighborhood: s.neighborhood || "",
        description: s.description || "",
        tags: s.tags || [],
        happyHour: s.happyHour || "",
        capacity: s.capacityHint || null,
        address: s.address || "",
        latitude: s.latitude || null,
        longitude: s.longitude || null,
        placeId: s.placeId || null,
        mapsLink,
        detailsFetched: hasDescription,
        disqualified: false,
        disqualifyReason: "",
      };
      const persistPromise = persist((prev) =>
        isEdit
          ? prev.map((b) => (b.id === id ? { ...b, ...record } : b))
          : [...prev, record],
      );
      persistPromise.then(() => {
        if (!record.detailsFetched) runDetailsFetch(record);
      });
      setSearchResults((prev) => prev.filter((r) => r.name !== s.name));
    },
    [persist, runDetailsFetch],
  );

  // Fills in a search/surprise result's description, tags, happyHour, and
  // neighborhood in place via Gemini, once its existence is already confirmed
  // by Places. Ephemeral — nothing here is persisted unless the user adds the
  // bar, at which point the same fields carry over via addSuggestionToWishlist.
  //
  // Deliberately called WITHOUT a barId: the API route only does its Firestore
  // bar lookup/caching when barId is present, and 404s if that id isn't an
  // existing saved bar — which a fresh search result never is. Omitting barId
  // routes it through the plain "generate and return, no Firestore" path.
  const enrichSearchResult = useCallback((result: PlaceResult) => {
    setEnrichingNames((s) => new Set(s).add(result.name));
    const prompt = `You are a NYC bar description writer.\n\nThe bar "${result.name}" located at "${result.address || result.neighborhood || "New York City"}" has already been verified as a real, currently open business via Google Places.\n\nUsing only what you know about this specific venue, return ONLY a single JSON object (not an array):\n\n{"description":"two to three sentences covering vibe, drink style, and notable characteristics","tags":["3 to 5 short lowercase vibe words"],"happyHour":"short string or null","neighborhood":"short neighborhood name"}\n\nRules:\n- Do NOT invent or rename the business.\n- If you have no reliable information, set description to an empty string.`;
    callGemini(prompt, null, false).then((data) => {
      // Defensive: the server returns an array for multi-suggestion calls, so
      // unwrap just in case Gemini ever ignores the "single object" instruction.
      const info = (Array.isArray(data) ? data[0] : data) as
        | (PlaceResult & { description?: string })
        | undefined;
      if (info) {
        setSearchResults((prev) =>
          prev.map((r) =>
            r.name === result.name
              ? {
                  ...r,
                  description: info.description || r.description,
                  tags: info.tags && info.tags.length ? info.tags : r.tags,
                  happyHour: info.happyHour || r.happyHour,
                  neighborhood: info.neighborhood || r.neighborhood,
                }
              : r,
          ),
        );
      }
      setEnrichingNames((s) => {
        const n = new Set(s);
        n.delete(result.name);
        return n;
      });
    });
  }, []);

  const enrichCrawlStop = useCallback((stop: CrawlStop) => {
    setCrawlEnrichingNames((s) => new Set(s).add(stop.name));
    const prompt = `You are a NYC bar description writer.\n\nThe bar "${stop.name}" located at "${stop.address || "New York City"}" has already been verified as a real, currently open business via Google Places.\n\nUsing only what you know about this specific venue, return ONLY a single JSON object (not an array):\n\n{"description":"two to three sentences covering vibe, drink style, and notable characteristics","tags":["3 to 5 short lowercase vibe words"],"happyHour":"short string or null","neighborhood":"short neighborhood name"}\n\nRules:\n- Do NOT invent or rename the business.\n- If you have no reliable information, set description to an empty string.`;
    callGemini(prompt, null, false).then((data) => {
      const info = (Array.isArray(data) ? data[0] : data) as
        | (PlaceResult & { description?: string })
        | undefined;
      if (info) {
        setCrawlStops((prev) =>
          prev.map((r) =>
            r.name === stop.name
              ? {
                  ...r,
                  description: info.description || r.description,
                  tags: info.tags && info.tags.length ? info.tags : r.tags,
                  happyHour: info.happyHour || r.happyHour,
                  neighborhood: info.neighborhood || r.neighborhood,
                }
              : r,
          ),
        );
      }
      setCrawlEnrichingNames((s) => {
        const n = new Set(s);
        n.delete(stop.name);
        return n;
      });
    });
  }, []);

  const replaceStop = useCallback(
    async (index: number) => {
      setReplacingIndex(index);
      const prev = index === 0 ? null : crawlStops[index - 1];
      const next = crawlStops[index + 1] || null;
      const usedNames = new Set<string>([
        ...(bars || []).map((b) => b.name),
        ...crawlStops.map((s) => s.name),
      ]);

      // Search near the surrounding stops — if replacing the first stop, search
      // near the second; if last, near the second-to-last; otherwise near prev.
      const anchor = prev || next;
      if (!anchor || !Number.isFinite(anchor.latitude)) {
        setReplacingIndex(null);
        return;
      }

      const results = await fetchPlaces("great bar", {
        limit: 10,
        noCache: true,
        centerLat: anchor.latitude || undefined,
        centerLng: anchor.longitude || undefined,
        radiusMeters: 900,
      });

      const candidates = results
        .filter(
          (r) =>
            !usedNames.has(r.name) &&
            Number.isFinite(r.latitude) &&
            Number.isFinite(r.longitude),
        )
        .map((r) => ({
          ...r,
          distanceMeters: haversineMeters(
            anchor.latitude as number,
            anchor.longitude as number,
            r.latitude as number,
            r.longitude as number,
          ),
        }))
        .filter((r) => (r.distanceMeters as number) <= 600);

      if (candidates.length === 0) {
        setReplacingIndex(null);
        return;
      }

      const replacement =
        candidates[Math.floor(Math.random() * candidates.length)];
      setCrawlStops((prevStops) =>
        prevStops.map((s, i) => (i === index ? replacement : s)),
      );
      setReplacingIndex(null);
      enrichCrawlStop(replacement);
    },
    [crawlStops, bars, enrichCrawlStop],
  );

  const runCrawlPlan = useCallback(
    async (startBar: PlaceResult) => {
      const requestedCount = crawlCount;
      setCrawlPlanning(true);
      const normalizedStart: CrawlStop = {
        name: startBar.name,
        address: startBar.address || "",
        latitude: startBar.latitude,
        longitude: startBar.longitude,
        placeId: startBar.placeId || null,
        mapsLink: startBar.mapsLink || "",
        neighborhood: startBar.neighborhood || "",
        description: startBar.description || "",
        tags: startBar.tags || [],
        happyHour: startBar.happyHour || "",
        rating: null,
      };
      if (
        !Number.isFinite(normalizedStart.latitude) ||
        !Number.isFinite(normalizedStart.longitude)
      ) {
        setCrawlPlanning(false);
        setCrawlError(
          "Couldn't pin down that bar's location — try a different search.",
        );
        return;
      }

      const stops: CrawlStop[] = [normalizedStart];
      const usedNames = new Set<string>([
        ...(bars || []).map((b) => b.name),
        ...seenNames,
        normalizedStart.name,
      ]);
      let truncated = false;

      for (let i = 1; i < requestedCount; i++) {
        const prev = stops[stops.length - 1];
        const results = await fetchPlaces("great bar", {
          limit: 10,
          noCache: true,
          centerLat: prev.latitude || undefined,
          centerLng: prev.longitude || undefined,
          radiusMeters: 900,
        });
        const candidates = results
          .filter(
            (r) =>
              !usedNames.has(r.name) &&
              Number.isFinite(r.latitude) &&
              Number.isFinite(r.longitude),
          )
          .map((r) => ({
            ...r,
            distanceMeters: haversineMeters(
              prev.latitude as number,
              prev.longitude as number,
              r.latitude as number,
              r.longitude as number,
            ),
          }))
          .filter((r) => (r.distanceMeters as number) <= 600);

        if (candidates.length === 0) {
          truncated = true;
          break;
        }
        const next =
          candidates[Math.floor(Math.random() * candidates.length)];
        usedNames.add(next.name);
        stops.push(next);
      }

      setSeenNames(
        (prevSeen) => new Set([...prevSeen, ...stops.map((s) => s.name)]),
      );
      setCrawlStops(stops);
      setCrawlPlanning(false);
      setCrawlError(
        truncated && stops.length < requestedCount
          ? `Could only find ${stops.length} bar${
              stops.length === 1 ? "" : "s"
            } within a comfortable walk — try again for a different route.`
          : null,
      );
      stops.forEach((s) => enrichCrawlStop(s));
    },
    [crawlCount, bars, seenNames, enrichCrawlStop],
  );

  const confirmPlaceSelection = useCallback(
    (placeResult: Partial<PlaceResult>) => {
      if (!placesModal) return;
      const merged: PlaceResult = { ...placesModal.suggestion, ...placeResult };
      // Always preserve description/tags/neighborhood from the original suggestion
      // (Places results only have name/address/lat/lng/placeId/mapsLink, so these would be lost otherwise)
      merged.description = placesModal.suggestion.description || "";
      merged.tags = placesModal.suggestion.tags || [];
      merged.neighborhood = placesModal.suggestion.neighborhood || "";
      merged.happyHour = placesModal.suggestion.happyHour || "";
      merged.capacityHint = placesModal.suggestion.capacityHint || null;

      if (placesModal.suggestion._placeIntent === "visited") {
        setVisitedSuggestion(merged);
        setVisitedForm({ ...emptyVisitedForm, name: merged.name });
        setPlacesModal(null);
        setShowVisitedForm(true);
      } else if (placesModal.suggestion._placeIntent === "crawlStart") {
        setPlacesModal(null);
        if (
          !Number.isFinite(merged.latitude) ||
          !Number.isFinite(merged.longitude)
        ) {
          setCrawlError(
            "Couldn't pin down that bar's location — try a different search, or leave it blank to pick automatically.",
          );
          setShowCrawlModal(true);
          return;
        }
        setShowCrawlModal(true); // re-open crawl modal before planning starts
        runCrawlPlan(merged);
      } else {
        addSuggestionToWishlist(merged);
        setWishForm(emptyWishForm);
        setPlacesModal(null);
      }
    },
    [placesModal, runCrawlPlan, addSuggestionToWishlist],
  );

  const visited = useMemo(
    () => (bars || []).filter((b) => b.status === "visited"),
    [bars],
  );
  const toTry = useMemo(
    () => (bars || []).filter((b) => b.status === "to-try"),
    [bars],
  );

  const filteredVisited = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = visited.filter((b) => {
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.neighborhood || "").toLowerCase().includes(q) ||
        (b.notes || "").toLowerCase().includes(q) ||
        (b.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
    list.sort((a, b) => {
      if (!!a.disqualified !== !!b.disqualified) return a.disqualified ? 1 : -1;
      const av = foodMode === "with" ? avgWithFood(a) : avgWithoutFood(a);
      const bv = foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b);
      return (bv || 0) - (av || 0);
    });
    return list;
  }, [visited, search, foodMode]);

  const filteredToTry = useMemo(() => {
    return toTry.filter((b) => {
      if (fitsGroupOnly && b.capacity && Number(b.capacity) < groupSize)
        return false;
      return true;
    });
  }, [toTry, fitsGroupOnly, groupSize]);

  const startCrawlPlanning = useCallback(async () => {
    setCrawlError(null);
    setCrawlStops([]);
    if (crawlStartInput.trim()) {
      setShowCrawlModal(false); // close crawl modal so places picker has a clean surface
      await startPlacesLookup({
        name: crawlStartInput.trim(),
        _placeIntent: "crawlStart",
      });
      return;
    }
    // no starting bar — plan directly
    setCrawlPlanning(true);
    const exclude = [
      ...new Set<string>([...(bars || []).map((b) => b.name), ...seenNames]),
    ];
    const vibe =
      SURPRISE_VIBES[Math.floor(Math.random() * SURPRISE_VIBES.length)];
    const results = await fetchPlaces(vibe, { limit: 10, noCache: true });
    const fresh = results.filter((r) => !exclude.includes(r.name));
    if (fresh.length === 0) {
      setCrawlPlanning(false);
      setCrawlError(
        "Couldn't find a starting bar — try again, or name one yourself.",
      );
      return;
    }
    const start = fresh[Math.floor(Math.random() * fresh.length)];
    await runCrawlPlan(start);
  }, [crawlStartInput, bars, seenNames, startPlacesLookup, runCrawlPlan]);

  const runSearch = useCallback(async () => {
    setSearchResults([]);
    setSearching(true);
    setSearchDone(false);
    const exclude = [
      ...new Set<string>([...(bars || []).map((b) => b.name), ...seenNames]),
    ];
    const results = await fetchBarSuggestions(
      vibeQuery,
      groupSize,
      exclude,
      ballerMode,
      exploreMode,
    );
    // Google doesn't expose venue capacity, so this only filters bars that already
    // have a capacity set from a prior manual edit; new Places results pass through.
    const fitFiltered = fitsGroupOnly
      ? results.filter((r) => !r.capacityHint || r.capacityHint >= groupSize)
      : results;
    setSearchResults(fitFiltered);
    setSearching(false);
    setSearchDone(true);
    if (fitFiltered.length > 0) {
      setSeenNames(
        (prev) => new Set([...prev, ...fitFiltered.map((r) => r.name)]),
      );
      fitFiltered.forEach((r) => enrichSearchResult(r));
    }
  }, [
    bars,
    seenNames,
    vibeQuery,
    groupSize,
    ballerMode,
    exploreMode,
    fitsGroupOnly,
    enrichSearchResult,
  ]);

  const runRandomSearch = useCallback(async () => {
    setSearchResults([]);
    setSearching(true);
    setSearchDone(false);
    const exclude = [
      ...new Set<string>([...(bars || []).map((b) => b.name), ...seenNames]),
    ];
    const pick = await fetchRandomBar(
      groupSize,
      exclude,
      ballerMode,
      exploreMode,
    );
    setSearchResults(pick ? [pick] : []);
    setSearching(false);
    setSearchDone(true);
    if (pick) {
      setSeenNames((prev) => new Set([...prev, pick.name]));
      enrichSearchResult(pick);
    }
  }, [bars, seenNames, groupSize, ballerMode, exploreMode, enrichSearchResult]);

  const runNearbySearch = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("Your browser doesn't support location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setSearchResults([]);
        setSearching(true);
        setSearchDone(false);

        const exclude = [
          ...new Set<string>([...(bars || []).map((b) => b.name), ...seenNames]),
        ];

        const results = await fetchPlaces("bar", {
          limit: 10,
          noCache: true,
          centerLat: coords.latitude,
          centerLng: coords.longitude,
          radiusMeters: 800,
        });

        const fresh = results.filter((r) => !exclude.includes(r.name));

        const pick = fresh[Math.floor(Math.random() * fresh.length)];

        setSearchResults(pick ? [pick] : []);
        setSearching(false);
        setSearchDone(true);

        if (pick) {
          setSeenNames((prev) => new Set([...prev, pick.name]));
          enrichSearchResult(pick);
        }
      },
      () => {
        alert("Couldn't get your location.");
      },
    );
  }, [bars, seenNames, enrichSearchResult]);

  const rankSuggestion = useCallback((s: PlaceResult) => {
    setVisitedSuggestion(s);
    setVisitedForm({ ...emptyVisitedForm, name: s.name });
    setShowVisitedForm(true);
  }, []);

  const saveVisitedForm = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!visitedForm.name.trim()) return;
      const cleanNum = (v: string): number | null =>
        v === "" || v === null ? null : Number(v);
      const isNew = !visitedForm.id;
      const id = visitedForm.id || `b${Date.now()}`;
      const patch = {
        name: visitedForm.name.trim(),
        status: "visited" as const,
        vibe: cleanNum(visitedForm.vibe),
        value: cleanNum(visitedForm.value),
        service: cleanNum(visitedForm.service),
        food: cleanNum(visitedForm.food),
        drinks: cleanNum(visitedForm.drinks),
        bathroomBonus: cleanNum(visitedForm.bathroomBonus) || 0,
        notes: visitedForm.notes.trim(),
      };
      let record: Bar | undefined;
      await persist((prev) => {
        let next: Bar[];
        if (isNew) {
          const mapsLink = visitedSuggestion
            ? visitedSuggestion.mapsLink ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                visitedSuggestion.name +
                  (visitedSuggestion.address
                    ? ", " + visitedSuggestion.address
                    : ", New York City"),
              )}`
            : "";
          record = visitedSuggestion
            ? {
                ...base,
                ...patch,
                id,
                neighborhood: visitedSuggestion.neighborhood || "",
                description: displayDescription(visitedSuggestion.description),
                tags: visitedSuggestion.tags || [],
                happyHour: visitedSuggestion.happyHour || "",
                capacity: visitedSuggestion.capacityHint || null,
                address: visitedSuggestion.address || "",
                latitude: visitedSuggestion.latitude || null,
                longitude: visitedSuggestion.longitude || null,
                placeId: visitedSuggestion.placeId || null,
                mapsLink,
                detailsFetched: false,
              }
            : { ...base, ...patch, id, tags: [] };
          next = [...prev, record];
        } else {
          next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
          record = next.find((b) => b.id === id);
        }
        return next;
      });
      setShowVisitedForm(false);
      setVisitedForm(emptyVisitedForm);
      setVisitedSuggestion(null);
      if (record && !record.detailsFetched) runDetailsFetch(record);
    },
    [visitedForm, visitedSuggestion, persist, runDetailsFetch],
  );

  const saveWishForm = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!wishForm.name.trim()) return;
      const suggestion: Partial<PlaceResult> & { name: string } = {
        name: wishForm.name.trim(),
        neighborhood: wishForm.neighborhood.trim(),
        notes: wishForm.notes.trim(),
        _wishFormId: wishForm.id || undefined,
        _placeIntent: "wishlist",
      };
      setShowWishForm(false);
      await startPlacesLookup(suggestion);
    },
    [wishForm, startPlacesLookup],
  );

  const markVisited = useCallback((b: Bar) => {
    setVisitedSuggestion(b as PlaceResult);
    setVisitedForm({
      id: b.id,
      name: b.name,
      vibe: "",
      value: "",
      service: "",
      food: "",
      drinks: "",
      bathroomBonus: "",
      notes: b.notes || "",
    });
    setShowVisitedForm(true);
  }, []);

  const editVisited = useCallback((b: Bar) => {
    setVisitedSuggestion(null);
    setVisitedForm({
      id: b.id,
      name: b.name,
      vibe: b.vibe == null ? "" : String(b.vibe),
      value: b.value == null ? "" : String(b.value),
      service: b.service == null ? "" : String(b.service),
      food: b.food == null ? "" : String(b.food),
      drinks: b.drinks == null ? "" : String(b.drinks),
      bathroomBonus: b.bathroomBonus == null ? "" : String(b.bathroomBonus),
      notes: b.notes || "",
    });
    setShowVisitedForm(true);
  }, []);

  const removeBar = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((b) => b.id !== id));
    },
    [persist],
  );

  const toggleDisqualify = useCallback(
    (b: Bar) => {
      if (b.disqualified) {
        updateBar(b.id, { disqualified: false, disqualifyReason: "" });
      } else {
        const reason = window.prompt("Why disqualify this one? (optional)", "");
        if (reason === null) return;
        updateBar(b.id, { disqualified: true, disqualifyReason: reason });
      }
    },
    [updateBar],
  );

  const removeCrawlStop = useCallback((name: string) => {
    setCrawlStops((prev) => prev.filter((x) => x.name !== name));
  }, []);

  const closeCrawlModal = useCallback(() => {
    setShowCrawlModal(false);
    setCrawlStops([]);
    setCrawlError(null);
    setCrawlStartInput("");
    setCrawlEnrichingNames(new Set());
  }, []);

  const value: TourContextValue = {
    bars,
    loading,
    connError,
    saveError,
    groupSize,
    setGroupSize,
    visited,
    toTry,
    filteredVisited,
    filteredToTry,
    fetchingIds,

    search,
    setSearch,
    foodMode,
    setFoodMode,

    vibeQuery,
    setVibeQuery,
    fitsGroupOnly,
    setFitsGroupOnly,
    ballerMode,
    setBallerMode,
    exploreMode,
    setExploreMode,
    searchResults,
    searching,
    searchDone,
    enrichingNames,
    runSearch,
    runRandomSearch,
    runNearbySearch,
    addSuggestionToWishlist,
    rankSuggestion,

    showCrawlModal,
    setShowCrawlModal,
    crawlStartInput,
    setCrawlStartInput,
    crawlCount,
    setCrawlCount,
    crawlPlanning,
    crawlStops,
    crawlError,
    replacingIndex,
    crawlEnrichingNames,
    startCrawlPlanning,
    replaceStop,
    removeCrawlStop,
    closeCrawlModal,

    startManualAdd,
    markVisited,
    editVisited,
    removeBar,
    toggleDisqualify,

    showVisitedForm,
    setShowVisitedForm,
    visitedForm,
    setVisitedForm,
    visitedSuggestion,
    showWishForm,
    setShowWishForm,
    wishForm,
    setWishForm,
    showVisitedNamePrompt,
    setShowVisitedNamePrompt,
    visitedNameInput,
    setVisitedNameInput,
    visitedHoodInput,
    setVisitedHoodInput,
    showInfo,
    setShowInfo,
    placesModal,
    setPlacesModal,
    startPlacesLookup,
    confirmPlaceSelection,
    saveVisitedForm,
    saveWishForm,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

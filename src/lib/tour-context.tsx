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
import { rankEntries } from "./ranking";
import { displayDescription } from "./parse";
import { callGemini } from "./gemini";
import {
  buildEnrichmentPrompt,
  DEFERRED_RETRY_DELAY,
  DETAIL_FETCH_CONCURRENCY,
  isSearchEnrichmentOk,
  isUsefulDescription,
  needsEnrichment,
  nextEnrichmentStep,
  shouldQueueBar,
} from "./enrichment";
import { fetchPlaces, fetchBarSuggestions, fetchRandomBar } from "./places";
import { SURPRISE_VIBES } from "./constants";
import type {
  Bar,
  PlaceResult,
  RankingBattle,
  VisitedForm,
  WishForm,
} from "./types";

export type CrawlStop = PlaceResult & { distanceMeters?: number };

// House rules for the "Fits our group" size: default 6, valid range 1–20.
// Every read of the stored value (Firestore snapshot, seed) and every write
// clamps through here, so a stale/out-of-range value can never surface in
// the UI or leak into filtering.
const DEFAULT_GROUP_SIZE = 6;
const clampGroupSize = (n: number) =>
  Math.min(20, Math.max(1, Math.round(n)));

// Bar ids are client-generated and opaque (only ever compared for equality),
// but they must be unique across concurrent clients: a bare Date.now() can
// collide when two users add bars in the same millisecond, and two records
// sharing an id would make later per-id updates/removals hit BOTH bars — one
// user's addition could silently overwrite or delete the other's. Appending a
// random suffix keeps ids collision-resistant even under concurrent adds.
const newBarId = () =>
  `b${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Ranking battle ids follow the same client-generated, collision-resistant
// convention as bar ids.
const newBattleId = () =>
  `battle${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
  /** Saved bars queued or in flight for Gemini detail enrichment — their
   *  cards show "finding details…". */
  detailsPendingIds: Set<string>;
  /** Saved bars waiting on a backoff/deferred retry after a failed
   *  enrichment attempt — their cards show a subtle "will retry" status. */
  detailsDeferredIds: Set<string>;
  /** Saved bars whose enrichment budget is fully exhausted — their cards
   *  show "details unavailable" instead of "finding details…". On the next
   *  page load the repair pass re-queues them automatically. */
  detailsFailedIds: Set<string>;
  /** Search results whose enrichment budget is fully exhausted. */
  searchFailedNames: Set<string>;
  /** Crawl stops whose enrichment budget is fully exhausted. */
  crawlFailedNames: Set<string>;

  // ---- global Bar Battle tiebreaks ----
  rankingBattles: RankingBattle[];
  /** Record (or replace) a pairwise tiebreak. Resolves to true on success. */
  recordBattle: (
    bar1Id: string,
    bar2Id: string,
    winnerId: string,
  ) => Promise<boolean>;

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

/** Normalized venue-name comparison for wishlist/leaderboard deduping:
 *  lowercase, punctuation/apostrophe-insensitive, whitespace-collapsed.
 *  "Angel's Share", "Angel’s Share", and "Angels Share" all compare equal,
 *  while genuinely different names stay distinct. */
const normalizeVenueName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

/** True when two records refer to the same venue: same Google placeId, or
 *  equal normalized names. Keeps the wishlist and leaderboard consistent —
 *  adding a bar to the leaderboard removes its wishlist twin in the same
 *  write (see saveVisitedForm). */
function sameVenue(
  a: { name: string; placeId?: string | null },
  b: { name: string; placeId?: string | null },
): boolean {
  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;
  const na = normalizeVenueName(a.name);
  const nb = normalizeVenueName(b.name);
  return na.length > 0 && na === nb;
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
  // Global Bar Battle tiebreaks, loaded from the same shared document.
  const [rankingBattles, setRankingBattles] = useState<RankingBattle[]>([]);
  const rankingBattlesRef = useRef<RankingBattle[]>([]);
  useEffect(() => {
    rankingBattlesRef.current = rankingBattles;
  }, [rankingBattles]);
  useEffect(() => {
    barsRef.current = bars;
  }, [bars]);
  // Bars whose coordinate backfill already ran this session (success or
  // failure) — a bar that failed gets one fresh attempt on the next full page
  // load, mirroring the enrichment pipeline's recovery model.
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
  // Saved bars currently queued (waiting for a concurrency slot) for Gemini
  // detail enrichment — drives the card's "finding details…" line. The
  // reservation ref below is the source of truth for dedup; these state sets
  // exist only to drive the UI.
  const [detailsPendingIds, setDetailsPendingIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Saved bars between enrichment attempts (a backoff wait or the slow
  // deferred re-attempt pool) — the card shows a subtle "details will
  // retry…" status instead of silently looking abandoned.
  const [detailsDeferredIds, setDetailsDeferredIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Saved bars whose full retry budget (standard → fallback → deferred) is
  // exhausted — the card shows "details unavailable" instead of "finding
  // details…". The page-load repair pass re-queues them on next visit.
  const [detailsFailedIds, setDetailsFailedIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Search results whose enrichment budget is exhausted.
  const [searchFailedNames, setSearchFailedNames] = useState<Set<string>>(
    () => new Set(),
  );
  // Crawl stops whose enrichment budget is exhausted.
  const [crawlFailedNames, setCrawlFailedNames] = useState<Set<string>>(
    () => new Set(),
  );
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
          setRankingBattles((data.rankingBattles as RankingBattle[]) || []);
          // One-time heal: legacy bars load with an empty mapsLink, which hides
          // the card's Map action. Write the backfilled links back so the
          // stored copy is fixed too — idempotent, so the follow-up snapshot
          // finds nothing to change and the loop stops. Runs inside a
          // transaction that re-reads the LATEST bars, so the heal can never
          // clobber an edit another client made after this snapshot arrived.
          // It only ever fills EMPTY links (existing ones are left untouched),
          // so the write is idempotent and safe under transaction retry.
          if (healed.changed) {
            db.runTransaction(async (tx) => {
              const snap = await tx.get(docRef);
              if (!snap.exists) return;
              const healedFresh = healMissingMapsLinks(
                (snap.data()?.bars as Bar[]) || [],
              );
              if (healedFresh.changed) {
                tx.update(docRef, { bars: healedFresh.bars });
              }
            }).catch(() => {});
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
          // Doc missing — seed it inside a transaction that re-checks
          // existence, so two clients seeing "missing" can't race each other:
          // only the first to commit actually creates the document, and a doc
          // created by someone else moments ago is never overwritten by seeds.
          db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) {
              tx.set(docRef, {
                bars: seedBars,
                groupSize: DEFAULT_GROUP_SIZE,
                rankingBattles: [],
              });
            }
          }).catch(() => setConnError(true));
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
      // Optimistic local update so the UI responds instantly (unchanged).
      const prevBars = barsRef.current || [];
      const optimistic =
        typeof updater === "function" ? updater(prevBars) : updater;
      barsRef.current = optimistic;
      setBars(optimistic);
      // Commit inside a transaction that re-reads the LATEST bars from
      // Firestore and applies the SAME updater to that fresh state — never to
      // this client's (possibly stale) copy. A stale array therefore can't
      // overwrite another client's newer edits: the transaction serializes
      // concurrent writers, and Firestore auto-retries it if it loses a race.
      // The updaters are pure functions of their input array (append/filter/
      // map by id), so re-running them against fresh state is deterministic
      // and safe under retry.
      return db
        .runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          const freshBars = (snap.data()?.bars as Bar[]) || [];
          const next =
            typeof updater === "function" ? updater(freshBars) : updater;
          if (snap.exists) {
            tx.update(docRef, { bars: next });
          } else {
            // Defensive: doc missing (shouldn't happen — onSnapshot seeds it).
            tx.set(docRef, { bars: next }, { merge: true });
          }
          return next;
        })
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
      // Optimistic local update so the UI responds instantly (unchanged).
      setBars((prev) => {
        const next = (prev || []).map((b) =>
          b.id === id ? { ...b, ...patch } : b,
        );
        barsRef.current = next;
        return next;
      });
      // Commit inside a transaction that re-reads the LATEST bars and patches
      // only this bar against that fresh state, so a concurrent edit from
      // another client is preserved rather than clobbered by a stale copy.
      // If the bar was removed concurrently, the map is a no-op on the fresh
      // array — the write then just persists the current state, never
      // resurrecting the deleted bar.
      db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const freshBars = (snap.data()?.bars as Bar[]) || [];
        const next = freshBars.map((b) =>
          b.id === id ? { ...b, ...patch } : b,
        );
        if (snap.exists) {
          tx.update(docRef, { bars: next });
        } else {
          // Defensive: doc missing (shouldn't happen — onSnapshot seeds it).
          tx.set(docRef, { bars: next }, { merge: true });
        }
        return next;
      }).catch(() => setSaveError(true));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  // Record (or replace) a global Bar Battle tiebreak. Runs inside a
  // transaction that re-reads the LATEST document: it validates both bars
  // still exist, and dedupes by unordered pair — at most one battle per pair
  // is ever stored, so a re-battle updates the record instead of creating
  // duplicate or conflicting entries. The battle only ever affects ORDERING
  // within a score tie; it never touches `bars` or any score, and the
  // transaction writes only the `rankingBattles` field, so it can't clobber
  // a concurrent bar edit (the same field-scoped guarantee as updateBar).
  // Optimistic local state keeps the leaderboard re-ranking instantly; the
  // dedup by pair makes re-applying the same battle idempotent under retry.
  const recordBattle = useCallback(
    async (bar1Id: string, bar2Id: string, winnerId: string) => {
      const pairKey = (a: string, b: string) => [a, b].sort().join("|");
      const mk = (base: RankingBattle[]): RankingBattle[] => {
        const next = base.filter(
          (x) => pairKey(x.bar1Id, x.bar2Id) !== pairKey(bar1Id, bar2Id),
        );
        next.push({
          id: newBattleId(),
          bar1Id,
          bar2Id,
          winnerId,
          type: "score_tiebreak",
          createdAt: Date.now(),
        });
        return next;
      };
      setRankingBattles(mk(rankingBattlesRef.current));
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) return;
          const freshBars = (snap.data()?.bars as Bar[]) || [];
          const freshBattles =
            (snap.data()?.rankingBattles as RankingBattle[]) || [];
          if (
            !freshBars.some((b) => b.id === bar1Id) ||
            !freshBars.some((b) => b.id === bar2Id)
          ) {
            return; // one of the bars was removed — nothing to record
          }
          tx.update(docRef, { rankingBattles: mk(freshBattles) });
        });
        setSaveError(false);
        return true;
      } catch {
        // Revert the optimistic entry so local state stays in sync with the
        // server (the battle was not recorded).
        setRankingBattles((prev) =>
          prev.filter(
            (x) => pairKey(x.bar1Id, x.bar2Id) !== pairKey(bar1Id, bar2Id),
          ),
        );
        setSaveError(true);
        return false;
      }
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

  // ---- details / vibe-tag enrichment (bounded queue + recoverable retry) ----
  // Details come from the Gemini route, which persists the result itself
  // inside a Firestore transaction (the client never writes them — the live
  // onSnapshot listener surfaces the server's write). Enrichment used to fire
  // one parallel request per un-enriched bar the moment bars loaded: a burst
  // could trip the provider's rate limit, and a single failure (429, 5xx,
  // 10s timeout, malformed JSON, or a too-short description) permanently
  // marked the bar as failed for the whole session — details and vibe tags
  // then stayed missing until a page refresh re-ran the pass with a clean
  // `failedIds`. The queue below keeps the bounded concurrency cap, and the
  // retry schedule (see src/lib/enrichment.ts) NEVER writes a bar off:
  // standard attempts with 5s/15s/30s/60s backoff, then a simpler fallback
  // prompt with 2m/5m/10m backoff, then a slow self-pacing deferred pool
  // (one re-attempt ~every 10 minutes). A bar is only ever "resting" between
  // attempts, never abandoned.
  const detailsQueueRef = useRef<
    Array<{
      bar: Bar;
      attempt: number;
      forceRefresh: boolean;
      usingFallback: boolean;
    }>
  >([]);
  // Single reservation set: every bar that is queued, waiting on a retry
  // timer, deferred, or in flight. The auto-fetch pass (which re-runs on
  // every bars/snapshot change) consults this so a bar can never be
  // double-enqueued — that's what makes onSnapshot updates harmless.
  const detailsReservedRef = useRef<Set<string>>(new Set());
  const detailsInFlightRef = useRef(0);

  // Terminal cleanup: forget every trace of a bar's pipeline state — used on
  // success, when the bar is removed, or when another client enriched it
  // first. Idempotent.
  const releaseDetailState = useCallback((id: string) => {
    detailsReservedRef.current.delete(id);
    setFetchingIds((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setDetailsPendingIds((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setDetailsDeferredIds((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setDetailsFailedIds((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }, []);

  // Pulls the next bars off the queue while under the concurrency cap. Skips
  // entries whose bar was removed or already enriched by another client since
  // they were queued (releasing their reservation so nothing lingers).
  const pumpDetailsQueue = useCallback(() => {
    while (
      detailsInFlightRef.current < DETAIL_FETCH_CONCURRENCY &&
      detailsQueueRef.current.length > 0
    ) {
      const entry = detailsQueueRef.current.shift();
      if (!entry) break;
      const current = barsRef.current?.find((b) => b.id === entry.bar.id);
      if (!current || (!entry.forceRefresh && !needsEnrichment(current))) {
        releaseDetailState(entry.bar.id);
        continue;
      }
      detailsInFlightRef.current += 1;
      setDetailsPendingIds((s) => {
        if (!s.has(entry.bar.id)) return s;
        const n = new Set(s);
        n.delete(entry.bar.id);
        return n;
      });
      setFetchingIds((s) => new Set(s).add(entry.bar.id));
      void fetchBarDetails(
        current,
        entry.forceRefresh,
        entry.attempt,
        entry.usingFallback,
      ).finally(() => {
        detailsInFlightRef.current -= 1;
        pumpDetailsQueue();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One enrichment attempt for a bar. On success the bar's details arrive via
  // the Firestore snapshot (the route persisted them in a transaction) and
  // the card's status clears. On failure the bar is never written off for the
  // session: it schedules a backoff retry, then a simpler fallback prompt
  // phase, and finally the slow deferred pool — see nextEnrichmentStep. Every
  // wait re-checks the latest bars state, so a bar enriched by another client
  // in the meantime is skipped instead of re-called.
  const fetchBarDetails = useCallback(
    async (
      bar: Bar,
      forceRefresh: boolean,
      attempt: number,
      usingFallback: boolean,
    ): Promise<void> => {
      const prompt = buildEnrichmentPrompt(bar, usingFallback);
      // callGemini already returns null on every failure path; the extra
      // catch guarantees a reservation can never strand even if something
      // unexpected throws, keeping the pump's finally the only cleanup.
      const data = await callGemini(prompt, bar.id, forceRefresh).catch(
        () => null,
      );
      if (data) {
        // Enriched — the route persisted the details; the snapshot will
        // surface them. Clear every trace of the pipeline for this bar.
        releaseDetailState(bar.id);
        return;
      }
      // Failed attempt (network error, timeout, rate limit, malformed JSON,
      // or a description too short for the route's >35-char gate). Plan the
      // next step — retry, fallback, or terminal — and keep the bar reserved
      // the whole time so the auto-fetch pass can't restart it at attempt 1.
      const step = nextEnrichmentStep(attempt);
      setFetchingIds((s) => {
        const n = new Set(s);
        n.delete(bar.id);
        return n;
      });
      // After the full bounded retry schedule (standard → fallback), the bar
      // enters a terminal "failed" state instead of the old infinite deferred
      // pool. The page-load repair pass re-queues it on next visit.
      if (step.deferred) {
        // Terminal: release the bar from the pipeline and mark it failed.
        // The UI shows "details unavailable" instead of "finding details…".
        detailsReservedRef.current.delete(bar.id);
        setDetailsPendingIds((s) => {
          if (!s.has(bar.id)) return s;
          const n = new Set(s);
          n.delete(bar.id);
          return n;
        });
        setDetailsDeferredIds((s) => {
          if (!s.has(bar.id)) return s;
          const n = new Set(s);
          n.delete(bar.id);
          return n;
        });
        setDetailsFailedIds((s) => new Set(s).add(bar.id));
        return;
      }
      setDetailsDeferredIds((s) => new Set(s).add(bar.id));
      const waitMs = step.delayMs ?? DEFERRED_RETRY_DELAY;
      setTimeout(() => {
        const current = barsRef.current?.find((b) => b.id === bar.id);
        if (!current) {
          // Removed while we waited — nothing to retry.
          releaseDetailState(bar.id);
          return;
        }
        if (!forceRefresh && !needsEnrichment(current)) {
          // Enriched by another client while we waited — done.
          releaseDetailState(bar.id);
          return;
        }
        setDetailsDeferredIds((s) => {
          const n = new Set(s);
          n.delete(bar.id);
          return n;
        });
        setDetailsPendingIds((s) => new Set(s).add(bar.id));
        detailsQueueRef.current.push({
          bar: current,
          attempt: step.attempt,
          forceRefresh,
          usingFallback: step.usingFallback,
        });
        pumpDetailsQueue();
      }, waitMs);
    },
    [pumpDetailsQueue, releaseDetailState],
  );

  // Public entry: queue a bar for enrichment (used by the auto-fetch pass
  // below and by callers that just added a bar — addSuggestionToWishlist /
  // saveVisitedForm). Goes through the same bounded queue so the concurrency
  // cap and retry logic apply everywhere. A bar already reserved (queued,
  // waiting, deferred, or in flight) is never re-queued.
  const runDetailsFetch = useCallback(
    (bar: Bar, forceRefresh?: boolean) => {
      if (detailsReservedRef.current.has(bar.id)) return;
      if (!forceRefresh && !needsEnrichment(bar)) return;
      detailsReservedRef.current.add(bar.id);
      setDetailsPendingIds((s) => new Set(s).add(bar.id));
      detailsQueueRef.current.push({
        bar,
        attempt: 1,
        forceRefresh: !!forceRefresh,
        usingFallback: false,
      });
      pumpDetailsQueue();
    },
    [pumpDetailsQueue],
  );

  // Page-load repair pass + duplicate guard. Runs on every bars/snapshot
  // change, but the reservation ref means it can never fire a second Gemini
  // request for a bar already in the pipeline. The predicate is
  // needsEnrichment — missing/empty/short/unusable description OR
  // detailsFetched false — NOT just detailsFetched, so a legacy record that
  // claims to be fetched but has no usable description re-enters the queue
  // automatically and gets repaired without being re-added. Also prunes
  // pipeline UI state for bars that vanished or are now enriched, so a card's
  // status disappears the moment the snapshot shows a usable description.
  useEffect(() => {
    if (!bars) return;
    const byId = new Map(bars.map((b) => [b.id, b]));
    const pruneAndRelease = (prev: Set<string>) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        const bar = byId.get(id);
        if (bar && needsEnrichment(bar)) next.add(id);
        else {
          changed = true;
          detailsReservedRef.current.delete(id);
        }
      });
      return changed ? next : prev;
    };
    setFetchingIds(pruneAndRelease);
    setDetailsPendingIds(pruneAndRelease);
    setDetailsDeferredIds(pruneAndRelease);
    bars.forEach((bar) => {
      if (
        shouldQueueBar(bar, {
          pending: detailsReservedRef.current,
          id: bar.id,
        })
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
      const id = isEdit ? s._wishFormId : newBarId();
      // Use the same "usable description" gate as the server (and the
      // enrichment pipeline) so a fresh wishlist add with a real description
      // is marked fetched, while a stub or too-short description is queued
      // for enrichment immediately instead of relying on the repair pass.
      const hasDescription = isUsefulDescription(s.description);
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
        // Preserve Google Places types from the search result so Gemini can
        // ground its description in actual venue classification.
        types: s.types || [],
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

  // ---- search/surprise result enrichment (recoverable retry, no Firestore) ----
  // Fills in a search/surprise result's description, tags, happyHour, and
  // neighborhood in place via Gemini, once its existence is already confirmed
  // by Places. Ephemeral — nothing here is persisted unless the user adds the
  // bar, at which point the same fields carry over via addSuggestionToWishlist
  // (and the saved-bar pipeline takes over if the description still isn't
  // usable). Deliberately called WITHOUT a barId: the API route only does its
  // Firestore lookup/caching when barId is present. The route 200s empty
  // Gemini output as a valid-looking all-empty object, so a truthy response is
  // NOT success — only a usable description is (isSearchEnrichmentOk).
  // Failures retry with the same recoverable schedule as saved bars (standard
  // prompt → fallback prompt → bounded stop), keeping the card in "finding
  // details…" the whole time so a temporarily empty result never looks
  // completed with a blank card. Results are ephemeral, so the retry stops
  // after the fallback phase (no 10-minute deferred polling for a card the
  // user will likely have moved past), and a new search invalidates any
  // pending timers via the epoch.
  const searchResultsRef = useRef<PlaceResult[]>([]);
  useEffect(() => {
    searchResultsRef.current = searchResults;
  }, [searchResults]);
  // Names currently inside a search-result enrichment cycle (in flight or
  // waiting on a retry timer) — prevents double-enqueueing the same result.
  const searchEnrichReservedRef = useRef<Set<string>>(new Set());
  // Bumped at the start of every new search: retry timers capture the epoch
  // they were scheduled under and abort if it changed, so a stale timer can
  // never enrich a result from a later search.
  const searchEpochRef = useRef(0);

  // Called when a fresh search replaces the results — invalidates every
  // pending enrichment cycle (timers abort via the epoch check) and clears
  // the "finding details…" UI state for the old results.
  const resetSearchEnrichment = useCallback(() => {
    searchEpochRef.current += 1;
    searchEnrichReservedRef.current.clear();
    setEnrichingNames(new Set());
    setSearchFailedNames(new Set());
  }, []);

  // One enrichment attempt for a search result. On success the description is
  // merged into the in-memory result; on failure (empty/short/malformed
  // response or a network error) the next step of the shared recoverable
  // schedule is scheduled with a little jitter so several results that fail
  // together don't retry as a synchronized herd. Attempt numbers and the
  // fallback flag travel through the closure (never stored in state), and
  // everything read inside is a ref or a module import, so this callback
  // stays referentially stable and runSearch et al. keep their memoization.
  const runSearchEnrichmentAttempt = useCallback(
    async (
      result: PlaceResult,
      usingFallback: boolean,
      attempt: number,
      epoch: number,
    ): Promise<void> => {
      const name = result.name;
      if (epoch !== searchEpochRef.current) return; // superseded by a new search
      const prompt = buildEnrichmentPrompt(result, usingFallback);
      const data = await callGemini(prompt, null, false).catch(() => null);
      if (epoch !== searchEpochRef.current) return;
      const info = (Array.isArray(data) ? data[0] : data) as
        | (PlaceResult & { description?: string })
        | undefined;
      // isSearchEnrichmentOk already implies info is non-null, but it's a plain
      // boolean function, so TS needs the explicit `info &&` to narrow.
      if (info && isSearchEnrichmentOk(info)) {
        setSearchResults((prev) =>
          prev.map((r) =>
            r.name === name
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
        searchEnrichReservedRef.current.delete(name);
        setEnrichingNames((s) => {
          const n = new Set(s);
          n.delete(name);
          return n;
        });
        return;
      }
      // Failed (empty/short/malformed description or a network error). Plan
      // the next retry — standard → fallback → bounded stop.
      const step = nextEnrichmentStep(attempt);
      if (step.deferred) {
        // Search results are ephemeral: after the full bounded schedule the
        // result shows "details unavailable" instead of polling forever
        // for a card the user will likely have moved past.
        searchEnrichReservedRef.current.delete(name);
        setEnrichingNames((s) => {
          const n = new Set(s);
          n.delete(name);
          return n;
        });
        setSearchFailedNames((s) => new Set(s).add(name));
        return;
      }
      // ±500ms jitter so concurrently-failing results don't retry in lockstep.
      const jitter = Math.floor(Math.random() * 1000) - 500;
      const waitMs = (step.delayMs ?? 60000) + jitter;
      setTimeout(() => {
        if (epoch !== searchEpochRef.current) return;
        const current = searchResultsRef.current.find((r) => r.name === name);
        if (!current) {
          // Result removed (added to wishlist, or replaced by a new search).
          searchEnrichReservedRef.current.delete(name);
          setEnrichingNames((s) => {
            const n = new Set(s);
            n.delete(name);
            return n;
          });
          return;
        }
        if (isSearchEnrichmentOk(current)) {
          // Enriched in the meantime — done.
          searchEnrichReservedRef.current.delete(name);
          setEnrichingNames((s) => {
            const n = new Set(s);
            n.delete(name);
            return n;
          });
          return;
        }
        void runSearchEnrichmentAttempt(
          current,
          step.usingFallback,
          step.attempt,
          epoch,
        );
      }, waitMs);
    },
    [],
  );

  const enrichSearchResult = useCallback(
    (result: PlaceResult) => {
      const name = result.name;
      if (searchEnrichReservedRef.current.has(name)) return;
      searchEnrichReservedRef.current.add(name);
      setEnrichingNames((s) => new Set(s).add(name));
      void runSearchEnrichmentAttempt(result, false, 1, searchEpochRef.current);
    },
    [runSearchEnrichmentAttempt],
  );

  // ---- crawl-stop enrichment (recoverable retry, no Firestore) ----
  // Crawl stops are enriched in place via Gemini like search results —
  // ephemeral, never persisted unless the user adds the stop. Same strict
  // success gate (isSearchEnrichmentOk — a truthy object is NOT success),
  // same recoverable schedule (standard prompt → fallback prompt → bounded
  // stop), same reservation ref for dedup, and a crawl epoch so a stale
  // retry timer from a previous crawl plan can never enrich a stop from a
  // newer one. Stops are matched by name: runCrawlPlan dedupes names within
  // a plan (usedNames) and replaceStop picks a replacement guaranteed
  // distinct from every current stop name, so a name identifies one stop at
  // a time.
  const crawlStopsRef = useRef<CrawlStop[]>([]);
  useEffect(() => {
    crawlStopsRef.current = crawlStops;
  }, [crawlStops]);
  // Names inside a crawl-stop enrichment cycle (in flight or waiting on a
  // retry timer) — prevents double-enqueueing the same stop.
  const crawlEnrichReservedRef = useRef<Set<string>>(new Set());
  // Bumped whenever a NEW crawl plan replaces every stop (runCrawlPlan):
  // retry timers capture the epoch they were scheduled under and abort if it
  // changed, so a stale timer can never touch a stop from a later plan.
  // replaceStop / removeCrawlStop deliberately do NOT bump it — a
  // replaced/removed stop's name vanishes from crawlStops, so its pending
  // timers abort via the name-miss path instead.
  const crawlEpochRef = useRef(0);

  // Called when a fresh crawl plan replaces every stop — invalidates all
  // pending enrichment cycles (timers abort via the epoch check) and clears
  // the "finding details…" UI state for the old stops.
  const resetCrawlEnrichment = useCallback(() => {
    crawlEpochRef.current += 1;
    crawlEnrichReservedRef.current.clear();
    setCrawlEnrichingNames(new Set());
    setCrawlFailedNames(new Set());
  }, []);

  // One enrichment attempt for a crawl stop — mirrors
  // runSearchEnrichmentAttempt exactly (same gate, same schedule, same
  // reservation lifecycle). On success the description is merged into the
  // in-memory stop; on failure (empty/short/malformed response or a network
  // error) the next step of the shared recoverable schedule is scheduled
  // with a little jitter so several stops that fail together don't retry in
  // lockstep. Attempt numbers and the fallback flag travel through the
  // closure (never stored in state), and everything read inside is a ref or
  // a module import, so this callback stays referentially stable.
  const runCrawlEnrichmentAttempt = useCallback(
    async (
      stop: CrawlStop,
      usingFallback: boolean,
      attempt: number,
      epoch: number,
    ): Promise<void> => {
      const name = stop.name;
      if (epoch !== crawlEpochRef.current) return; // superseded by a new plan
      const prompt = buildEnrichmentPrompt(stop, usingFallback);
      const data = await callGemini(prompt, null, false).catch(() => null);
      if (epoch !== crawlEpochRef.current) return;
      const info = (Array.isArray(data) ? data[0] : data) as
        | (CrawlStop & { description?: string })
        | undefined;
      // isSearchEnrichmentOk already implies info is non-null, but it's a plain
      // boolean function, so TS needs the explicit `info &&` to narrow.
      if (info && isSearchEnrichmentOk(info)) {
        setCrawlStops((prev) =>
          prev.map((r) =>
            r.name === name
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
        crawlEnrichReservedRef.current.delete(name);
        setCrawlEnrichingNames((s) => {
          const n = new Set(s);
          n.delete(name);
          return n;
        });
        return;
      }
      // Failed (empty/short/malformed description or a network error). Plan
      // the next retry — standard → fallback → bounded stop.
      const step = nextEnrichmentStep(attempt);
      if (step.deferred) {
        // Crawl stops are ephemeral: after the full bounded schedule the
        // stop shows "details unavailable" instead of polling forever
        // for a stop the user will likely have replaced or closed.
        crawlEnrichReservedRef.current.delete(name);
        setCrawlEnrichingNames((s) => {
          const n = new Set(s);
          n.delete(name);
          return n;
        });
        setCrawlFailedNames((s) => new Set(s).add(name));
        return;
      }
      // ±500ms jitter so concurrently-failing stops don't retry in lockstep.
      const jitter = Math.floor(Math.random() * 1000) - 500;
      const waitMs = (step.delayMs ?? 60000) + jitter;
      setTimeout(() => {
        // Epoch changed (a new plan replaced every stop) — resetCrawlEnrichment
        // already cleared the reservations and UI state at bump time, so there
        // is nothing to release on this abort path.
        if (epoch !== crawlEpochRef.current) return;
        const current = crawlStopsRef.current.find((r) => r.name === name);
        if (!current) {
          // Stop removed (replaced, removed, or a new plan) — nothing to retry.
          crawlEnrichReservedRef.current.delete(name);
          setCrawlEnrichingNames((s) => {
            const n = new Set(s);
            n.delete(name);
            return n;
          });
          return;
        }
        if (isSearchEnrichmentOk(current)) {
          // Enriched in the meantime — done.
          crawlEnrichReservedRef.current.delete(name);
          setCrawlEnrichingNames((s) => {
            const n = new Set(s);
            n.delete(name);
            return n;
          });
          return;
        }
        void runCrawlEnrichmentAttempt(
          current,
          step.usingFallback,
          step.attempt,
          epoch,
        );
      }, waitMs);
    },
    [],
  );

  const enrichCrawlStop = useCallback(
    (stop: CrawlStop) => {
      const name = stop.name;
      // ---- saved-bar reuse: if this venue is already in the shared bars list
      // with a usable description, seed the stop and skip Gemini entirely.
      // placeId is the strongest identity signal; sameVenue handles normalized
      // name equality (punctuation/apostrophe/case).  If a saved bar matches
      // but has no usable description, we still fall through to Gemini.
      const saved = (barsRef.current || []).find(
        (b) =>
          (stop.placeId && b.placeId && stop.placeId === b.placeId) ||
          sameVenue(b, stop),
      );
      if (saved && isUsefulDescription(saved.description)) {
        setCrawlStops((prev) =>
          prev.map((r) =>
            r.name === name
              ? {
                  ...r,
                  description: saved.description || r.description,
                  tags: saved.tags && saved.tags.length ? saved.tags : r.tags,
                  happyHour: saved.happyHour || r.happyHour,
                  neighborhood: saved.neighborhood || r.neighborhood,
                  address: saved.address || r.address,
                  latitude: saved.latitude ?? r.latitude,
                  longitude: saved.longitude ?? r.longitude,
                  mapsLink: saved.mapsLink || r.mapsLink,
                }
              : r,
          ),
        );
        return;
      }
      // ---- fall through to Gemini enrichment ----
      if (crawlEnrichReservedRef.current.has(name)) return;
      crawlEnrichReservedRef.current.add(name);
      setCrawlEnrichingNames((s) => new Set(s).add(name));
      void runCrawlEnrichmentAttempt(stop, false, 1, crawlEpochRef.current);
    },
    [runCrawlEnrichmentAttempt],
  );

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
      // A fresh plan replaces every stop — invalidate any pending enrichment
      // timers from a previous plan so they can't touch the new stops, then
      // enqueue the new ones.
      resetCrawlEnrichment();
      stops.forEach((s) => enrichCrawlStop(s));
    },
    [crawlCount, bars, seenNames, enrichCrawlStop, resetCrawlEnrichment],
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
    // Ranked bars first: score desc, exact ties broken by global Bar Battle
    // results (then a deterministic name/id fallback). Disqualified bars
    // stay at the bottom, ordered among themselves by score — the exact
    // behavior the old comparator produced.
    const ranked = list.filter((b) => !b.disqualified);
    const dq = list.filter((b) => b.disqualified);
    const ordered = rankEntries(
      ranked.map((b) => ({
        item: b,
        score: foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b),
      })),
      rankingBattles,
    );
    dq.sort(
      (a, b) =>
        (foodMode === "with" ? avgWithFood(b) || 0 : avgWithoutFood(b) || 0) -
        (foodMode === "with" ? avgWithFood(a) || 0 : avgWithoutFood(a) || 0) ||
        a.name.localeCompare(b.name),
    );
    return [...ordered, ...dq];
  }, [visited, search, foodMode, rankingBattles]);

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
    resetSearchEnrichment();
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
    resetSearchEnrichment,
  ]);

  const runRandomSearch = useCallback(async () => {
    resetSearchEnrichment();
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
  }, [
    bars,
    seenNames,
    groupSize,
    ballerMode,
    exploreMode,
    enrichSearchResult,
    resetSearchEnrichment,
  ]);

  const runNearbySearch = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("Your browser doesn't support location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        resetSearchEnrichment();
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
  }, [bars, seenNames, enrichSearchResult, resetSearchEnrichment]);

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
      const id = visitedForm.id || newBarId();
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
          const baseRecord: Bar = visitedSuggestion
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
          // Wishlist consistency, handled in ONE place for every way a bar can
          // reach the leaderboard (manual add, Discover "I visited", crawl "I
          // visited"): if the same venue already sits on the wishlist, this
          // same atomic write removes it from the wishlist. Matching runs
          // against the FRESH array the persist transaction read (never this
          // client's possibly-stale copy), by placeId or normalized name, so
          // "Angel's Share" vs "Angels Share" still match and a concurrent
          // wishlist edit is never clobbered. The wishlist record's enriched
          // details are carried into the new leaderboard entry so nothing is
          // lost. Idempotent: no match → the write is a plain append, exactly
          // as before.
          const wishlistMatch = prev.find(
            (b) => b.status === "to-try" && sameVenue(b, baseRecord),
          );
          const finalRecord: Bar = wishlistMatch
            ? {
                ...baseRecord,
                neighborhood:
                  baseRecord.neighborhood || wishlistMatch.neighborhood || "",
                description:
                  baseRecord.description || wishlistMatch.description || "",
                tags: baseRecord.tags.length
                  ? baseRecord.tags
                  : wishlistMatch.tags,
                happyHour:
                  baseRecord.happyHour || wishlistMatch.happyHour || "",
                capacity:
                  baseRecord.capacity ?? wishlistMatch.capacity ?? null,
                address: baseRecord.address || wishlistMatch.address || "",
                latitude:
                  baseRecord.latitude ?? wishlistMatch.latitude ?? null,
                longitude:
                  baseRecord.longitude ?? wishlistMatch.longitude ?? null,
                placeId: baseRecord.placeId || wishlistMatch.placeId || null,
                mapsLink: baseRecord.mapsLink || wishlistMatch.mapsLink || "",
                detailsFetched:
                  baseRecord.detailsFetched || wishlistMatch.detailsFetched,
              }
            : baseRecord;
          record = finalRecord;
          next = [...prev, finalRecord].filter(
            (b) => !(b.status === "to-try" && sameVenue(b, finalRecord)),
          );
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
    detailsPendingIds,
    detailsDeferredIds,
    detailsFailedIds,
    searchFailedNames,
    crawlFailedNames,

    rankingBattles,
    recordBattle,

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

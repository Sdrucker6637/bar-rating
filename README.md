# Tour de Alcoholism

A shared, collaborative drinking journal for a friend group: rank every bar you've survived, build a wishlist, discover new spots, plan walking crawls, and split the bill — all in one dark, editorial-styled web app.

> **Documentation status:** written against the current working tree (commit `e42bf60`, August 2026). Costs/pricing checked **August 14, 2026** against Google's published pages; assumptions are labeled throughout.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Application Architecture](#application-architecture)
4. [Project Structure](#project-structure)
5. [How the Application Works](#how-the-application-works)
6. [Firebase](#firebase)
7. [APIs & External Services](#apis--external-services)
8. [AI / LLM Usage](#ai--llm-usage)
9. [AI Cost Estimates](#ai-cost-estimates)
10. [API Cost Estimates](#api-cost-estimates)
11. [Estimated Monthly Operating Cost](#estimated-monthly-operating-cost)
12. [Environment Variables & Secrets](#environment-variables--secrets)
13. [Data Flow](#data-flow)
14. [State Management](#state-management)
15. [Business Logic](#business-logic)
16. [Authentication & Authorization](#authentication--authorization)
17. [Error Handling](#error-handling)
18. [Testing](#testing)
19. [Local Development](#local-development)
20. [Deployment](#deployment)
21. [Performance & Scaling](#performance--scaling)
22. [Security Considerations](#security-considerations)
23. [Known Limitations](#known-limitations)
24. [Technical Debt / Recommended Improvements](#technical-debt--recommended-improvements)
25. [Cost Optimization Opportunities](#cost-optimization-opportunities)
26. [Quick Reference](#quick-reference)

---

## Overview

**What it is:** a private, shared "bar ranking" app for a real friend group. There is **no login** — the entire bar dataset lives in a single shared Firestore document, and anyone with the URL can read and edit it.

**The primary user experience:**

- **Leaderboard** (`/leaderboard`) — every rated bar ranked by its average score (vibe, value, service, food, drinks). Ties are broken by a global "Bar Battle" vote system (⚔️), not by random order. The current #1 gets a "House Record" hero card.
- **Discover** (`/find`) — search by vibe ("cozy neighborhood", "speakeasy", …), roll the dice with **Surprise Us**, find bars **Nearby** using the browser's geolocation, and add bars to the wishlist by name. Every result is verified against **Google Places** and enriched with AI-written flavor text (description, tags, happy hour).
- **Tour Map** (`/map`) — a Leaflet heat map of visited bars (colored by score) and wishlist clusters.
- **Split the Bill** (`/split`) — a wizard: add the crew, upload receipt screenshots/photos, and **Gemini vision** extracts the line items; assign items to people (split evenly or by hand), then text each person their total via the `sms:` URL scheme.

**The problem it solves:** keeping a running, opinionated, shared record of bar nights — ratings, wishlist, plans, and money owed — without any accounts or admin. It is a small app (a few dozen bars, a handful of users) that is deliberately built around one shared Firestore document and realtime sync, with Google/AI services layered on top for discovery and convenience.

**Main features:** rating & ranking bars; global tiebreaker battles; search/surprise/nearby discovery; Google Places verification with ranked exact-match lookup; AI descriptions; crawl planning (a random walk of nearby bars); bill splitting with AI receipt parsing; SMS summaries; a score-colored heat map.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 14.2** (App Router) | `reactStrictMode: false`; ESLint disabled during builds (`ignoreDuringBuilds: true` in `next.config.mjs`) |
| Language | **TypeScript 5.5** | `tsc --noEmit` is the typecheck gate |
| UI | **React 18.3** | Client Components; no server components except thin page shells |
| Styling | **Tailwind CSS 3.4** + custom CSS | Dark "walnut & brass" theme (see `tailwind.config.ts`); fonts: Fraunces (serif), Inter (sans), IBM Plex Mono (mono) via Google Fonts |
| Database | **Firebase Firestore** | Only Firebase service used; client web SDK (`firebase/compat`) + `firebase-admin` in one API route |
| Map | **Leaflet 1.9** + **leaflet.heat** 0.2 | CARTO dark tiles; heat plugin loaded from unpkg at runtime |
| Search/geo | **Google Places API (New)** — `places:searchText` | Server-side, verified lookups + discovery |
| AI | **Google Gemini API** (`generativelanguage.googleapis.com`) | Text generation + vision (receipts); default model `gemini-3.5-flash-lite` |
| Geocoding fallback | **OpenStreetMap Nominatim** | Client-side fallback for coordinate backfill |
| Hosting | **Vercel** | `vercel.json` → `{ "framework": "nextjs" }` |
| Auth | **None** | No authentication library, no Firebase Auth |
| Analytics | **None** | No analytics code found |
| Testing | **None** | No test framework, no test files, no `test` script |
| Other | `splitMath.ts` (cents-exact splitting), hand-rolled SVG `Icon` set | No icon library |

Not present (do not assume): Firebase Auth, Firebase Storage, Firebase Hosting, Cloud Functions, Redis/other caches, ORMs, state libraries (Redux/Zustand), ESLint config, CI config, Sentry.

---

## Application Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              Browser (React)             │
                    │  Shell / Leaderboard / Find / Map / Split │
                    └───────────────┬─────────────────────────┘
                                    │
            realtime Firestore      │  POST /api/* (JSON)
            (onSnapshot, web SDK)   │
                    ▼               ▼
        ┌─────────────────┐   ┌──────────────────────────┐
        │    Firestore    │   │   Next.js API Routes     │
        │  (single doc +  │   │  /api/places             │
        │   cache docs)   │   │  /api/gemini             │
        │                 │   │  /api/split-receipt      │
        └─────────────────┘   └───────────┬──────────────┘
                                          │ (server-side fetch)
                                          ▼
                            ┌─────────────────────────────┐
                            │  Google Places API (New)    │
                            │  Google Gemini API          │
                            │  OpenStreetMap Nominatim*   │
                            └─────────────────────────────┘
       (* Nominatim is called directly from the client, not an API route)
```

**Layers:**

- **Client (React):** all views are client components. `TourProvider` (in `src/lib/tour-context.tsx`) is the single source of UI state; it subscribes to the shared Firestore document and exposes actions (add/remove/update bars, record battles, run searches, manage modals). Search and AI calls are proxied through Next API routes.
- **API routes (Next.js serverless functions on Vercel):**
  - `/api/places` — Google Places Text Search, caching, exact-match ranking, discovery filtering.
  - `/api/gemini` — Gemini text generation for bar descriptions; persists results to Firestore in a transaction when given a `barId`.
  - `/api/split-receipt` — Gemini vision parse of receipt images (stateless; no Firestore).
- **External services:** Google Places (verification/discovery), Google Gemini (flavor text + receipt parsing), Nominatim (coordinate fallback), CARTO tiles (map basemap), Google Fonts, unpkg (heat plugin).
- **Firebase:** the app's source of truth — one shared document per the whole app plus a search cache collection.

---

## Project Structure

```text
/
├── next.config.mjs            # Next config (strict mode off, ESLint skipped)
├── tailwind.config.ts         # Full design system (colors, type scale, shadows)
├── vercel.json                # Vercel framework preset (nextjs)
├── package.json               # Scripts: dev / build / start / typecheck
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout: fonts, metadata, <TourProvider><Shell/>
│   │   ├── page.tsx           # "/" → redirect to /leaderboard
│   │   ├── globals.css        # Custom CSS (atmosphere, scrollbars, map popups, keyframes)
│   │   ├── leaderboard/page.tsx
│   │   ├── find/page.tsx
│   │   ├── map/page.tsx
│   │   ├── split/page.tsx + SplitClient.tsx   # Split wizard state machine
│   │   └── api/
│   │       ├── places/route.ts        # Google Places lookup + Firestore cache
│   │       ├── gemini/route.ts        # Gemini description writer + transactional save
│   │       └── split-receipt/route.ts # Gemini vision receipt parser
│   ├── components/
│   │   ├── Shell.tsx          # Header, nav tabs, global save-error banner, modal mounts
│   │   ├── LeaderboardView.tsx, BarCard.tsx, FindView.tsx, SuggestionCard.tsx,
│   │   │   SearchPanel.tsx, MapView.tsx, SplitBillView.tsx, EmptyState.tsx,
│   │   │   LoadingScreen.tsx, TabIntro.tsx, Icon.tsx
│   │   └── modals/            # Modal, BattleModal, CrawlModal, InfoModal,
│   │       └──                # PlacesModal, VisitedFormModal, VisitedNamePromptModal, WishFormModal
│   └── lib/
│       ├── tour-context.tsx   # ★ The heart of the app: Firestore sync + all actions
│       ├── firebase.ts        # Firebase web SDK init (hardcoded public config)
│       ├── constants.ts       # base bar shape, DOC_PATH, vibes, walk constants, heat gradients
│       ├── types.ts           # Bar, RankingBattle, PlaceResult, split types
│       ├── seed.ts            # Seed bars (only used when the Firestore doc is missing)
│       ├── scoring.ts         # avgWithFood / avgWithoutFood / fmt / haversine / walk time
│       ├── ranking.ts         # ★ Pure ranking engine: rankEntries, pendingBattlePairs, …
│       ├── places.ts          # Client wrapper for /api/places + 10-min session cache
│       ├── gemini.ts          # Client wrapper for /api/gemini + session cache
│       ├── parse.ts           # JSON extraction + description unwrapping
│       ├── splitMath.ts       # Largest-remainder cents/unit distribution
│       └── ui.ts              # Shared Tailwind class strings (buttons, chips, cards)
└── .env.local                 # Local secrets (gitignored; names only: see §Env Vars)
```

**Most important file:** `src/lib/tour-context.tsx` (~1,400 lines). It owns the Firestore subscription, all optimistic state, all write transactions, search orchestration, enrichment scheduling, and the modal system. Everything else is a view or a helper.

---

## How the Application Works

### 0. Boot & shared-state sync (every page)

1. `layout.tsx` mounts `TourProvider` + `Shell`.
2. `TourProvider` attaches `db.collection("tourDeAlcoholism").doc("sharedList").onSnapshot(...)` — a **realtime listener** that fires on every change from any client.
3. On the first snapshot:
   - If the doc exists, bars, `rankingBattles`, and `groupSize` are loaded into state. Legacy bars missing `mapsLink` are healed in-memory and (once, in a transaction) written back.
   - If the doc is **missing**, it is seeded inside a transaction with `seedBars` (24 hardcoded bars), `groupSize: 6`, `rankingBattles: []`.
   - Any bar with `detailsFetched: false` gets an automatic **Gemini enrichment** call (`runDetailsFetch`).
   - Any bar without coordinates triggers `healBarCoordinates` (Places exact lookup → Nominatim fallback).
4. `Shell` shows a loading screen until the first snapshot; on snapshot errors it falls back to showing the seed data plus a connection-error flag.

### 1. Leaderboard & Bar Battles

1. User opens `/leaderboard`. `LeaderboardView` computes `filteredVisited` (search/food-mode filter, disqualified pushed to the bottom) and passes each bar through `rankEntries`.
2. **Ranking order** = score (desc) → recorded Bar Battle results (only within exact score ties) → deterministic name/id fallback.
3. If two or more ranked bars share a score and that adjacent pair has **no battle recorded**, `pendingBattlePairs` lists it. The first time this happens in a browser session, the **BattleModal auto-opens**; afterwards a "⚔️ Settle N ties" chip stays available.
4. Picking a contender calls `recordBattle` (transactional, deduped by unordered pair) — the leaderboard re-ranks instantly via optimistic state and the server snapshot.
5. Card actions: name → Maps link; **Map**; **Edit** (score form); **Disqualify/Un-disqualify** (prompt for a reason); **Remove** (with an in-app confirmation dialog).

### 2. Adding a bar you visited (manual)

1. "+ Add a bar you visited" → `VisitedNamePromptModal` (name + optional neighborhood).
2. `startPlacesLookup` → POST `/api/places` with `exactLookup: true` → `PlacesModal` shows ranked Google matches (or "No matching open bar found…" with an **Add anyway** escape hatch).
3. Selecting a match calls `confirmPlaceSelection` → `VisitedFormModal` pre-filled with the name.
4. Saving runs `persist` (transactional append), then triggers Gemini enrichment if the bar has no description yet.

### 3. Wishlist

1. "+ Add to wishlist by name" → `WishFormModal` (name, neighborhood, notes).
2. Same Places verification flow (`_placeIntent: "wishlist"`), then `addSuggestionToWishlist` persists the bar with `status: "to-try"`.
3. Wishlist cards support **Map / I visited** (moves the bar into the visited flow) and **Remove**; the "Fits our group" filter hides wishlist bars whose stored capacity is below the group size.

### 4. Discovery (Find Bars / Surprise Us / Nearby)

1. **Find Bars** — vibe query (or neighborhood) → `fetchBarSuggestions` → `/api/places` (normal mode, `includedType: "bar"`, NYC-center bias, price filter unless Baller Mode) → up to 4 results, each immediately enriched via Gemini (ephemeral — not saved until the user adds one).
2. **Surprise Us** — picks a random vibe from `SURPRISE_VIBES`, calls Places with `noCache: true`, returns one random fresh result.
3. **Nearby** — browser geolocation → `/api/places` with the device's center and an 800 m radius → one random result.
4. All results exclude bars already saved (`seenNames` session set + saved bar names).

### 5. Crawl planning

1. "Plan a Crawl" → optionally name a starting bar (Places exact lookup) or start automatically with a random bar.
2. `runCrawlPlan` walks: from each stop, Places searches `"great bar"` near that stop's coordinates (900 m radius), filters to ≤600 m straight-line, picks a random unused candidate, repeats until the requested count (default 3, max 8) or no candidates.
3. Each stop is Gemini-enriched; stops can be **Replaced** (a nearby random swap) or removed. Walk times between stops are estimated (`estimateWalkMinutes` = beeline × 1.3 detour / 1.34 m/s).

### 6. Split the Bill

1. **Names** — add unique people (validation: no duplicates).
2. **Places count** — 1–10 tabs, one per bar.
3. **Receipts** — upload screenshots/photos per place; each is parsed by `/api/split-receipt` (Gemini vision, one call per place with all its images). Parsed items merge (never duplicate) into the place's items; the place name is auto-filled unless the user edited it.
4. **Tabs** — per place: pick the crew who were there, assign each item (per-person chips, `+/-` unit steppers for multi-unit items, **Split evenly**); cents-exact per-person totals are computed with `distributeCents` (largest-remainder).
5. **Summary** — per-place totals and a grand total; **Send text** builds a summary and opens the `sms:` URL with it pre-filled.
6. Nothing in the split flow touches Firestore — it is entirely client-side + Gemini API.

### 7. Tour Map

1. Leaflet map centered on NYC; CARTO dark tiles.
2. Visited mode: heat layer + circle markers; each marker's color is interpolated along the visited gradient by the bar's score normalized to the currently displayed range.
3. Wishlist mode: single mint color, cluster density.
4. Bars without coordinates are skipped (they're healed automatically on load — see Business Logic).

---

## Firebase

### Services used

- **Firestore** — the only Firebase service. Two access paths:
  1. **Client web SDK** (`firebase/compat` + `firebase/compat/firestore`) in `src/lib/firebase.ts`, used for the realtime `onSnapshot` subscription and all read/write transactions.
  2. **Firebase Admin SDK** (`firebase-admin`) in `src/app/api/gemini/route.ts`, used to merge Gemini-written details into the shared document inside a server-side transaction.
  3. **Firestore REST API** (no SDK) in `src/app/api/places/route.ts` for the search cache (read via `GET`, write via `PATCH` to `firestore.googleapis.com/v1/...`).

- **Not used:** Firebase Authentication, Storage, Hosting, Cloud Functions, Remote Config, Analytics.

### Configuration

- Client: the entire web config object (apiKey, authDomain, projectId `bar-rating`, storageBucket, messagingSenderId, appId) is **hardcoded in `src/lib/firebase.ts`** and initialized once (`firebase.initializeApp` guarded by `!firebase.apps.length`).
- Server: `firebase-admin` is initialized lazily in `ensureAdmin()` from `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (the private key's literal `\n` sequences are converted to real newlines). It returns `null` (no throw) when env vars are absent, so `next build` succeeds without them.
- Places cache: reads/writes the Firestore REST endpoint directly, keyed by `FIREBASE_PROJECT_ID`.

### Firestore structure

There are **two collections**.

#### Collection: `tourDeAlcoholism` — document: `sharedList`

The entire app's data. A single document holding an array of bars plus small metadata fields.

```text
Document: tourDeAlcoholism/sharedList
{
  bars: Bar[],               // required on fresh docs; empty/missing tolerated on legacy docs
  groupSize: number,         // optional; default 6, clamped 1–20
  rankingBattles: RankingBattle[]  // optional (added 2026); defaults to []
}
```

**Bar** (field — type — notes):

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Client-generated `b<timestamp>_<random>` (collision-resistant across concurrent clients) |
| `name` | string | yes | Display name |
| `status` | `"visited" \| "to-try"` | yes | Leaderboard vs wishlist |
| `vibe` | number \| null | no | 0–10 rating (0.5 steps typical) |
| `value` | number \| null | no | 0–10 |
| `service` | number \| null | no | 0–10 |
| `food` | number \| null | no | 0–10 |
| `drinks` | number \| null | no | 0–10 |
| `bathroomBonus` | number | yes (0 default) | Extra points shown separately |
| `notes` | string | yes ("" default) | Free text ("20/10, hot guy there") |
| `neighborhood` | string | yes ("" default) | E.g. "East Village" |
| `description` | string | yes ("" default) | Gemini-generated flavor text |
| `tags` | string[] | yes ([] default) | 3–5 lowercase vibe words from Gemini |
| `happyHour` | string | yes ("" default) | E.g. "Daily specials available" |
| `capacity` | number \| null | no | Used by "Fits our group" filter |
| `mapsLink` | string | yes ("" default) | Google Maps URL; healed for legacy bars |
| `address` | string | yes ("" default) | From Google Places |
| `latitude` | number \| null | no | From Places or Nominatim backfill |
| `longitude` | number \| null | no | Same |
| `placeId` | string \| null | no | Google Place ID |
| `detailsFetched` | boolean | yes (false default) | Whether Gemini description exists (enables caching) |
| `disqualified` | boolean | yes (false default) | Removes from ranking (stays at bottom) |
| `disqualifyReason` | string | yes ("" default) | Optional reason shown on card |

**RankingBattle** (one global tiebreak decision):

| Field | Type | Meaning |
|---|---|---|
| `id` | string | `battle<timestamp>_<random>` |
| `bar1Id` / `bar2Id` | string | The two tied contenders |
| `winnerId` | string | One of the two (winner ranks higher) |
| `type` | `"score_tiebreak"` | Fixed |
| `createdAt` | number | Client `Date.now()` |

At most **one battle per unordered pair** — recording a new one replaces the old (see Business Logic).

#### Collection: `placesSearchCache`

One document per normalized Google search query — a shared, cross-user cache.

```text
Document: placesSearchCache/<fnv1a-hash-key>
{
  places: RawPlace[],     // NON-EMPTY only; raw (unfiltered) Google results
  timestamp: number,      // Date.now() at write time
  query: string           // the exact textQuery that produced it
}
```

- Document ID: `slug-normal|explore-mode|center-key-fnv1a_hash` (see `cacheKeyFor` in the places route).
- **Never** contains `places: []` (a legacy bug that cached empties was fixed — empty entries are treated as cache misses and overwritten).
- `RawPlace` shape: `{ displayName, formattedAddress, latitude, longitude, placeId, mapsLink, businessStatus, priceLevel, types, rating }`.

### Reads / writes / queries / transactions

| Operation | Where | Mechanism |
|---|---|---|
| Realtime subscription | `tour-context.tsx` | `docRef.onSnapshot` — every client gets every change |
| Initial seed (doc missing) | `tour-context.tsx` | `db.runTransaction` — re-checks existence, only the first client to commit writes `seedBars` |
| All bar mutations (add / update / remove) | `persist` / `updateBar` in `tour-context.tsx` | `db.runTransaction` — reads the **latest** `bars` in the transaction, applies a pure updater, `tx.update({ bars })` |
| Map-link heal | `tour-context.tsx` | Transaction; only fills empty links (idempotent) |
| `recordBattle` | `tour-context.tsx` | Transaction; validates both bars exist, writes **only** the `rankingBattles` field (field-scoped, can't clobber bar edits) |
| `groupSize` change | `tour-context.tsx` | `docRef.set({ groupSize }, { merge: true })` — field-scoped, never touches `bars` |
| Gemini detail merge | `api/gemini/route.ts` | Server-side `firebase-admin` transaction — re-reads the doc at commit time, patches only the one bar, throws `BAR_REMOVED` if the bar vanished |
| Search cache read/write | `api/places/route.ts` | Firestore REST `GET` / `PATCH` with **no auth header** (see Security) |

**Concurrency model (important):** all whole-`bars` writes are inside Firestore transactions that **re-read the document at commit time** and derive the new array from that fresh state — never from a client's possibly-stale local copy. Firestore auto-retries transactions; the updaters are pure functions, so retries are deterministic. This was a deliberate fix for a stale-array-overwrite bug (Client A overwriting Client B's edits) and must be preserved. The Gemini route likewise re-reads inside its transaction rather than writing the pre-request snapshot.

### Firebase security

- **No `firestore.rules` file exists in this repository** — the live rules cannot be verified from the codebase (marked Unknown).
- However, the implementation **implies open (public) rules**: the client writes with the web SDK (no auth), and the Places cache route writes via the REST API **without any authentication header**. Both only work if Firestore is publicly writable.
- The app footer literally states: *"Shared list — anyone with this page can add stages, rank bars, and edit entries."* There is no security boundary; see [Security Considerations](#security-considerations).

---

## APIs & External Services

### Google Places API (New) — Text Search

- **Purpose:** verify that a named bar exists and is open (exact lookup), and power vibe/surprise/nearby/crawl discovery searches.
- **Provider:** Google (Maps Platform).
- **Called from:** server-side, `src/app/api/places/route.ts` → `queryGooglePlaces`.
- **Endpoint:** `POST https://places.googleapis.com/v1/places:searchText`.
- **Auth:** `X-Goog-Api-Key: <GOOGLE_PLACES_API_KEY>` header.
- **Request body:** `{ textQuery, maxResultCount (1–10), locationBias: { circle: { center, radius } }, includedType: "bar" (normal searches only) }`.
- **Fields requested (mask):** `places.id, displayName, formattedAddress, location, businessStatus, priceLevel, types, googleMapsUri, rating`.
- **Location bias:** NYC center `{40.7525, -74.001}` with radius 12,000 m (normal) or 40,000 m (Explore Mode); crawl/nearby passes a custom center + radius.
- **Errors:** non-OK → `502 { error: "Places API request failed" }`; missing key → `500`. Never cached, never collapsed into `[]`.
- **Caching:** non-empty results cached in Firestore for 24 h (shared across users) + a 10-minute in-memory client cache (`src/lib/places.ts`). Empty results are **never** cached.
- **Trigger:** user-initiated (searches, manual add) and automatic (coordinate backfill, crawl planning).
- **Cost:** see [API Cost Estimates](#api-cost-estimates).

### Google Gemini API

- **Purpose:** (a) write bar descriptions/tags/happy-hour, (b) enrich search results in place, (c) parse receipt images into line items.
- **Provider:** Google (Gemini Developer API).
- **Called from:** server-side, `src/app/api/gemini/route.ts` and `src/app/api/split-receipt/route.ts`.
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent` (default model `gemini-3.5-flash-lite`, overridable via `GEMINI_MODEL`).
- **Auth:** `x-goog-api-key: <GEMINI_API_KEY>` header.
- **Timeouts:** 10 s for text (details/enrichment), 25 s for receipt vision.
- **Output:** JSON text parsed by `safeParse` (fence stripping + bracket extraction) and validated by `normalizeDetails` / `normalizeSuggestion` / `normalizeReceipt`. No `responseMimeType` JSON mode is used — the model is instructed to "return ONLY JSON" and the code defensively extracts JSON.
- **Errors:** upstream error → status passthrough; timeout → 504; no usable description → 422; parse failures → user-facing "Couldn't read that receipt" 422.
- **Caching:** bar details cached in Firestore (`detailsFetched`) and a module-level client cache keyed by bar id/prompt; enrichments cached client-side per prompt.
- **Trigger:** automatic (every bar without a description on load; every search result), user-initiated (receipt uploads).
- **Cost:** see [AI Cost Estimates](#ai-cost-estimates).

### OpenStreetMap Nominatim

- **Purpose:** fallback geocoder when Google Places can't resolve a legacy bar's coordinates (`healBarCoordinates` in `tour-context.tsx`).
- **Called from:** **client-side** `fetch` (not an API route).
- **Endpoint:** `GET https://nominatim.openstreetmap.org/search?q=…&format=json&limit=1&viewbox=-74.26,40.92,-73.70,40.70&bounded=1&accept-language=en`.
- **Auth:** none (free). **Usage policy ~1 request/second** — the code sleeps 1.1 s between fallback lookups.
- **Error handling:** failures silently leave the bar without coordinates (retried next full page load).
- **Caching:** none.

### CARTO basemap tiles

- **Purpose:** Leaflet dark map tiles.
- **Endpoint:** `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` (attribution required — provided).
- **Client-side**, free tier with attribution.

### leaflet.heat (unpkg CDN)

- **Purpose:** heat layer for the Tour Map.
- **Loaded at runtime** as a classic `<script>` from `https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js` because it's a UMD plugin needing the global `L`. Failure is caught and logged; markers still render.

### Google Fonts

- **Purpose:** Fraunces / Inter / IBM Plex Mono webfonts, loaded in `layout.tsx`.

---

## AI / LLM Usage

Single provider: **Google Gemini**, one endpoint, three call shapes. Default model `gemini-3.5-flash-lite` (env-overridable).

### 1. Bar details writer (`/api/gemini`, with `barId`)

- **Trigger:** automatic — every bar with `detailsFetched: false` when bars load; also after adding a bar manually.
- **Input prompt (~250–350 tokens):** fixed preamble ("You are a NYC bar description writer…") + the bar's **name and location (user-entered)** + a strict JSON schema: `{"description", "tags"[3-5], "happyHour", "neighborhood", "capacityHint"}`. Rules: don't rename the business; empty description if no reliable info; **no mapsLink field**.
- **Output (~150–250 tokens):** JSON, parsed by `safeParse` → `normalizeDetails`. Must have a "useful" description (trimmed length > 35 chars, not array-shaped) or the route returns 422.
- **Persistence:** on success the route merges `description`, `tags`, `happyHour`, `neighborhood`, `capacity`, `detailsFetched: true`, `lastUpdated` into the bar inside a **Firestore transaction** (re-reads the doc; `BAR_REMOVED` → 404). The client never writes the Gemini result itself (avoids stale-array writes).
- **Prompt contains user data:** yes — bar name/address/neighborhood are interpolated into the prompt.
- **Stored:** yes — description/tags/happyHour/capacity are persisted on the bar.

### 2. Search/crawl enrichment (`/api/gemini`, no `barId`)

- **Trigger:** automatic — every result of Find Bars / Surprise Us / Nearby / crawl planning (up to ~10 per search).
- **Input prompt:** same shape as #1 but **without** `capacityHint` and instructing a single JSON object; bar name + address interpolated.
- **Output:** same JSON; normalized by `normalizeSuggestion`. **Not persisted** (ephemeral in the results list); carried into the saved bar only if the user adds it.
- **Prompt contains user data:** yes (result name/address).

### 3. Receipt parser (`/api/split-receipt`)

- **Trigger:** user-initiated — each place's receipts when the user continues to the tabs step (only places whose screenshots changed are re-sent, and places are parsed one at a time).
- **Input:** a ~400-token instruction prompt + **1–N base64 images** (`inline_data`) of the same receipt. Images may be screenshots or imperfect photos (angled, shadowed, blurry); the prompt explicitly handles overlap so a long receipt split across shots isn't double-listed.
- **Output JSON:** `{"placeName", "items":[{name, price, quantity}], "tax", "tip"}` — validated by `normalizeReceipt` + a name+price `dedupeItems` backstop.
- **Stored:** no — merged into client-side place state only.
- **Prompt contains user data:** yes (the images).

### Fallback behavior

- Gemini failure/timeout → the bar is added to a session-level `failedIds` set (no retry until the next full page load); search results simply stay without enrichment; receipt parse shows an error and the user can add items by hand.
- No fallback to a different model or provider — Gemini is the only AI.

---

## AI Cost Estimates

**Pricing (checked August 14, 2026, official page `ai.google.dev/gemini-api/docs/pricing`):** the app's default `gemini-3.5-flash-lite`:

- **Standard:** $0.30 / 1M **input** tokens · $2.50 / 1M **output** tokens (free tier available for development with free input/output tokens at lower rate limits).
- Batch API is 50% cheaper ($0.15 / $1.25) but the app does not use it.

**Token assumptions per call** (estimate from the actual prompts — labeled, not measured):

| Call type | Input tokens | Output tokens | Est. cost/call |
|---|---:|---:|---:|
| Bar details (#1) | ~350 | ~250 | 350×0.30/1M + 250×2.50/1M = **$0.00073** |
| Search enrichment (#2) | ~300 | ~200 | 300×0.30/1M + 200×2.50/1M = **$0.00059** |
| Receipt parse (#3, 1 photo) | ~1,600 (prompt + ~1,200 image tokens) | ~250 | 1600×0.30/1M + 250×2.50/1M = **$0.0011** |
| Receipt parse (3 photos) | ~4,000 | ~250 | **$0.0018** |

Note: image tokens scale with resolution (roughly 1,125 tokens per ~1 MP image on Gemini 3.x); receipt photos are typically several MP.

**Scenario table** (assuming a mix: 60% details/enrichment, 40% single-photo receipt parses, avg ~$0.00075/call):

| Usage | Estimated AI calls | Estimated tokens (in/out) | Approx. cost |
|---|---:|---:|---:|
| 100 requests | 100 | ~40k / ~24k | **~$0.08** |
| 1,000 requests | 1,000 | ~400k / ~240k | **~$0.75** |
| 10,000 requests | 10,000 | ~4M / ~2.4M | **~$7.50** |
| 100,000 requests | 100,000 | ~40M / ~24M | **~$75** |

Input:output cost split ≈ 15% input / 85% output at these prices. If `GEMINI_MODEL` is set to a larger model (e.g. `gemini-3.5-flash` at $1.50/$9.00), costs rise ~5×.

**Realistic app-level usage:** the app is aggressively cached — details are fetched once per bar (then `detailsFetched`), enrichment is ephemeral per search, receipts are parsed once per upload. A typical month for the current user base (a few people, dozens of searches, a handful of new bars and receipts) is well under $1 of Gemini.

---

## API Cost Estimates

### Google Places API (New) — Text Search

The app requests full fields (names, addresses, status, price level, types, ratings) — **not** the "IDs Only" SKU — so it bills under **Places API Text Search Pro**:

- **Free usage cap:** 5,000 events/month **per SKU**, then $32.00 / 1,000 (0–100k tier), $25.60 / 1,000 (100k–500k).
- **$200/month Google Maps Platform credit** applies against all Maps usage on the billing account (so the first ~6,250 billable Text Search Pro requests are effectively covered after the 5k cap).

| Requests/month | Billable (after 5k free) | Cost before credit | Cost after $200 credit |
|---:|---:|---:|---:|
| 100 | 0 | $0 | $0 |
| 1,000 | 0 | $0 | $0 |
| 10,000 | 5,000 | $160 | $0 |
| 100,000 | 95,000 | $3,040 | $2,840 |

Reality check: this app caches aggressively (24 h shared Firestore cache + 10 min client cache; crawl/nearby use `noCache` but are rare), so monthly billable requests will be far below page-view counts. For the current small user base, Places cost is **$0/month**.

### Nominatim / CARTO / Fonts / unpkg

All free (attribution-only) at this scale. Nominatim's 1 req/s policy is already paced in code.

---

## Estimated Monthly Operating Cost

Assumptions: "users" = monthly active visitors; per-visitor monthly activity ≈ 3 Places searches (some cached), 2 Gemini calls, 0.3 receipt parses; the app is single-document and cache-heavy. Fixed costs: **Vercel Hobby $0**, Gemini free tier until volume, Firestore Spark free tier (50k reads/day, 20k writes/day, 1 GB storage) until volume.

| | Small (~100 users) | Moderate (~1,000 users) | Large (~10,000 users) |
|---|---:|---:|---:|
| **Gemini** (~300 / 2,000 / 20,000 calls) | ~$0.25 | ~$1.50 | ~$15 |
| **Places Text Search Pro** (~300 / 3,000 / 30,000 req) | $0 (free cap) | $0 (free cap) | $800 − $200 credit = **~$600** |
| **Firestore** (1 shared doc + cache docs) | $0 (Spark) | $0 (Spark) | ~$5–25 (Blaze; cache doc churn grows with searches) |
| **Vercel** | $0 (Hobby) | $0 (Hobby) | $20 (Pro) or Hobby + overages |
| **Other** (Nominatim/CARTO/fonts) | $0 | $0 | $0 |
| **Total (est.)** | **~$0–1/mo** | **~$2–5/mo** | **~$640–700/mo** |

**Known fixed costs:** $0 (Vercel Hobby, free tiers). Everything else is **estimated**. The Large scenario is dominated by Places Text Search Pro; moving to the Places "Enterprise" subscription or tightening the cache TTL would change that curve. Gemini's free tier covers the small/moderate rows.

---

## Environment Variables & Secrets

All variables are read **server-side only** (Next API routes). There are **no `NEXT_PUBLIC_*` variables** — the Firebase web config is hardcoded in `src/lib/firebase.ts` (see Security).

| Variable | Controls | Used in | Required? |
|---|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Places Text Search auth | `api/places/route.ts` | Yes (route 500s without it) |
| `FIREBASE_PROJECT_ID` | Firestore REST cache URL + admin init | `api/places/route.ts`, `api/gemini/route.ts` | Required for Places caching & Gemini writes; without it Places runs uncached and Gemini bar-details calls 500 |
| `GEMINI_API_KEY` | Gemini API auth | `api/gemini/route.ts`, `api/split-receipt/route.ts` | Yes |
| `GEMINI_MODEL` | Model override | both Gemini routes | No (defaults to `gemini-3.5-flash-lite`) |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service account | `api/gemini/route.ts` | Only if Gemini writes bar details |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key (escape `\n` as literal `\\n`) | `api/gemini/route.ts` | Only if Gemini writes bar details |

**Current local `.env.local` contains only `GEMINI_API_KEY` and `GOOGLE_PLACES_API_KEY`** — so locally the Places cache is disabled and Gemini details calls fail with a 500 unless the Firebase variables are added.

**Potentially exposed secrets:**
- The **Firebase web API key is hardcoded in client code** (`src/lib/firebase.ts`). Firebase web API keys are designed to be public (they're not a secret; security comes from rules), but it means anyone can read it from the bundle.
- **No service-account JSON** is committed. The admin SDK's `FIREBASE_PRIVATE_KEY` is server-only — do not put it in `NEXT_PUBLIC_*` or client code.
- API keys must never be added to `.env.local` into a git commit (`.env.local` is gitignored).

---

## Data Flow

### Add-to-wishlist (manual, the most involved flow)

```
User types bar name in WishFormModal
  → saveWishForm() closes form, builds suggestion {name, neighborhood, notes, _placeIntent:"wishlist"}
  → startPlacesLookup() opens PlacesModal (searching)
  → fetchPlaces(name, {exactLookup:true, limit:5})            [src/lib/places.ts]
      → POST /api/places
          → buildExactQueries (≤5 variants: original, apostrophe-stripped,
            +neighborhood, +address, +NYC) tried in order
          → fetchOrCachePlaces: read Firestore placesSearchCache (24h TTL;
            EMPTY entries ignored), else queryGooglePlaces()
          → filterAndShape (exact: ranked match ≥ 0.45 threshold, closed
            rejected, missing status accepted) → writeCache (non-empty only)
      → response: [{name, address, latitude, longitude, placeId, mapsLink, rating}]
  → PlacesModal lists matches
User taps a match → confirmPlaceSelection() merges + preserves Gemini fields
  → addSuggestionToWishlist() builds a Bar record
  → persist(updater)  [optimistic setState + Firestore transaction on LATEST bars]
  → onSnapshot fires → every client re-renders
  → if record has no description → runDetailsFetch(record)
      → POST /api/gemini {prompt, barId}
          → Gemini generateContent → normalizeDetails
          → firebase-admin transaction merges details into that bar
      → onSnapshot fires again → description appears everywhere
```

### Find Bars / Surprise Us / Nearby

```
User clicks button
  → runSearch / runRandomSearch / runNearbySearch (tour-context)
      → fetchBarSuggestions / fetchRandomBar / fetchPlaces (places.ts)
      → POST /api/places (normal mode: "… bar" textQuery, includedType:"bar",
        OPERATIONAL + BAR_TYPES + price ≤ moderate filters unless ballerMode)
  → searchResults state → FindView grid of SuggestionCard
  → enrichSearchResult(s) per result → POST /api/gemini (no barId) → in-place update
  → "add to wishlist" or "I visited" persists via the flow above
```

### Split the Bill

```
Upload receipt images (per place)
  → readAllAndProceed → parsePlaceReceipts (sequential, changed screenshots only)
      → POST /api/split-receipt {images:[{base64,mimeType}]}
          → Gemini vision → normalizeReceipt → dedupeItems
      → merge items/tax/tip/placeName into place state (never duplicates)
  → tabs step: assign items ↔ people (SplitEvenly / +/- units)
      → placeTotals/grandTotals via distributeCents (largest-remainder)
  → summary → sms: URL with per-person totals
  → NOTHING written to Firestore in this flow
```

---

## State Management

| Mechanism | What it holds |
|---|---|
| **React Context** (`TourProvider`/`useTour`) | The entire app state surface: `bars`, `rankingBattles`, `groupSize`, search/filter state, modal state, `searchResults`, crawl state, save/connection errors |
| **Firestore realtime listener** (`onSnapshot`) | The source of truth; every snapshot replaces `bars`/`rankingBattles`, which re-renders every view |
| **Optimistic updates + transactions** | `persist`, `updateBar`, `recordBattle` update local state immediately, then commit via `runTransaction`; on failure `saveError` is set (global banner in `Shell`) |
| **Refs** (`barsRef`, `rankingBattlesRef`) | Mirror state for use inside callbacks without re-creating them |
| **Module-level session caches** | `placesCache` (10 min, in `places.ts`), `geminiCache` (in `gemini.ts`), `autoBattlePrompted` (one battle auto-prompt per browser session) |
| **Firestore-side caching** | `detailsFetched` flag per bar; `placesSearchCache` collection (24 h, shared across users) |
| **Session-only sets** | `seenNames` (never re-suggest saved/seen bars), `failedIds`/`coordAttemptedRef` (retry-at-most-once-per-load) |
| **URL state** | Next.js route paths only; no query-string state |
| **Persistence** | Everything user-facing persists to the shared Firestore doc; split-bill data is intentionally not persisted |

Propagation: Firestore write → `onSnapshot` on every connected client → `setBars`/`setRankingBattles` → memoized `filteredVisited`/`filteredToTry` → views re-render. This is why two users see each other's edits live.

---

## Business Logic

### Scoring

- `avgWithFood(bar)` = mean of `vibe, value, service, food, drinks` — **only if all five are present** (non-null, numeric); otherwise `null`.
- `avgWithoutFood(bar)` = mean of `vibe, value, service, drinks` — only if all four are present.
- Disqualified bars → `null` score.
- Display: `fmt` → 2 decimals, `—` for null.

### Ranking (score → battle → deterministic fallback)

`rankEntries` (in `src/lib/ranking.ts`, pure):
1. Bars with null scores go last, sorted by name/id.
2. Bars are grouped by exact score (`toFixed(9)` with a 1e-9 epsilon so float noise never splits a true tie).
3. Within each tie group, ordering is **Copeland-style battle counting**: wins desc, then losses asc, then `name`, then `id`. Only battles between two bars **currently in that score group** count — a battle is ignored once their scores diverge.
4. **Cycle-safe:** `A>B, B>C, C>A` leaves everyone at 1W/1L and falls through to the deterministic name/id order — stable, never unstable.
5. Battles never change scores and no rank is stored on bars — the displayed order is always recomputed from (scores + battles).

### Bar Battles (the tiebreaker)

- Pending pairs = adjacent bars in the battle-ordered ranking that share a score and have no recorded battle (`pendingBattlePairs`).
- Recording a battle **replaces** any existing record for that unordered pair (dedupe by sorted `bar1|bar2`), so duplicates/conflicts are impossible.
- The modal auto-opens once per session; a "Settle N ties" chip remains while pairs exist.
- A ⚔️ indicator (left of the score) marks bars whose position within their score group was battle-decided (`battleDecidedBarIds`).

### Other notable rules

- **Disqualification:** disqualified bars are excluded from ranking (bottom, ordered among themselves by score then name); `toggleDisqualify` prompts for a reason.
- **Group size:** `groupSize` is clamped 1–20 (default 6) on every read and write; the wishlist "Fits our group" filter drops bars whose `capacity` is below it.
- **Map-link healing:** legacy bars without `mapsLink` get `https://www.google.com/maps/search/?api=1&query=<name, location>` — only when empty, in a transaction, idempotent.
- **Coordinate backfill:** bars without lat/lng are healed sequentially (Places exact lookup → name-matched, else Nominatim bounded to NYC after a 1.1 s delay); only coordinates whose name plausibly matches are written.
- **Exact place matching** (Places route): `normalizeName` (lowercase, curly→straight apostrophes, punctuation stripped), `nameSimilarity` (exact=1, containment=0.85, else Dice coefficient on word tokens), threshold 0.45; candidates scored + ranked with neighborhood/address overlap, operational status, and proximity bonuses; explicitly-closed places rejected; missing `businessStatus` accepted. Bounded fallback queries (≤5 Google calls).
- **Discovery filtering (normal mode):** `businessStatus === "OPERATIONAL"`, type ∈ {bar, night_club, pub, wine_bar}, price ≤ moderate unless Baller Mode.
- **Crawl planning:** greedy random walk; per stop, Places `"great bar"` near the stop (900 m search radius), candidates ≤600 m straight-line, random pick, no repeats; walk minutes = beeline × 1.3 / 1.34 m/s.
- **Split math:** `distributeCents` (largest-remainder — exact cent sums) and `distributeWholeUnits` (whole-unit shares for multi-quantity items); duplicate receipt lines removed by `name|price` key; parsed items merge, never replace.
- **Seen/exclusion logic:** saved bars + session-seen names are excluded from discovery results so searches feel fresh.
- **Client-generated IDs:** `b<ts>_<rand>` (bars), `battle<ts>_<rand>` (battles) — collision-resistant under concurrent adds.

---

## Authentication & Authorization

- **There is no authentication.** No Firebase Auth, no sessions, no cookies, no user identity anywhere.
- Every visitor is anonymous; bar records carry no `createdBy`; battle records carry no `createdBy` (the type was deliberately designed without it).
- **What any unauthenticated visitor can do:** read the entire shared list, add bars, remove bars, edit ratings, disqualify, record global battles, change group size, and trigger paid Google/AI API calls through the API routes.
- **Admin functionality:** none exists.
- Implication: every write is effectively "public", and API routes are open to anyone who can reach the deployment (no API keys, no rate limiting). See Security.

---

## Error Handling

| Failure | Handling |
|---|---|
| Firestore connect error | `connError` state; app falls back to seed data; banner-free but shows empty-ish state |
| Firestore write failure | `saveError` state → global ⚠ banner in `Shell` ("Couldn't save that change…"); optimistic state stays until the next snapshot corrects it; `recordBattle` also reverts its optimistic entry |
| Google Places error / missing key | `502`/`500` JSON; client `fetchPlaces` catches and returns `[]` (UI shows "No matching open bar found" — a genuine miss and an API failure are visually identical) |
| Places empty result | Legitimately returns `[]` (distinct from API failure internally); never cached |
| Gemini timeout (10 s / 25 s) | Route returns 504; client `callGemini` returns `null`; bar added to `failedIds` (no retry until next page load); enrichment just doesn't render |
| Gemini bad/empty description | 422 "No usable bar description returned"; same `failedIds` path |
| Receipt parse failure | 422 with a friendly message; place shows the error, user can add items manually |
| Bar removed during Gemini write | Transaction throws `BAR_REMOVED` → 404, nothing written |
| Missing bar on details fetch | 404 → client treats as no-result |
| Invalid input | Empty names ignored; duplicate names rejected (split roster); price prompts require finite ≥ 0; group size clamped; limit clamped 1–10 |
| Network failure (client) | `fetchPlaces`/`callGemini` catch and degrade gracefully |
| Nominatim throttle/failure | Silent skip; coordinates retried on next load |

---

## Testing

- **No test framework, no test files, no test script.** `package.json` scripts are only `dev`, `build`, `start`, `typecheck`.
- Quality gates in practice: `npm run typecheck` (`tsc --noEmit`) and `npm run build` (`next build`, which also type-checks; ESLint is disabled in `next.config.mjs`).
- Nothing is mocked; no CI is configured in the repo (`.github/` absent).
- Ad-hoc verification (performed during development of this README's features): standalone Node scripts against the compiled ranking module, and live dev-server checks against real Google APIs and the real Firestore doc.

---

## Local Development

1. **Prerequisites:** Node.js 18+ (Next 14 requirement), npm, a Firebase project (the app assumes `bar-rating`), a Google Maps Platform API key with **Places API (New)** enabled, and a Google AI Studio API key (Gemini).
2. **Install:** `npm install`
3. **Environment** — create `.env.local` (values are yours; the app currently has only two keys locally):
   ```bash
   GOOGLE_PLACES_API_KEY=...
   GEMINI_API_KEY=...
   # Needed for the shared Places cache and Gemini detail writes:
   FIREBASE_PROJECT_ID=bar-rating
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   # Optional:
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
4. **Firebase setup:** create the `tourDeAlcoholism/sharedList` doc (or let the app seed it on first load); the `placesSearchCache` collection is created lazily. No rules file exists in the repo — set rules to whatever you intend (currently the app expects open access; see Security).
5. **API setup:** enable Places API (New) and Gemini API; put the keys in `.env.local`.
6. **Run:** `npm run dev` → http://localhost:3000
7. **Typecheck:** `npm run typecheck`
8. **Build:** `npm run build` (production), then `npm start`.

---

## Deployment

- **Platform:** Vercel (`vercel.json` = `{ "framework": "nextjs" }`). The git history references the repo `github.com/Sdrucker6637/bar-rating`, but no CI config is in the repo — deployment is presumably Vercel's git integration (or `vercel` CLI).
- **Build process:** `npm run build` / `next build`; the Gemini route exports `runtime = "nodejs"` (Vercel serverless Node).
- **Required env vars in Vercel Project Settings:** `GOOGLE_PLACES_API_KEY`, `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (optional: `GEMINI_MODEL`). The Firebase admin vars are what make Gemini detail writes work in production.
- **Important production quirk:** `FIREBASE_PRIVATE_KEY` must have its `\n` sequences preserved (Vercel sometimes mangles them — the route already does `privateKey.replace(/\\n/g, "\n")`, but the stored value must contain literal `\n` characters).
- No analytics, no staging config, no feature flags found.

---

## Performance & Scaling

**Design that helps:** the whole app is one Firestore document + realtime listener (cheap reads), heavy caching (24 h shared search cache, per-bar `detailsFetched`, session caches), client-only split flow, and sequential Gemini/geocoding calls.

**Likely bottlenecks as usage grows:**

1. **Single-document architecture.** Everything lives in `tourDeAlcoholism/sharedList`. At thousands of bars, every client downloads the whole array on every snapshot, and every transaction rewrites the entire `bars` array (O(n) per edit, and document size grows unbounded — Firestore documents cap at ~1 MiB).
2. **Write contention.** Every transaction reads the whole doc; with many concurrent editors, transaction retries increase. Bar edits and battle writes are field-scoped but still transaction over the whole doc.
3. **Places API cost/quota** — the dominant paid cost at scale (see cost sections). Caching helps, but `noCache` paths (Surprise Us, Nearby, crawl planning) bill every time.
4. **Gemini per-bar enrichment** is once-per-bar (cached), but **per-search enrichment** multiplies with search volume; each search of 4–10 results = 4–10 Gemini calls.
5. **`seenNames` growth** — session-only, resets on reload; fine.
6. **Map rendering** — heat layer + per-bar circle markers; fine for hundreds of bars, heavy for thousands.
7. **No rate limiting** — a handful of scripted clients could spike API bills (see Security).

---

## Security Considerations

### Current implementation (facts from the code)

- **Firebase web config is hardcoded client-side** (`src/lib/firebase.ts`) — the `apiKey` is public by design for Firebase web apps, but anyone can read it and the projectId.
- **No authentication anywhere** — every write and every paid API call is anonymous.
- **No `firestore.rules` in the repo; the code implies open rules.** Most tellingly, `api/places/route.ts` writes `placesSearchCache` via the Firestore REST API **with no auth header**, which only works if rules allow unauthenticated writes. Client writes (web SDK) also assume public read/write.
- **API routes are unauthenticated and unthrottled** — anyone can POST `/api/places`, `/api/gemini`, `/api/split-receipt` and burn the owner's Google/Gemini quotas and money.
- **Prompt injection surface:** user-entered bar names/addresses are interpolated into Gemini prompts. A hostile name ("ignore your instructions…") could influence output; description text is written to Firestore and rendered as HTML by React (React escapes text, so XSS is unlikely, but prompt-injection content could still persist).
- **`sms:` URLs** are user-controlled only in the sense that they contain totals; harmless.
- **Receipt images** are base64 in client memory and sent to Google's Gemini API — no storage, no logging of images found.
- **Nominatim** — free geocoder, rate-limited externally (the code paces at ~1 req/s, but a scripted client could still trip the policy).
- **No secrets in the repo:** `.env.local` is gitignored; the only credential in source is the Firebase web apiKey (public class).

### Recommended improvements (not implemented — do not change behavior without intent)

- **High:** add Firestore security rules (authenticate users, or at minimum constrain `placesSearchCache` to server writes and the shared doc to intended clients); add API-route rate limiting or a shared secret header for the API routes; gate Gemini/Places calls behind a cheap client check.
- **High:** store Firebase Admin credentials properly (they are already env-only; never inline them).
- **Medium:** validate/truncate free-text fields before they reach prompts (prompt-injection hardening); cap request body sizes on `/api/split-receipt` (base64 images can be large); add input length limits.
- **Medium:** add Vercel function timeouts/limits awareness (Gemini calls up to 25 s can exceed default function budgets on free plans).
- **Low:** consider per-user attribution if the app ever grows beyond a single trusted friend group.

---

## Known Limitations

- **NYC-only.** The Places route biases every search to a NYC center (12–40 km radius); nominatim fallback is bounded to NYC; the default model prompt says "NYC bar description writer." The app is not portable to other cities without code changes.
- **Single shared document** — no per-user data, no history, no per-bar per-user attribution, no offline mode, no conflict UI (Firestore last-write-wins at the field level, mitigated by transactions for `bars`).
- **No authentication** — intentional, but it means anyone with the URL can edit or remove entries.
- **Empty/API-failure vs no-result ambiguity in the UI:** client `fetchPlaces` collapses a 502 API error into `[]`, so the "No matching open bar found" message can't distinguish "Google failed" from "Google says no." (The server does distinguish internally.)
- **Manual-add without Places match** still works via "Add anyway," but such bars have no coordinates (map/crawl skip them until healed).
- **Gemini reliability:** descriptions depend on the model knowing the venue; the prompt explicitly allows empty output rather than inventing, and a 422 means no description (bar remains `detailsFetched: false`, retried next load).
- **Split flow is not persisted** — refreshing mid-flow loses the receipt data.
- **SMS summary uses the `sms:` URL scheme** (mobile-only; desktop browsers may do nothing).
- **No test suite and no ESLint** — regressions are caught by typecheck/build and manual testing.
- **`lastUpdated` is written by the Gemini route but is not part of the client `Bar` type** (server-only field).
- **Prices/limits quoted in this README** were checked August 14, 2026 and will drift.

---

## Technical Debt / Recommended Improvements

### High priority
1. **Add Firestore security rules + API-route protection** (see Security). The current deployment is effectively public write + unlimited paid-API spend.
2. **Rate-limit the API routes** (Places/Gemini/split-receipt) to prevent quota/cost abuse.
3. **Escape-hatch observability:** surface API failures vs. empty results distinctly in the UI ("Google search failed — try again" vs "no match").

### Medium priority
4. **Break out of the single-document pattern** when bars exceed a few hundred (subcollections or sharded docs) — today every edit rewrites the entire `bars` array.
5. **Server-side retry/backoff for Google Places** transient errors (429/5xx currently surface immediately as 502).
6. **Cap receipt image size/count** before sending base64 to Gemini (cost + timeout risk).
7. **Add ESLint** now that the project is typed — `next build` currently skips it entirely.
8. **Add a small test harness** for the pure logic (ranking, split math, name matching) — these are currently verified by hand.

### Low priority
9. Store the Firebase web config in `NEXT_PUBLIC_*` env vars instead of hardcoding (hygiene; not a secret).
10. Persist split-bill state to localStorage so refreshes don't lose a night's entry.
11. Add per-user attribution fields if the group grows.
12. Document the exact battle semantics in the UI (the ⚔️ tooltip helps; a small "battle log" would be clearer).

---

## Cost Optimization Opportunities

- **Places:** keep the 24 h shared cache (already a big win); consider lowering `CACHE_TTL_MS` for verification if freshness matters more than cost; the exact-lookup path already dedupes fallback queries. `noCache` calls (Surprise/Nearby/crawl) are the only unbilled-again spots — they're already minimized and random-search results could reuse a warm cache for the same vibe within a session.
- **Gemini:** enrichment is per-search-result; capping the enriched result count (currently up to 10 per crawl/nearby) or enriching only the first N would cut calls. Batch API (50% off) is available but requires a different request shape. The 10-minute session cache and `detailsFetched` flag already dedupe.
- **Firestore:** the doc is tiny; costs are negligible. Cache doc churn (one PATCH per unique non-empty search) is the only Firestore write driver — the write happens only when Google is actually called, which the cache already limits.
- **Network:** every client holds one realtime listener to one doc — optimal for this architecture. The map only renders when visited.
- **Expected benefit:** for the current usage, optimizations save dollars at most; at the Large scale (10k users), the Places cache + rate limiting are the difference between ~$600/mo and effectively $0/mo for discovery.

---

## Quick Reference

**Main technologies:** Next.js 14 (App Router) · React 18 · TypeScript 5.5 · Tailwind 3.4 · Firebase Firestore (web + admin SDKs + REST) · Leaflet + leaflet.heat · Vercel.

**Main external APIs:** Google Places API (New) Text Search (`places:searchText`) · Google Gemini API (`:generateContent`) · OpenStreetMap Nominatim (fallback geocode) · CARTO basemap tiles · Google Fonts · unpkg CDN.

**AI models:** `gemini-3.5-flash-lite` (default; override `GEMINI_MODEL`) — bar descriptions, search enrichment, receipt parsing.

**Firestore collections:**
- `tourDeAlcoholism/sharedList` → `bars: Bar[]`, `groupSize`, `rankingBattles: RankingBattle[]`
- `placesSearchCache/<hash>` → `places` (non-empty), `timestamp`, `query`

**Important env vars (all server-side):** `GOOGLE_PLACES_API_KEY`, `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, optional `GEMINI_MODEL`.

**Commands:**
```bash
npm run dev        # dev server (port 3000)
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm start          # serve the production build
```

**Key files to know first:** `src/lib/tour-context.tsx` (state + writes), `src/lib/ranking.ts` (ranking/battles), `src/app/api/places/route.ts` (verification + cache), `src/app/api/gemini/route.ts` + `src/app/api/split-receipt/route.ts` (AI), `src/lib/seed.ts` (seed data), `src/lib/firebase.ts` (Firebase init).

**Deployment:** Vercel (`framework: nextjs`); env vars set in Project Settings; the Gemini route is Node.js runtime. **Auth:** none — open, shared single-list app by design. **Testing:** none in-repo; typecheck + build are the gates.

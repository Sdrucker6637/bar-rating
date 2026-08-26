// Standalone verification for the enrichment pipeline logic in
// src/lib/enrichment.ts — both the saved-bar pipeline and the search-result
// enrichment gate. Compile the module to CJS first, then:
//   node verify-enrichment.mjs
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const require = createRequire(import.meta.url);

rmSync("tmp-enrich-test", { recursive: true, force: true });
const tsc = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "tsc",
    "src/lib/enrichment.ts",
    "--outDir",
    "tmp-enrich-test",
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--skipLibCheck",
  ],
  { encoding: "utf8" },
);
if (tsc.status !== 0) {
  console.error(tsc.stdout + tsc.stderr);
  process.exit(1);
}

const {
  isUsefulDescription,
  isSearchEnrichmentOk,
  needsEnrichment,
  nextEnrichmentStep,
  shouldQueueBar,
  buildEnrichmentPrompt,
  DEFERRED_RETRY_DELAY,
  DEFERRED_ATTEMPT,
  STANDARD_RETRY_DELAYS,
  FALLBACK_RETRY_DELAYS,
  FALLBACK_START_ATTEMPT,
} = require("./tmp-enrich-test/enrichment.js");

let passed = 0;
let failed = 0;
const check = (label, cond, extra) => {
  if (cond) {
    passed++;
    console.log(`  ok  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}${extra ? " — " + JSON.stringify(extra) : ""}`);
  }
};

const usable = "A cozy corner spot pouring excellent natural wine and creative, well-balanced cocktails late into the night.";
const shortDesc = "Great drinks, chill vibe.";
// The exact empty-object shape the route used to 200 for empty Gemini output.
const emptyRouteObject = {
  name: "",
  neighborhood: "",
  description: "",
  tags: [],
  happyHour: "",
  capacityHint: null,
  mapsLink: "",
  address: "",
  latitude: null,
  longitude: null,
};

console.log("== isSearchEnrichmentOk (search-result success gate — regression) ==");
check(
  "REGRESSION (req 9): Gemini {description:'', tags:[]} is NOT successfully enriched",
  isSearchEnrichmentOk({ description: "", tags: [] }) === false,
);
check(
  "REGRESSION: the route's all-empty 200 object is NOT enriched",
  isSearchEnrichmentOk(emptyRouteObject) === false,
);
check(
  "null/undefined info → not enriched",
  isSearchEnrichmentOk(null) === false && isSearchEnrichmentOk(undefined) === false,
);
check(
  "missing description field → not enriched",
  isSearchEnrichmentOk({ tags: [] }) === false,
);
check(
  "short description → not enriched (would retry)",
  isSearchEnrichmentOk({ description: shortDesc }) === false,
);
check(
  "description starting with [ → not enriched",
  isSearchEnrichmentOk({ description: "[This is an array-ish stub that is long enough but malformed]" }) === false,
);
check(
  "REGRESSION (req 10): valid description IS enriched (accepted immediately, no retry)",
  isSearchEnrichmentOk({ description: usable, tags: ["cozy"] }) === true,
);
check(
  "a bar with a real description + other fields still passes",
  isSearchEnrichmentOk({ name: "Whiskey Tavern", description: usable }) === true,
);

console.log("== buildEnrichmentPrompt fallback (explicit usable-description requirement) ==");
const bar = { name: "Whiskey Bar", address: "45 Grove St", neighborhood: "West Village" };
const fallback = buildEnrichmentPrompt(bar, true);
const standard = buildEnrichmentPrompt(bar, false);
check(
  "fallback prompt explicitly requires a real 40+ char description",
  /40|40\+/.test(fallback) && /MUST/.test(fallback),
);
check(
  "fallback prompt no longer offers the empty-string escape hatch",
  !fallback.includes("set description to an empty string"),
);
check(
  "fallback prompt rejects empty/null stubs explicitly",
  /never empty/.test(fallback) && /one-word stub/.test(fallback),
);
check(
  "fallback prompt does NOT request capacityHint",
  !fallback.includes("capacityHint"),
);
check("fallback prompt embeds name + location", fallback.includes("Whiskey Bar") && fallback.includes("45 Grove St"));
check("standard prompt unchanged in shape (has capacityHint)", standard.includes("capacityHint"));

console.log("== isUsefulDescription (shared gate, unchanged) ==");
check("non-string → false", isUsefulDescription(undefined) === false);
check("empty string → false", isUsefulDescription("") === false);
check("short (<35) → false", isUsefulDescription(shortDesc) === false);
check("exactly 35 chars → false", isUsefulDescription("a".repeat(35)) === false);
check("36 chars → true", isUsefulDescription("a".repeat(36)) === true);
check("leading [ → false", isUsefulDescription("[This looks like an array of data that keeps going]") === false);
check("real description → true", isUsefulDescription(usable) === true);

console.log("== needsEnrichment (saved-bar repair predicate — regression) ==");
check("missing description → true", needsEnrichment({ detailsFetched: false }) === true);
check(
  "empty description + fetched → true (LEGACY REPAIR)",
  needsEnrichment({ description: "", detailsFetched: true }) === true,
);
check(
  "short description + fetched → true (LEGACY REPAIR)",
  needsEnrichment({ description: shortDesc, detailsFetched: true }) === true,
);
check(
  "usable + fetched → false",
  needsEnrichment({ description: usable, detailsFetched: true }) === false,
);
check(
  "usable + NOT fetched → true (spec)",
  needsEnrichment({ description: usable, detailsFetched: false }) === true,
);

console.log("== nextEnrichmentStep (recoverable schedule — regression) ==");
check("attempt 1 → 2, standard, 5s", (() => {
  const s = nextEnrichmentStep(1);
  return s.attempt === 2 && !s.usingFallback && s.delayMs === 5000 && !s.deferred;
})());
check("attempt 4 → 5, FIRST FALLBACK, 60s", (() => {
  const s = nextEnrichmentStep(4);
  return s.attempt === FALLBACK_START_ATTEMPT && s.usingFallback && s.delayMs === 60000 && !s.deferred;
})());
check("attempt 5 → 6, fallback, 2m", (() => {
  const s = nextEnrichmentStep(5);
  return s.attempt === 6 && s.usingFallback && s.delayMs === 120000 && !s.deferred;
})());
check("attempt 7 → 8, fallback, 10m", (() => {
  const s = nextEnrichmentStep(7);
  return s.attempt === 8 && s.usingFallback && s.delayMs === 600000 && !s.deferred;
})());
check("attempt 8 → deferred (bounded stop for ephemeral results)", (() => {
  const s = nextEnrichmentStep(8);
  return s.deferred && s.delayMs === null && s.usingFallback && s.attempt === DEFERRED_ATTEMPT;
})());
check("a bar can NEVER be permanently abandoned — full failure walk", (() => {
  let attempt = 1;
  for (let i = 0; i < 50; i++) {
    const s = nextEnrichmentStep(attempt);
    if (!s || typeof s.attempt !== "number" || s.attempt < 1) return false;
    if (s.deferred) {
      if (s.attempt !== DEFERRED_ATTEMPT) return false;
      attempt = s.attempt;
    } else {
      if (s.usingFallback !== (s.attempt >= FALLBACK_START_ATTEMPT)) return false;
      if (s.delayMs === null) return false;
      attempt = s.attempt;
    }
  }
  return true;
})());
check("delays match exported tables", (() => {
  return (
    STANDARD_RETRY_DELAYS.join() === "5000,15000,30000,60000" &&
    FALLBACK_RETRY_DELAYS.join() === "120000,300000,600000"
  );
})());
check("deferred pacing is long (10 min)", DEFERRED_RETRY_DELAY === 600000);

console.log("== shouldQueueBar (no duplicate saved-bar requests — regression) ==");
check("missing-desc + not pending → true", shouldQueueBar({ description: "", detailsFetched: false }, { pending: new Set(), id: "bX" }) === true);
check("already pending → false", shouldQueueBar({ description: "", detailsFetched: false }, { pending: new Set(["b1"]), id: "b1" }) === false);
check("usable + fetched → false", shouldQueueBar({ description: usable, detailsFetched: true }, { pending: new Set(), id: "b2" }) === false);
check("legacy empty desc + fetched → true (repaired)", shouldQueueBar({ description: "", detailsFetched: true }, { pending: new Set(), id: "b4" }) === true);

console.log("== crawl-stop enrichment (recoverable retry — regression) ==");
// The crawl path (enrichCrawlStop / runCrawlEnrichmentAttempt in
// tour-context) reuses the EXACT same gate + schedule as search results, so
// these cases cover crawl-stop behavior through the shared pure functions.
const crawlStop = { name: "Whiskey Roxx", address: "43rd St", neighborhood: "Midtown" };
check(
  "empty crawl-stop response → NOT enriched (would retry)",
  isSearchEnrichmentOk({ ...crawlStop, description: "", tags: [] }) === false,
);
check(
  "short crawl-stop description → NOT enriched (would retry)",
  isSearchEnrichmentOk({ description: shortDesc }) === false,
);
check(
  "valid crawl-stop description → enriched immediately (no retry)",
  isSearchEnrichmentOk({ description: usable, tags: ["dive"] }) === true,
);
check(
  "crawl-stop repeated failures stop at the deferred slot (no tight loop)",
  (() => {
    let attempt = 1;
    let steps = 0;
    while (!nextEnrichmentStep(attempt).deferred) {
      if (steps > 20) return false; // tight-loop guard
      const s = nextEnrichmentStep(attempt);
      attempt = s.attempt;
      steps++;
    }
    return steps === 7; // attempts 1..7 retry, attempt 8 stops — bounded
  })(),
);
check(
  "crawl-stop fallback prompt (attempt 5+) drops capacityHint and requires a usable description",
  (() => {
    const fb = buildEnrichmentPrompt(crawlStop, true);
    const std = buildEnrichmentPrompt(crawlStop, false);
    return (
      !fb.includes("capacityHint") &&
      std.includes("capacityHint") &&
      /MUST/.test(fb) &&
      fb.includes("Whiskey Roxx")
    );
  })(),
);

console.log("");
console.log(`RESULT: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

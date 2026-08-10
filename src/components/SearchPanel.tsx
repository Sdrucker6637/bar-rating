"use client";

import { useTour } from "@/lib/tour-context";
import {
  inputCls,
  chipCls,
  chipActiveCls,
  findBtnCls,
  altBtnCls,
  groupBtnCls,
  kickerCls,
} from "@/lib/ui";

export default function SearchPanel() {
  const {
    vibeQuery,
    setVibeQuery,
    groupSize,
    setGroupSize,
    fitsGroupOnly,
    setFitsGroupOnly,
    ballerMode,
    setBallerMode,
    exploreMode,
    setExploreMode,
    searching,
    runSearch,
    runRandomSearch,
    runNearbySearch,
    setShowCrawlModal,
  } = useTour();

  return (
    <div className="my-4 rounded-lg border border-line bg-panel p-4 sm:p-5">
      <input
        className={inputCls}
        placeholder="Search by vibe or neighborhood (optional)"
        value={vibeQuery}
        onChange={(e) => setVibeQuery(e.target.value)}
      />

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <span className={`${kickerCls} mr-0.5`}>Filters</span>
        <button
          className={`${chipCls} ${fitsGroupOnly ? chipActiveCls : ""}`}
          aria-pressed={fitsGroupOnly}
          onClick={() => setFitsGroupOnly(!fitsGroupOnly)}
        >
          👥 Fits our group
        </button>
        <button
          className={`${chipCls} ${ballerMode ? chipActiveCls : ""}`}
          aria-pressed={ballerMode}
          onClick={() => setBallerMode(!ballerMode)}
        >
          💰 Baller mode
        </button>
        <button
          className={`${chipCls} ${exploreMode ? chipActiveCls : ""}`}
          aria-pressed={exploreMode}
          onClick={() => setExploreMode(!exploreMode)}
        >
          🧭 Explore mode
        </button>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[0.8rem] text-mist">
          <span>Group of</span>
          <button
            aria-label="Decrease group size"
            className={groupBtnCls}
            onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
          >
            −
          </button>
          <b className="w-4 text-center text-cream">{groupSize}</b>
          <button
            aria-label="Increase group size"
            className={groupBtnCls}
            disabled={groupSize >= 20}
            onClick={() => setGroupSize(Math.min(20, groupSize + 1))}
          >
            +
          </button>
        </div>
      </div>
      <div className="mt-1.5 font-mono text-[0.62rem] text-dim">
        Baller &amp; Explore apply to Find Bars and Surprise Us.
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
        <button
          className={`${findBtnCls} col-span-2 sm:col-span-1 sm:flex-1`}
          onClick={runSearch}
          disabled={searching || !vibeQuery.trim()}
        >
          {searching ? "Searching…" : "🔍 Find Bars"}
        </button>
        <button
          className={`${altBtnCls} sm:flex-1`}
          onClick={runRandomSearch}
          disabled={searching}
        >
          🎲 Surprise Us
        </button>
        <button
          className={`${altBtnCls} sm:flex-1`}
          onClick={runNearbySearch}
          disabled={searching}
        >
          📍 Nearby
        </button>
        <button
          className={`${altBtnCls} sm:flex-1`}
          onClick={() => setShowCrawlModal(true)}
        >
          🚶 Plan a Crawl
        </button>
      </div>
    </div>
  );
}

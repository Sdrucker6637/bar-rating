"use client";

import { useTour } from "@/lib/tour-context";
import {
  inputCls,
  chipCls,
  filterChipCls,
  filterChipActiveCls,
  modeChipActiveCls,
  findBtnCls,
  altBtnCls,
  groupBtnCls,
  kickerCls,
  cardBaseShadowCls,
  cardWarmSurfaceCls,
} from "@/lib/ui";
import Icon from "./Icon";

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
    <div
      className={`my-4 rounded-lg border border-line bg-panel p-4 sm:p-5 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
    >
      <input
        className={inputCls}
        placeholder="Search by vibe or neighborhood (optional)"
        value={vibeQuery}
        onChange={(e) => setVibeQuery(e.target.value)}
      />

      <div className="mt-3.5 flex flex-wrap items-center gap-2 sm:gap-2.5">
        <span className={`${kickerCls} mr-0.5 w-full sm:w-auto`}>Filters</span>
        <button
          className={`${filterChipCls} ${fitsGroupOnly ? filterChipActiveCls : ""}`}
          aria-pressed={fitsGroupOnly}
          onClick={() => setFitsGroupOnly(!fitsGroupOnly)}
        >
          <Icon name="users" size={13} /> Fits our group
        </button>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[0.8rem] text-mist">
          <span>Group of</span>
          <button
            aria-label="Decrease group size"
            className={groupBtnCls}
            disabled={groupSize <= 1}
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

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-line pt-3.5">
        <span className="mr-0.5 w-full font-serif text-[0.82rem] italic text-mist sm:w-auto">
          House Rules
        </span>
        <button
          className={`${chipCls} ${ballerMode ? modeChipActiveCls : ""}`}
          aria-pressed={ballerMode}
          onClick={() => setBallerMode(!ballerMode)}
        >
          <Icon name="dollar" size={13} /> Baller mode
        </button>
        <button
          className={`${chipCls} ${exploreMode ? modeChipActiveCls : ""}`}
          aria-pressed={exploreMode}
          onClick={() => setExploreMode(!exploreMode)}
        >
          <Icon name="compass" size={13} /> Explore mode
        </button>
        <span className="w-full font-mono text-[0.62rem] text-dim sm:w-auto">
          — applies to Find Bars &amp; Surprise Us
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-y-3 sm:flex sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-2.5 sm:gap-y-3">
        <div className="flex flex-col gap-1 sm:flex-1">
          <button
            className={findBtnCls}
            onClick={runSearch}
            disabled={searching || !vibeQuery.trim()}
          >
            <Icon name="search" size={14} />
            {searching ? "Searching…" : "Find Bars"}
          </button>
          <span className="text-center font-serif text-[0.72rem] italic text-dim">
            Know what you&apos;re after? Type it in.
          </span>
        </div>
        <div className="flex flex-col gap-1 sm:flex-1">
          <button
            className={altBtnCls}
            onClick={runRandomSearch}
            disabled={searching}
          >
            <Icon name="dice" size={14} /> Surprise Us
          </button>
          <span className="text-center font-serif text-[0.72rem] italic text-dim">
            Let fate pick the round.
          </span>
        </div>
        <div className="flex flex-col gap-1 sm:flex-1">
          <button
            className={altBtnCls}
            onClick={runNearbySearch}
            disabled={searching}
          >
            <Icon name="pin" size={14} /> Nearby
          </button>
          <span className="text-center font-serif text-[0.72rem] italic text-dim">
            Closest pour, no thinking required.
          </span>
        </div>
        <div className="flex flex-col gap-1 sm:flex-1">
          <button className={altBtnCls} onClick={() => setShowCrawlModal(true)}>
            <Icon name="map" size={14} /> Plan a Crawl
          </button>
          <span className="text-center font-serif text-[0.72rem] italic text-dim">
            String bars together, one stumble at a time.
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useTour } from "@/lib/tour-context";
import { inputCls, chipCls } from "@/lib/ui";

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
    <div className="my-4 rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          className={`${inputCls} min-w-0 flex-[1_1_220px]`}
          placeholder="Search by vibe or neighborhood (optional)"
          value={vibeQuery}
          onChange={(e) => setVibeQuery(e.target.value)}
        />
        <div className="flex items-center gap-1.5 font-mono text-[0.85rem]">
          <span style={{ color: "#857C8E" }}>Group of</span>
          <button
            className="h-[26px] w-[26px] cursor-pointer rounded-[5px] border border-line2 bg-ink text-base leading-none text-brass"
            onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
          >
            −
          </button>
          <b className="text-cream">{groupSize}</b>
          <button
            className="h-[26px] w-[26px] cursor-pointer rounded-[5px] border border-line2 bg-ink text-base leading-none text-brass"
            onClick={() => setGroupSize(groupSize + 1)}
          >
            +
          </button>
        </div>
        <button
          className={`${chipCls} ${
            fitsGroupOnly
              ? "border-green bg-green text-cream"
              : ""
          }`}
          onClick={() => setFitsGroupOnly(!fitsGroupOnly)}
        >
          Fits our group
        </button>
        <button
          className={`${chipCls} ${
            ballerMode ? "border-goldDeep bg-goldDeep text-cream" : ""
          }`}
          onClick={() => setBallerMode(!ballerMode)}
        >
          💰 Baller mode
        </button>
        <button
          className={`${chipCls} ${
            exploreMode ? "border-blue bg-blue text-cream" : ""
          }`}
          onClick={() => setExploreMode(!exploreMode)}
        >
          🧭 Explore mode
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-4">
        <div className="flex flex-[1_1_200px] flex-col items-center gap-1 text-center">
          <button
            className="w-full cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold disabled:cursor-default disabled:opacity-50"
            onClick={runSearch}
            disabled={searching || !vibeQuery.trim()}
          >
            {searching ? "Searching…" : "🔍 Find Bars"}
          </button>
          <span className="font-mono text-[0.65rem] leading-[1.4] text-dim">
            Search for a specific bar or location.
          </span>
        </div>
        <div className="flex flex-[1_1_200px] flex-col items-center gap-1 text-center">
          <button
            className="w-full cursor-pointer rounded-full border border-brass bg-transparent px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-gold hover:bg-[rgba(184,150,95,0.12)] disabled:cursor-default disabled:opacity-50"
            onClick={runRandomSearch}
            disabled={searching}
          >
            🎲 Surprise Us
          </button>
          <span className="font-mono text-[0.65rem] leading-[1.4] text-dim">
            Discover random bars based on your filters.
          </span>
        </div>
        <div className="flex flex-[1_1_200px] flex-col items-center gap-1 text-center">
          <button
            className="w-full cursor-pointer rounded-full border border-greenLight bg-transparent px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-greenLight hover:bg-[rgba(127,168,142,0.12)]"
            onClick={() => setShowCrawlModal(true)}
          >
            🚶 Plan a Crawl
          </button>
          <span className="font-mono text-[0.65rem] leading-[1.4] text-dim">
            Chain nearby bars into a walking route.
          </span>
        </div>
        <div className="flex flex-[1_1_200px] flex-col items-center gap-1 text-center">
          <button
            className="w-full cursor-pointer rounded-full border border-blueLight bg-transparent px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-blueLight hover:bg-[rgba(127,168,201,0.12)] disabled:cursor-default disabled:opacity-50"
            onClick={runNearbySearch}
            disabled={searching}
          >
            📍 Nearby
          </button>
          <span className="font-mono text-[0.65rem] leading-[1.4] text-dim">
            Find one great bar within about a 10 minute walk.
          </span>
        </div>
      </div>
    </div>
  );
}

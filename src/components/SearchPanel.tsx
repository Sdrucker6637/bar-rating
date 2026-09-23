"use client";

import { useTour } from "@/lib/tour-context";
import {
  inputCls,
  chipCls,
  chipActiveCls,
  findBtnCls,
  groupBtnCls,
  kickerCls,
} from "@/lib/ui";
import Icon from "./Icon";
import type { IconName } from "./Icon";

/** A "specials board" row: icon, title, and the house's italic aside. */
function MenuAction({
  icon,
  title,
  aside,
  onClick,
  disabled,
}: {
  icon: IconName;
  title: string;
  aside: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full cursor-pointer items-center gap-3.5 border-b border-line bg-transparent px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-panelHover disabled:cursor-default disabled:opacity-40 sm:flex-col sm:items-start sm:gap-2.5 sm:border-b-0 sm:border-r sm:px-5 sm:py-5 sm:last:border-r-0"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[3px] border border-line2 text-gold transition-colors group-hover:border-brass/60">
        <Icon name={icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-cond text-[1.05rem] font-semibold uppercase tracking-[0.07em] text-cream">
          {title}
        </span>
        <span className="mt-0.5 block font-serif text-[0.9rem] italic text-mute">
          {aside}
        </span>
      </span>
      <Icon
        name="arrowRight"
        size={15}
        className="flex-shrink-0 text-dim transition-colors group-hover:text-gold sm:hidden"
      />
    </button>
  );
}

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
    <div className="mb-10 overflow-hidden rounded-[4px] border border-line bg-panel">
      {/* the query */}
      <div className="p-4 sm:p-6">
        <label htmlFor="tda-vibe" className={kickerCls}>
          Search by vibe
        </label>
        <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute"
            />
            <input
              id="tda-vibe"
              className={`${inputCls} h-12 pl-11 text-[1.08rem]`}
              placeholder="Search by vibe or neighborhood (optional)"
              value={vibeQuery}
              onChange={(e) => setVibeQuery(e.target.value)}
            />
          </div>
          <button
            className={`${findBtnCls} sm:w-44`}
            onClick={runSearch}
            disabled={searching || !vibeQuery.trim()}
          >
            <Icon name="search" size={15} />
            {searching ? "Searching…" : "Find Bars"}
          </button>
        </div>
        <p className="mb-0 mt-2 font-serif text-[0.9rem] italic text-dim">
          Know what you&apos;re after? Type it in.
        </p>
      </div>

      {/* filters + house rules */}
      <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5 sm:px-6">
        <div className="flex items-center justify-between gap-2.5 sm:justify-start sm:gap-5">
          <button
            className={`${chipCls} ${fitsGroupOnly ? chipActiveCls : ""}`}
            aria-pressed={fitsGroupOnly}
            onClick={() => setFitsGroupOnly(!fitsGroupOnly)}
          >
            <Icon name="users" size={14} /> Fits our group
          </button>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 whitespace-nowrap font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] text-mute">
              Group<span className="hidden min-[400px]:inline"> of</span>
            </span>
            <button
              aria-label="Decrease group size"
              className={groupBtnCls}
              disabled={groupSize <= 1}
              onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
            >
              −
            </button>
            <b className="tda-num w-7 text-center font-cond text-[1.25rem] font-semibold text-cream">
              {groupSize}
            </b>
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

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="w-full font-serif text-[0.95rem] italic text-mist sm:w-auto">
            House rules
          </span>
          <button
            className={`${chipCls} ${ballerMode ? chipActiveCls : ""}`}
            aria-pressed={ballerMode}
            onClick={() => setBallerMode(!ballerMode)}
          >
            <Icon name="dollar" size={14} /> Baller mode
          </button>
          <button
            className={`${chipCls} ${exploreMode ? chipActiveCls : ""}`}
            aria-pressed={exploreMode}
            onClick={() => setExploreMode(!exploreMode)}
          >
            <Icon name="compass" size={14} /> Explore mode
          </button>
          <span className="w-full text-[0.8rem] text-dim sm:w-auto">
            — applies to Find Bars &amp; Surprise Us
          </span>
        </div>
      </div>

      {/* the specials: three other ways to pick tonight's bar */}
      <div className="grid grid-cols-1 border-t border-line sm:grid-cols-3">
        <MenuAction
          icon="dice"
          title="Surprise Us"
          aside="Let fate pick the round."
          onClick={runRandomSearch}
          disabled={searching}
        />
        <MenuAction
          icon="pin"
          title="Nearby"
          aside="Closest pour, no thinking required."
          onClick={runNearbySearch}
          disabled={searching}
        />
        <MenuAction
          icon="map"
          title="Plan a Crawl"
          aside="String bars together, one stumble at a time."
          onClick={() => setShowCrawlModal(true)}
        />
      </div>
    </div>
  );
}

"use client";

import { useTour } from "@/lib/tour-context";
import SearchPanel from "./SearchPanel";
import SuggestionCard from "./SuggestionCard";
import BarCard from "./BarCard";
import TabIntro from "./TabIntro";
import { addBtnCls, kickerCls } from "@/lib/ui";

export default function FindView() {
  const {
    searching,
    searchDone,
    searchResults,
    enrichingNames,
    filteredToTry,
    fitsGroupOnly,
    fetchingIds,
    startManualAdd,
    addSuggestionToWishlist,
    rankSuggestion,
    markVisited,
    removeBar,
  } = useTour();

  return (
    <div>
      <TabIntro
        title="Find a New Bar"
        sub="Search by vibe for fresh spots, roll the dice on a surprise pick, or add a bar to the wishlist by name."
      />

      <SearchPanel />

      {searching && (
        <div className="py-6 text-center font-mono text-[0.8rem] text-mute">
          scouting the city…
        </div>
      )}
      {searchDone && !searching && searchResults.length === 0 && (
        <div className="py-10 text-center font-mono text-[0.85rem] text-mute">
          No fresh matches came back — try a different vibe.
        </div>
      )}
      {searchResults.length > 0 && (
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {searchResults.map((s) => (
            <SuggestionCard
              key={s.name}
              s={s}
              isEnriching={enrichingNames.has(s.name)}
              onWishlist={() => addSuggestionToWishlist(s)}
              onVisited={() => rankSuggestion(s)}
            />
          ))}
        </div>
      )}

      <button className={addBtnCls} onClick={() => startManualAdd("wishlist")}>
        + Add to wishlist by name
      </button>

      <div className="mt-10 mb-1">
        <div className={kickerCls}>Wishlist</div>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="m-0 font-serif text-title-md font-medium text-cream">
            Our Wishlist
          </h2>
          <div className="h-px flex-1 bg-line" />
          <span className="font-mono text-[0.7rem] text-mute">
            {filteredToTry.length} bar{filteredToTry.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {filteredToTry.length === 0 && (
          <div className="py-10 text-center font-mono text-[0.85rem] text-mute">
            Nothing on the list yet — use the button above to add one.
          </div>
        )}
        {filteredToTry.map((b) => (
          <BarCard
            key={b.id}
            b={b}
            isFetching={fetchingIds.has(b.id)}
            onNameClick={() => {
              if (b.mapsLink) window.open(b.mapsLink, "_blank");
            }}
            onEdit={() => markVisited(b)}
            editLabel="I visited"
            onDelete={() => removeBar(b.id)}
          />
        ))}
      </div>
      {fitsGroupOnly && filteredToTry.length > 0 && (
        <div className="mt-2 font-mono text-[0.68rem] text-dim">
          Filtered to bars that fit your group size.
        </div>
      )}
    </div>
  );
}

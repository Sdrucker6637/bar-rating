"use client";

import { useTour } from "@/lib/tour-context";
import SearchPanel from "./SearchPanel";
import SuggestionCard from "./SuggestionCard";
import BarCard from "./BarCard";
import TabIntro from "./TabIntro";
import EmptyState from "./EmptyState";
import { btnSecondaryCls } from "@/lib/ui";
import Icon from "./Icon";

export default function FindView() {
  const {
    searching,
    searchDone,
    searchResults,
    enrichingNames,
    filteredToTry,
    fitsGroupOnly,
    fetchingIds,
    detailsPendingIds,
    detailsDeferredIds,
    detailsFailedIds,
    searchFailedNames,
    startManualAdd,
    addSuggestionToWishlist,
    rankSuggestion,
    markVisited,
    removeBar,
  } = useTour();

  return (
    <div>
      <TabIntro
        kicker="Discover"
        title="Where Are We Drinking Tonight?"
        sub="Search by vibe for fresh spots, roll the dice on a surprise pick, or add a bar to the wishlist by name."
      />

      <SearchPanel />

      {searching && (
        <EmptyState
          icon={<Icon name="compass" size={18} />}
          title="Scouting the city…"
          hint="This takes a moment"
        />
      )}
      {searchDone && !searching && searchResults.length === 0 && (
        <EmptyState
          icon={<Icon name="xCircle" size={18} />}
          title="No fresh matches came back."
          hint="Try a different vibe"
        />
      )}
      {searchResults.length > 0 && (
        <div className="mb-10 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {searchResults.map((s) => (
            <SuggestionCard
              key={s.name}
              s={s}
              isEnriching={enrichingNames.has(s.name)}
              isFailed={searchFailedNames.has(s.name)}
              onWishlist={() => addSuggestionToWishlist(s)}
              onVisited={() => rankSuggestion(s)}
            />
          ))}
        </div>
      )}

      <div className="mb-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-cond text-kicker font-semibold uppercase text-greenLight">
            <span aria-hidden="true" className="h-[7px] w-[7px] rotate-45 bg-greenBright" />
            On the list
            <span className="tda-num font-medium text-mute">
              · {filteredToTry.length} bar{filteredToTry.length === 1 ? "" : "s"}
            </span>
          </div>
          <h2 className="m-0 mt-1.5 font-serif text-title-lg font-semibold text-cream">
            Our Wishlist
          </h2>
        </div>
        <button
          className={`${btnSecondaryCls} w-full text-cream sm:w-auto`}
          onClick={() => startManualAdd("wishlist")}
        >
          <span className="text-gold">+</span> Add to wishlist by name
        </button>
      </div>
      <div aria-hidden="true" className="mt-5 h-px bg-line2" />

      <div className="flex flex-col">
        {filteredToTry.length === 0 && (
          <EmptyState
            icon={<Icon name="ledger" size={18} />}
            title="Nothing on the list yet."
            hint="Use the button above to add one"
          />
        )}
        {filteredToTry.map((b) => (
          <BarCard
            key={b.id}
            b={b}
            isFetching={
              fetchingIds.has(b.id) || detailsPendingIds.has(b.id)
            }
            detailsDeferred={detailsDeferredIds.has(b.id)}
            detailsFailed={detailsFailedIds.has(b.id)}
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
        <div className="mt-3 font-serif text-[0.88rem] italic text-dim">
          Filtered to bars that fit your group size.
        </div>
      )}
    </div>
  );
}

"use client";

import { useTour } from "@/lib/tour-context";
import { avgWithFood, avgWithoutFood, fmt } from "@/lib/scoring";
import BarCard from "./BarCard";
import TabIntro from "./TabIntro";
import EmptyState from "./EmptyState";
import { addBtnCls, inputCls, kickerCls } from "@/lib/ui";

export default function LeaderboardView() {
  const {
    filteredVisited,
    search,
    setSearch,
    foodMode,
    setFoodMode,
    fetchingIds,
    startManualAdd,
    editVisited,
    removeBar,
    toggleDisqualify,
  } = useTour();

  const champ = filteredVisited.length > 0 ? filteredVisited[0] : null;
  const champScore = champ
    ? foodMode === "with"
      ? avgWithFood(champ)
      : avgWithoutFood(champ)
    : null;

  return (
    <div>
      <TabIntro
        title="Tonight's Rankings"
        sub="Where we stand — every rated bar ranked by average score across vibe, value, service, food, and drinks."
      />

      {champ && (
        <div className="relative mb-6 overflow-hidden rounded-lg border border-brass bg-gradient-to-br from-[rgba(184,150,95,0.1)] to-transparent px-6 py-5">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-brass/50"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-[4px] h-px bg-brass/20"
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className={kickerCls}>🏆 The House Record</div>
              <div className="mt-1.5 font-serif text-title-lg font-medium text-cream">
                {champ.name}
              </div>
              <div className="mt-1 font-serif text-[0.85rem] italic text-mist">
                Nothing else comes close.
              </div>
            </div>
            <div className="font-mono text-display leading-none text-gold">
              {fmt(champScore)}
            </div>
          </div>
        </div>
      )}

      <button className={addBtnCls} onClick={() => startManualAdd("visited")}>
        + Add a bar you visited &amp; rank it
      </button>

      <div className={`${kickerCls} mt-6 mb-2`}>Refine the Field</div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-panel px-4 py-3.5">
        <input
          className={`${inputCls} min-w-0 flex-[1_1_200px]`}
          placeholder="Search name, neighborhood, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="inline-flex overflow-hidden rounded-full border border-line2">
          <button
            className={`px-3.5 py-1.5 font-mono text-[0.72rem] ${
              foodMode === "with"
                ? "bg-brass font-semibold text-deep"
                : "bg-transparent text-mist"
            }`}
            onClick={() => setFoodMode("with")}
          >
            With food
          </button>
          <button
            className={`px-3.5 py-1.5 font-mono text-[0.72rem] ${
              foodMode === "without"
                ? "bg-brass font-semibold text-deep"
                : "bg-transparent text-mist"
            }`}
            onClick={() => setFoodMode("without")}
          >
            Without food
          </button>
        </div>
      </div>

      {filteredVisited.length > 0 && (
        <div className="tda-ornament my-5" aria-hidden="true">
          — · — · —
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {filteredVisited.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No stages match that search yet."
            hint="Try a different name or neighborhood"
          />
        )}
        {(() => {
          let rankCounter = 0;
          return filteredVisited.map((b) => {
            const ranked = !b.disqualified;
            if (ranked) rankCounter++;
            return (
              <BarCard
                key={b.id}
                b={b}
                rank={ranked ? rankCounter : null}
                score={foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b)}
                scoreLabel={foodMode === "with" ? "with food" : "no food"}
                isFetching={fetchingIds.has(b.id)}
                onNameClick={() => {
                  if (b.mapsLink) window.open(b.mapsLink, "_blank");
                }}
                onEdit={() => editVisited(b)}
                onDelete={() => removeBar(b.id)}
                onDisqualify={() => toggleDisqualify(b)}
              />
            );
          });
        })()}
      </div>
    </div>
  );
}

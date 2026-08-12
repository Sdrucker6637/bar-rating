"use client";

import { useTour } from "@/lib/tour-context";
import { avgWithFood, avgWithoutFood, fmt } from "@/lib/scoring";
import BarCard from "./BarCard";
import TabIntro from "./TabIntro";
import EmptyState from "./EmptyState";
import {
  addBtnCls,
  inputCls,
  kickerCls,
  chipCls,
  chipActiveCls,
  cardBaseShadowCls,
  cardWarmSurfaceCls,
} from "@/lib/ui";
import Icon from "./Icon";

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
        <div className="relative mb-8 overflow-hidden rounded-lg border border-brass/30 bg-panel">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-brass/60"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-[5px] h-px bg-brass/20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_120%_at_15%_-10%,rgba(184,150,95,0.1),transparent_60%)]"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-5 px-6 py-6 sm:px-8 sm:py-7">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-kicker uppercase text-gold">
                <Icon name="trophy" size={13} />
                The House Record
              </div>
              <div className="mt-2.5 font-serif text-title-lg font-medium leading-tight text-cream sm:text-[1.75rem]">
                {champ.name}
              </div>
              <div className="mt-1.5 font-serif text-[0.85rem] italic text-mist">
                Nothing else comes close.
              </div>
              {champ.neighborhood && (
                <div className="mt-3 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-mute">
                  {champ.neighborhood}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 self-center">
              <div className="min-w-[136px] rounded-[6px] border border-brass/30 bg-ink/70 px-5 py-4 text-center shadow-[inset_0_1px_0_rgba(237,230,217,0.04)]">
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-mute">
                  House average
                </div>
                <div className="mt-1.5 font-mono text-display leading-none text-gold">
                  {fmt(champScore)}
                </div>
                <div
                  className="mx-auto mt-2.5 h-px w-8 bg-brass/50"
                  aria-hidden="true"
                />
                <div className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mute">
                  {foodMode === "with" ? "with food" : "no food"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button className={addBtnCls} onClick={() => startManualAdd("visited")}>
        + Add a bar you visited &amp; rank it
      </button>

      <div className={`${kickerCls} mt-6 mb-2`}>Refine the Field</div>
      <div
        className={`mb-4 flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-panel px-4 py-3.5 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
      >
        <input
          className={`${inputCls} min-w-0 flex-[1_1_200px]`}
          placeholder="Search name, neighborhood, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="inline-flex gap-1.5">
          <button
            className={`${chipCls} ${foodMode === "with" ? chipActiveCls : ""}`}
            onClick={() => setFoodMode("with")}
          >
            With food
          </button>
          <button
            className={`${chipCls} ${foodMode === "without" ? chipActiveCls : ""}`}
            onClick={() => setFoodMode("without")}
          >
            Without food
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {filteredVisited.length === 0 && (
          <EmptyState
            icon={<Icon name="search" size={15} />}
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

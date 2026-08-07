"use client";

import { useTour } from "@/lib/tour-context";
import { avgWithFood, avgWithoutFood, fmt } from "@/lib/scoring";
import BarCard from "./BarCard";
import TabIntro from "./TabIntro";
import { addBtnCls, inputCls } from "@/lib/ui";

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
        title="Current Leaderboard"
        sub="Where we stand — every rated bar ranked by average score across vibe, value, service, food, and drinks."
      />

      {champ && (
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[4px] border border-brass px-5 py-4"
          style={{
            background:
              "linear-gradient(135deg,rgba(184,150,95,0.08),transparent)",
          }}
        >
          <div>
            <div className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-gold">
              🏆 Reigning Champion
            </div>
            <div className="mt-1 font-serif text-[1.6rem] font-medium">
              {champ.name}
            </div>
          </div>
          <div className="font-mono text-3xl font-semibold text-gold">
            {fmt(champScore)}
          </div>
        </div>
      )}

      <button
        className={addBtnCls}
        onClick={() => startManualAdd("visited")}
      >
        + Add a bar you visited &amp; rank it
      </button>

      <div className="my-4 flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-panel px-4 py-3.5">
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

      <div className="mt-4 flex flex-col gap-2.5">
        {filteredVisited.length === 0 && (
          <div className="py-10 text-center font-mono text-[0.85rem] text-mute">
            No stages match that search yet.
          </div>
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
                score={
                  foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b)
                }
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

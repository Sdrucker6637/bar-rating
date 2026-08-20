"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTour } from "@/lib/tour-context";
import { avgWithFood, avgWithoutFood, fmt } from "@/lib/scoring";
import { battleDecidedBarIds, pendingBattlePairs } from "@/lib/ranking";
import type { Bar } from "@/lib/types";
import BarCard from "./BarCard";
import TabIntro from "./TabIntro";
import EmptyState from "./EmptyState";
import BattleModal from "./modals/BattleModal";
import {
  addBtnCls,
  inputCls,
  kickerCls,
  chipCls,
  cardBaseShadowCls,
  cardWarmSurfaceCls,
} from "@/lib/ui";
import Icon from "./Icon";

// Session-scoped (module-level, survives tab switches): the Bar Battle modal
// auto-opens the first time an unresolved tie is seen, but never re-pops on
// its own after the user dismisses it.
let autoBattlePrompted = false;

// Leaderboard ordering. "overall" is the default ranking (score desc, Bar
// Battle tiebreak); the category modes reorder the same list by a single
// sub-score so the field can be read by value, food, drinks, vibe, or
// service.
type SortMode = "overall" | "value" | "food" | "drinks" | "vibe" | "service";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "value", label: "Value" },
  { key: "food", label: "Food" },
  { key: "drinks", label: "Drinks" },
  { key: "vibe", label: "Vibe" },
  { key: "service", label: "Service" },
];

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
    rankingBattles,
    recordBattle,
  } = useTour();

  // Pairs of bars that share a score and still need a global Bar Battle to
  // decide their order. Derived from the live shared state, so recording a
  // battle shrinks this list immediately.
  const rankedEntries = useMemo(
    () =>
      filteredVisited.map((b) => ({
        item: b,
        score: foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b),
      })),
    [filteredVisited, foodMode],
  );
  const pendingPairs = useMemo(
    () => pendingBattlePairs(rankedEntries, rankingBattles),
    [rankedEntries, rankingBattles],
  );
  // Bars whose position in a score tie was decided by a Bar Battle — they
  // get a small ⚔️ next to their score so the tiebreak is legible.
  const battleDecidedIds = useMemo(
    () => battleDecidedBarIds(rankedEntries, rankingBattles),
    [rankedEntries, rankingBattles],
  );

  const [battleOpen, setBattleOpen] = useState(false);

  const [sortMode, setSortMode] = useState<SortMode>("overall");
  // The six sort options live behind one compact control so the filter row
  // stays uncluttered — search first, food filter second, sort as a quiet
  // secondary control.
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close the sort dropdown on outside tap, Escape, or scroll — the same
  // dismissal conventions as the app's other menus.
  useEffect(() => {
    if (!sortOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    const onScroll = () => setSortOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [sortOpen]);

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.key === sortMode)?.label ?? "Overall";

  // "Sort by category" view: reorder the ranked bars by one sub-score (desc,
  // unset last), breaking ties by the overall average then name. Disqualified
  // bars stay at the bottom, mirroring the default ranking view. The default
  // "Overall" mode returns the existing battle-aware order untouched.
  const displayBars = useMemo(() => {
    if (sortMode === "overall") return filteredVisited;
    const attr = sortMode as keyof Pick<
      Bar,
      "value" | "food" | "drinks" | "vibe" | "service"
    >;
    const overall = (b: Bar) =>
      foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b);
    const byAttr = (a: Bar, b: Bar) => {
      const va = a[attr];
      const vb = b[attr];
      if (va !== null && va !== undefined && vb !== null && vb !== undefined) {
        if (vb !== va) return vb - va;
      } else if (va !== null && va !== undefined) return -1;
      else if (vb !== null && vb !== undefined) return 1;
      return (
        (overall(b) || 0) - (overall(a) || 0) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id)
      );
    };
    const ranked = filteredVisited.filter((b) => !b.disqualified);
    const dq = filteredVisited.filter((b) => b.disqualified);
    return [...ranked].sort(byAttr).concat([...dq].sort(byAttr));
  }, [filteredVisited, sortMode, foodMode]);

  // When the leaderboard first shows an unresolved tie, surface the Bar
  // Battle once per browser session (dismissing it leaves the "Settle ties"
  // button in place — the user decides when to continue).
  useEffect(() => {
    if (pendingPairs.length > 0 && !autoBattlePrompted) {
      autoBattlePrompted = true;
      setBattleOpen(true);
    }
  }, [pendingPairs.length]);

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
          <div className="relative flex flex-col gap-5 px-6 py-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-8 sm:py-7">
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
            <div className="flex-shrink-0 sm:self-center">
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
        className={`mb-4 flex flex-col gap-3 rounded-lg border border-line bg-panel px-4 py-3.5 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
      >
        <input
          className={inputCls}
          placeholder="Search name, neighborhood, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* Controls never wrap: the food toggle and sort control always share
            one row, with the sort filling the right side. On narrow screens
            the "Sort by" word hides and the trigger shows just the current
            sort so the two still fit side by side. */}
        <div className="flex items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Food filter"
            className="inline-flex rounded-full border border-[rgba(184,150,95,0.28)] bg-ink p-0.5"
          >
            <button
              type="button"
              aria-pressed={foodMode === "with"}
              onClick={() => setFoodMode("with")}
              className={`rounded-full px-2 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.03em] transition-colors duration-150 ${
                foodMode === "with"
                  ? "bg-brass text-deep"
                  : "text-mist hover:text-cream"
              }`}
            >
              With food
            </button>
            <button
              type="button"
              aria-pressed={foodMode === "without"}
              onClick={() => setFoodMode("without")}
              className={`rounded-full px-2 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.03em] transition-colors duration-150 ${
                foodMode === "without"
                  ? "bg-brass text-deep"
                  : "text-mist hover:text-cream"
              }`}
            >
              Without food
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            {pendingPairs.length > 0 && (
              <button
                className={`${chipCls} !border-goldDeep/60 !text-gold hover:!border-gold`}
                onClick={() => setBattleOpen(true)}
              >
                <Icon name="swords" size={12} />
                Settle {pendingPairs.length} tie
                {pendingPairs.length === 1 ? "" : "s"}
              </button>
            )}
            <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border px-2 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.04em] transition-colors duration-150 ${
              sortOpen
                ? "border-brass bg-[rgba(184,150,95,0.08)] text-cream"
                : "border-[rgba(184,150,95,0.22)] bg-transparent text-mist hover:border-brass hover:text-cream"
            }`}
          >
            <span className="hidden text-mute sm:inline">Sort by</span>{" "}
            <span
              className={sortMode === "overall" ? "text-mist" : "text-gold"}
            >
              {currentSortLabel}
            </span>
            <Icon
              name="chevronDown"
              size={10}
              className={`transition-transform duration-150 ${
                sortOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {sortOpen && (
            <div
              role="listbox"
              aria-label="Sort leaderboard by"
              className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-[8px] border border-line bg-panel py-1.5 shadow-[inset_0_1px_0_rgba(237,230,217,0.04),0_18px_40px_rgba(0,0,0,0.55)]"
            >
              {SORT_OPTIONS.map((o) => {
                const selected = sortMode === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setSortMode(o.key);
                      setSortOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left font-mono text-[0.72rem] uppercase tracking-[0.04em] transition-colors duration-100 ${
                      selected
                        ? "bg-[rgba(184,150,95,0.1)] text-gold"
                        : "text-mist hover:bg-[rgba(184,150,95,0.06)] hover:text-cream"
                    }`}
                  >
                    {o.label}
                    {selected && (
                      <Icon name="check" size={11} className="text-gold" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </div>
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
          return displayBars.map((b) => {
            const ranked = !b.disqualified;
            if (ranked) rankCounter++;
            return (
              <BarCard
                key={b.id}
                b={b}
                rank={ranked ? rankCounter : null}
                score={foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b)}
                scoreLabel={foodMode === "with" ? "with food" : "no food"}
                battleDecided={
                  sortMode === "overall" && battleDecidedIds.has(b.id)
                }
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

      {battleOpen && (
        <BattleModal
          pairs={pendingPairs}
          onResolve={recordBattle}
          onClose={() => setBattleOpen(false)}
        />
      )}
    </div>
  );
}

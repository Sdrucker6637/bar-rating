"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTour } from "@/lib/tour-context";
import { avgWithFood, avgWithoutFood } from "@/lib/scoring";
import { battleDecidedBarIds, pendingBattlePairs } from "@/lib/ranking";
import type { Bar } from "@/lib/types";
import TabIntro from "./TabIntro";
import EmptyState from "./EmptyState";
import BattleModal from "./modals/BattleModal";
import {
  LeaderFeature,
  PodiumCard,
  StandingRow,
  HorsCourseRow,
  STANDINGS_GRID,
  MOBILE_SCORE_HEAD,
} from "./Standings";
import type { StandingProps } from "./Standings";
import { SCORE_CATS } from "./Scorecard";
import type { ScoreKey } from "./Scorecard";
import { SectionRule } from "./Ornament";
import { useFlip } from "@/lib/useFlip";
import {
  btnPrimaryCls,
  inputCls,
  segmentWrapCls,
  segmentBtnCls,
  segmentBtnActiveCls,
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
    detailsPendingIds,
    detailsDeferredIds,
    detailsFailedIds,
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
  const scoreOf = (b: Bar) =>
    foodMode === "with" ? avgWithFood(b) : avgWithoutFood(b);
  const scoreLabel = foodMode === "with" ? "with food" : "no food";
  const overallMode = sortMode === "overall";
  const highlight: ScoreKey | null = overallMode ? null : sortMode;

  // Ranks exactly as before: position among non-disqualified bars in the
  // displayed order; disqualified bars carry no rank.
  const standings = useMemo(() => {
    let rankCounter = 0;
    return displayBars.map((b) => ({
      b,
      rank: b.disqualified ? null : ++rankCounter,
    }));
  }, [displayBars]);

  // The featured leader is the board's #1 (the overall champion), shown
  // only while it's actually in the running.
  const leader = champ && !champ.disqualified ? champ : null;
  const leaderScore = leader ? scoreOf(leader) : null;
  // Display-only: distance to the leader, on the overall ranking.
  const gapFor = (b: Bar): number | null => {
    if (!overallMode || leaderScore === null || leaderScore === undefined)
      return null;
    const s = scoreOf(b);
    if (s === null || s === undefined || isNaN(s)) return null;
    return Math.max(0, leaderScore - s);
  };
  const runnerUpBar = filteredVisited.find(
    (b, i) => i > 0 && !b.disqualified,
  );
  const runnerUp =
    leader && runnerUpBar
      ? (() => {
          const s = scoreOf(runnerUpBar);
          return {
            name: runnerUpBar.name,
            gap:
              leaderScore !== null &&
              leaderScore !== undefined &&
              s !== null &&
              s !== undefined
                ? Math.max(0, leaderScore - s)
                : null,
          };
        })()
      : null;

  // Overall: #1 is the feature, #2–3 the podium, #4+ the field.
  // By category: the feature stays the overall leader and the whole field
  // is re-ranked by that category underneath it.
  const podium = overallMode
    ? standings.filter((s) => s.rank === 2 || s.rank === 3)
    : [];
  const field = standings.filter(
    (s) =>
      s.rank !== null && (overallMode ? s.rank > 3 : true),
  );
  const horsCourse = standings.filter((s) => s.rank === null);

  const propsFor = (b: Bar, rank: number | null): StandingProps => ({
    b,
    rank,
    score: scoreOf(b),
    gap: gapFor(b),
    highlight,
    battleDecided: overallMode && battleDecidedIds.has(b.id),
    isFetching: fetchingIds.has(b.id) || detailsPendingIds.has(b.id),
    detailsDeferred: detailsDeferredIds.has(b.id),
    detailsFailed: detailsFailedIds.has(b.id),
    onEdit: () => editVisited(b),
    onDelete: () => removeBar(b.id),
    onDisqualify: () => toggleDisqualify(b),
  });

  // Re-rankings (food toggle, sort) glide rows to their new places.
  const boardRef = useRef<HTMLDivElement>(null);
  const snapshot = useFlip(boardRef);

  const addButton = (
    <button
      className={`${btnPrimaryCls} w-full sm:w-auto`}
      onClick={() => startManualAdd("visited")}
    >
      <Icon name="trophy" size={15} />
      Add a bar you visited &amp; rank it
    </button>
  );

  return (
    <div>
      <TabIntro
        kicker="General Classification"
        title="Tonight's Rankings"
        sub="Where we stand — every rated bar ranked by average score across vibe, value, service, food, and drinks."
        action={addButton}
      />

      <div ref={boardRef}>
        {leader && (
          <LeaderFeature
            {...propsFor(leader, 1)}
            gap={null}
            battleDecided={battleDecidedIds.has(leader.id)}
            highlight={highlight}
            runnerUp={runnerUp}
            scoreLabel={scoreLabel}
            categoryMode={!overallMode}
          />
        )}

        {/* The results sheet's controls */}
        <div className="mb-5 mt-7 flex flex-col gap-2.5 sm:mt-9 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute"
            />
            <input
              className={`${inputCls} pl-10`}
              placeholder="Search name, neighborhood, notes…"
              aria-label="Search the leaderboard"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* flex-wrap is the safety net on narrow phones: while a tie is
              pending, the ties control drops to its own line instead of
              clipping off-screen. */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Food filter"
              className={`${segmentWrapCls} flex-shrink-0`}
            >
              <button
                type="button"
                aria-pressed={foodMode === "with"}
                onClick={() => {
                  snapshot();
                  setFoodMode("with");
                }}
                className={`${segmentBtnCls} ${
                  foodMode === "with" ? segmentBtnActiveCls : ""
                }`}
              >
                With food
              </button>
              <button
                type="button"
                aria-pressed={foodMode === "without"}
                onClick={() => {
                  snapshot();
                  setFoodMode("without");
                }}
                className={`${segmentBtnCls} ${
                  foodMode === "without" ? segmentBtnActiveCls : ""
                }`}
              >
                Without food
              </button>
            </div>

            <div className="relative ml-auto lg:ml-0" ref={sortRef}>
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                className={`inline-flex h-[40px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-[3px] border px-3 font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] transition-colors duration-150 ${
                  sortOpen
                    ? "border-brass/70 bg-oak text-cream"
                    : "border-line2 bg-transparent text-mist hover:border-mute hover:text-cream"
                }`}
              >
                <span className="hidden text-mute sm:inline">Rank by</span>
                <span className={overallMode ? "text-cream" : "text-gold"}>
                  {currentSortLabel}
                </span>
                <Icon
                  name="chevronDown"
                  size={12}
                  className={`transition-transform duration-150 ${
                    sortOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {sortOpen && (
                <div
                  role="listbox"
                  aria-label="Sort leaderboard by"
                  className="absolute right-0 top-full z-50 mt-1.5 w-48 animate-[tda-rise_160ms_ease-out] overflow-hidden rounded-[4px] border border-line2 bg-oak py-1 shadow-menu"
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
                          snapshot();
                          setSortMode(o.key);
                          setSortOpen(false);
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left font-cond text-[0.95rem] font-semibold uppercase tracking-[0.07em] transition-colors duration-100 ${
                          selected
                            ? "text-cream"
                            : "text-mist hover:bg-[rgba(241,232,214,0.05)] hover:text-cream"
                        }`}
                      >
                        {o.label}
                        {selected && (
                          <Icon name="check" size={13} className="text-gold" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {pendingPairs.length > 0 && (
              <button
                className="inline-flex h-[40px] flex-shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[3px] border border-brass/60 bg-[rgba(201,162,106,0.1)] px-3 font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] text-cream transition-colors hover:border-brass hover:bg-[rgba(201,162,106,0.18)]"
                onClick={() => setBattleOpen(true)}
              >
                <Icon name="swords" size={14} className="text-gold" />
                Settle {pendingPairs.length} tie
                {pendingPairs.length === 1 ? "" : "s"}
              </button>
            )}
          </div>
        </div>

        {filteredVisited.length === 0 && (
          <EmptyState
            icon={<Icon name="search" size={18} />}
            title="No stages match that search yet."
            hint="Try a different name or neighborhood"
          />
        )}

        {podium.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {podium.map(({ b, rank }) => (
              <PodiumCard
                key={b.id}
                {...propsFor(b, rank)}
                rank={rank as 2 | 3}
              />
            ))}
          </div>
        )}

        {field.length > 0 && (
          <section aria-label="Classification">
            <SectionRule
              label={
                overallMode
                  ? "The Field"
                  : `Ranked by ${currentSortLabel.toLowerCase()}`
              }
              meta={`${field.length} bar${field.length === 1 ? "" : "s"}`}
            />
            {/* column heads — once, like a printed results sheet */}
            <div
              aria-hidden="true"
              className={`mt-3 hidden border-b border-line2 px-3 pb-2 font-cond text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-mute lg:grid ${STANDINGS_GRID}`}
            >
              <span>Pos</span>
              <span>Bar</span>
              <span className="grid grid-cols-5 gap-x-3 text-center">
                {SCORE_CATS.map((c) => (
                  <span
                    key={c.key}
                    className={highlight === c.key ? "text-gold" : ""}
                  >
                    {c.label}
                  </span>
                ))}
              </span>
              <span className="text-right">Score</span>
              <span className="text-right">{overallMode ? "Gap" : ""}</span>
              <span />
            </div>
            <div
              aria-hidden="true"
              className={`mt-3 border-b border-line2 pb-2 ${MOBILE_SCORE_HEAD}`}
            >
              <span />
              <span className="grid grid-cols-5 gap-x-2.5 text-center font-cond text-[0.74rem] font-semibold uppercase tracking-[0.1em] text-mute sm:max-w-[28rem] sm:gap-x-3">
                {SCORE_CATS.map((c) => (
                  <span
                    key={c.key}
                    className={highlight === c.key ? "text-gold" : ""}
                  >
                    {c.label}
                  </span>
                ))}
              </span>
            </div>
            <div>
              {field.map(({ b, rank }) => (
                <StandingRow key={b.id} {...propsFor(b, rank)} />
              ))}
            </div>
          </section>
        )}

        {horsCourse.length > 0 && (
          <section aria-label="Disqualified" className="mt-10">
            <SectionRule
              label="Hors course"
              meta="Disqualified"
              accent="#A8453F"
            />
            <div className="mt-2 border-t border-line2">
              {horsCourse.map(({ b }) => (
                <HorsCourseRow key={b.id} {...propsFor(b, null)} />
              ))}
            </div>
          </section>
        )}
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

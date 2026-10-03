"use client";

import { useId, useMemo, useState } from "react";
import { useTour } from "@/lib/tour-context";
import { crewStandings, pickerOf } from "@/lib/crew";
import type { CrewEntry } from "@/lib/crew";
import { fmt } from "@/lib/scoring";
import ScoreSeal from "./ScoreSeal";
import EmptyState from "./EmptyState";
import Icon from "./Icon";
import { SectionRule } from "./Ornament";
import CrewCharts from "./CrewCharts";

/* ------------------------------------------------------------------------
 * The Crew — a second classification, of people rather than bars. Each
 * person (and The App) is ranked by the average score of the bars they
 * picked. Same visual grammar as the bar board: #1 gets the maillot feature,
 * everyone else a classification row that expands to show their picks.
 * ---------------------------------------------------------------------- */

const PODIUM_METAL: Record<number, string> = { 2: "#C4C1C7", 3: "#B57E52" };

function PickerName({ e, className = "" }: { e: CrewEntry; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {e.isApp && (
        <span
          aria-hidden="true"
          className="inline-flex h-[1.5em] w-[1.5em] flex-shrink-0 items-center justify-center rounded-[3px] border border-brass/50 bg-[rgba(201,162,106,0.12)] text-gold"
        >
          <Icon name="dice" size={15} />
        </span>
      )}
      <span className="truncate">{e.name}</span>
    </span>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="font-cond text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-mute">
        {label}
      </div>
      <div
        className={`tda-num mt-0.5 truncate font-cond text-[1.35rem] font-semibold leading-none ${
          accent ? "text-gold" : "text-cream"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/** One person's picks, best-placed first — the fold under each entry. */
function PickList({ e, id }: { e: CrewEntry; id: string }) {
  return (
    <ol id={id} className="m-0 list-none animate-[tda-rise_220ms_cubic-bezier(0.2,0.7,0.2,1)] p-0">
      {e.picks.map(({ bar, score, rank }) => (
        <li
          key={bar.id}
          className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-line/70 py-2 first:border-t-0"
        >
          <span className="tda-num font-cond text-[0.95rem] font-semibold text-mute">
            {bar.disqualified ? (
              <span className="text-red">DQ</span>
            ) : rank !== null ? (
              `#${rank}`
            ) : (
              "—"
            )}
          </span>
          <span
            className={`truncate font-serif text-[1rem] ${
              bar.disqualified ? "text-mute line-through decoration-claret/60" : "text-creamSoft"
            }`}
          >
            {bar.name}
            {bar.neighborhood && (
              <span className="ml-2 font-sans text-[0.8rem] text-dim">{bar.neighborhood}</span>
            )}
          </span>
          <span className="tda-num font-cond text-[1.05rem] font-semibold text-cream">
            {fmt(score)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ExpandToggle({
  open,
  controls,
  label,
  onClick,
}: {
  open: boolean;
  controls: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? "Hide" : "Show"} ${label}'s picks`}
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] text-mute transition-colors hover:bg-[rgba(241,232,214,0.06)] hover:text-cream"
    >
      <Icon
        name="chevronDown"
        size={14}
        className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function CrewLeader({ e }: { e: CrewEntry }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <section
      aria-label={`Best palate: ${e.name}`}
      className="relative overflow-hidden rounded-[4px] border border-line2 bg-oak"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-maillot" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_0%_0%,rgba(240,199,90,0.09),transparent_65%)]"
      />
      <div
        onClick={() => setOpen((o) => !o)}
        className="relative grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 pb-5 pt-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-8 sm:px-8 sm:pb-6 sm:pt-8"
      >
        <div className="order-2 sm:order-1">
          <ScoreSeal score={e.average} size={96} tone="leader" countUp label="avg" className="sm:hidden" />
          <ScoreSeal score={e.average} size={132} tone="leader" countUp label="avg" className="hidden sm:inline-flex" />
        </div>
        <div className="order-1 min-w-0 sm:order-2">
          <div className="flex items-center gap-2.5">
            <span className="tda-num inline-flex h-7 min-w-[1.9rem] items-center justify-center rounded-[2px] bg-maillot px-1.5 font-cond text-[1.2rem] font-bold leading-none text-deep shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)]">
              1
            </span>
            <span className="font-cond text-kicker font-semibold uppercase text-maillot">
              {e.isApp ? "The machine leads" : "Best palate"}
            </span>
          </div>
          <h3 className="m-0 mt-3 font-serif text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.02em] text-cream sm:text-[2.6rem]">
            <PickerName e={e} />
          </h3>
          {e.best && (
            <p className="mb-0 mt-2.5 font-serif text-[1rem] italic leading-snug text-creamSoft">
              Best find: {e.best.bar.name}
              {e.best.rank !== null && (
                <span className="not-italic text-mute"> · #{e.best.rank} overall</span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="relative flex items-end gap-4 border-t border-line2 px-5 py-4 sm:px-8">
        <div className="grid flex-1 grid-cols-3 gap-4 sm:max-w-[26rem]">
          <Stat label="Picks" value={e.picks.length} />
          <Stat label="Podiums" value={e.podiums} accent={e.podiums > 0} />
          <Stat label="Top pick" value={fmt(e.best?.score)} accent={e.holdsLead} />
        </div>
        <span className="ml-auto" />
        <ExpandToggle open={open} controls={listId} label={e.name} onClick={() => setOpen((o) => !o)} />
      </div>
      {open && (
        <div className="relative border-t border-line2 px-5 pb-2 pt-1 sm:px-8">
          <PickList e={e} id={listId} />
        </div>
      )}
    </section>
  );
}

function CrewRow({ e, rank }: { e: CrewEntry; rank: number | null }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const metal = rank !== null ? PODIUM_METAL[rank] : undefined;
  return (
    <div className="border-b border-line">
      <div
        onClick={() => setOpen((o) => !o)}
        className={`grid cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)_auto_2rem] items-center gap-x-3 px-1 py-3.5 transition-colors hover:bg-panelHover/70 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto_auto_2.25rem] sm:gap-x-5 sm:px-3 ${
          open ? "bg-panel" : ""
        }`}
      >
        <span
          className="tda-num font-cond text-[1.6rem] font-bold leading-none text-mist"
          style={metal ? { color: metal } : undefined}
        >
          {rank ?? "—"}
        </span>
        <div className="min-w-0">
          <div className="font-serif text-[1.12rem] font-medium leading-snug text-cream">
            <PickerName e={e} className="max-w-full" />
          </div>
          <div className="mt-0.5 truncate text-[0.84rem] text-mute">
            {e.picks.length} pick{e.picks.length === 1 ? "" : "s"}
            {e.best && (
              <>
                <span aria-hidden="true" className="px-1.5 text-dim">·</span>
                best: <span className="font-serif italic text-mist">{e.best.bar.name}</span>
              </>
            )}
            {e.disqualified > 0 && (
              <>
                <span aria-hidden="true" className="px-1.5 text-dim">·</span>
                <span className="text-red">{e.disqualified} DQ</span>
              </>
            )}
          </div>
        </div>
        <div className="hidden text-center sm:block">
          <div className="font-cond text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-mute">
            Podiums
          </div>
          <div className={`tda-num font-cond text-[1.15rem] font-semibold leading-tight ${e.podiums > 0 ? "text-gold" : "text-dim"}`}>
            {e.podiums}
          </div>
        </div>
        <div className="text-right">
          <div className="tda-num font-cond text-[1.55rem] font-semibold leading-none text-cream">
            {fmt(e.average)}
          </div>
          <div className="mt-0.5 font-cond text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-mute">
            avg
          </div>
        </div>
        <ExpandToggle open={open} controls={listId} label={e.name} onClick={() => setOpen((o) => !o)} />
      </div>
      {open && (
        <div className="bg-panel pb-2 pl-[3.25rem] pr-2 sm:pl-[4.5rem] sm:pr-4">
          <PickList e={e} id={listId} />
        </div>
      )}
    </div>
  );
}

/** People vs. The App — a tug-of-war bar between the two averages. */
function ManVsMachine({ people, app }: { people: CrewEntry[]; app: CrewEntry }) {
  const scored = people.flatMap((e) => e.picks.filter((p) => p.score !== null));
  if (scored.length === 0 || app.average === null) return null;
  const humanAvg = scored.reduce((s, p) => s + (p.score as number), 0) / scored.length;
  const appAvg = app.average;
  const humanShare = (humanAvg / (humanAvg + appAvg || 1)) * 100;
  const humansLead = humanAvg >= appAvg;
  return (
    <section aria-label="People versus the app" className="mt-8 rounded-[4px] border border-line bg-panel px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between font-cond text-kicker font-semibold uppercase">
        <span className={humansLead ? "text-gold" : "text-mute"}>The Crew</span>
        <span className="text-dim">vs</span>
        <span className={!humansLead ? "text-gold" : "text-mute"}>The App</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="tda-num w-12 font-cond text-[1.5rem] font-semibold leading-none text-cream">
          {fmt(humanAvg)}
        </span>
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-[2px] bg-well">
          <span
            className="absolute inset-y-0 left-0 bg-brass transition-[width] duration-500"
            style={{ width: `${humanShare}%` }}
          />
          <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-deep/80" />
        </div>
        <span className="tda-num w-12 text-right font-cond text-[1.5rem] font-semibold leading-none text-cream">
          {fmt(appAvg)}
        </span>
      </div>
      <p className="mb-0 mt-3 text-center font-serif text-[0.92rem] italic text-mist">
        {Math.abs(humanAvg - appAvg) < 0.005
          ? "Dead heat. Flesh and silicon, perfectly matched."
          : humansLead
            ? "Human taste is holding the line — for now."
            : "The algorithm is out-drinking you. Embarrassing."}
      </p>
    </section>
  );
}

export default function CrewBoard() {
  const { visited, rankingBattles, foodMode, editVisited } = useTour();
  const crew = useMemo(
    () => crewStandings(visited, rankingBattles, foodMode),
    [visited, rankingBattles, foodMode],
  );
  const uncredited = useMemo(() => visited.filter((b) => !pickerOf(b)), [visited]);
  const [showUncredited, setShowUncredited] = useState(false);

  const ranked = crew.filter((e) => e.average !== null);
  const unscored = crew.filter((e) => e.average === null);
  const leader = ranked[0] ?? null;
  const rest = ranked.slice(1);
  const app = crew.find((e) => e.isApp);
  const people = crew.filter((e) => !e.isApp);

  if (crew.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Icon name="users" size={18} />}
          title="Nobody's claimed a bar yet."
          hint="When you rank a bar, fill in “Picked by” with whoever found it — or mark that the app chose it. Names match even if capitalization or spacing differs, so each person's picks always add up in one place."
        />
        {uncredited.length > 0 && (
          <UncreditedList
            bars={uncredited}
            open={showUncredited}
            onToggle={() => setShowUncredited((o) => !o)}
            onEdit={editVisited}
          />
        )}
      </>
    );
  }

  return (
    <div>
      {leader && <CrewLeader e={leader} />}

      {rest.length > 0 && (
        <section aria-label="Crew classification" className="mt-8">
          <SectionRule
            label="The Crew"
            meta={`ranked by average pick · ${foodMode === "with" ? "with" : "without"} food`}
          />
          <div className="mt-3 border-t border-line2">
            {rest.map((e, i) => (
              <CrewRow key={e.key} e={e} rank={i + 2} />
            ))}
          </div>
        </section>
      )}

      {unscored.length > 0 && (
        <section aria-label="Awaiting scores" className="mt-8">
          <SectionRule label="Awaiting scores" meta="picks not fully rated yet" />
          <div className="mt-2 border-t border-line2">
            {unscored.map((e) => (
              <CrewRow key={e.key} e={e} rank={null} />
            ))}
          </div>
        </section>
      )}

      {ranked.length > 0 && <CrewCharts entries={ranked} />}

      {app && people.length > 0 && <ManVsMachine people={people} app={app} />}

      {uncredited.length > 0 && (
        <UncreditedList
          bars={uncredited}
          open={showUncredited}
          onToggle={() => setShowUncredited((o) => !o)}
          onEdit={editVisited}
        />
      )}
    </div>
  );
}

/** Bars nobody has claimed — a quiet nudge with one-tap Edit to credit them. */
function UncreditedList({
  bars,
  open,
  onToggle,
  onEdit,
}: {
  bars: ReturnType<typeof useTour>["visited"];
  open: boolean;
  onToggle: () => void;
  onEdit: (b: ReturnType<typeof useTour>["visited"][number]) => void;
}) {
  return (
    <div className="mt-8 rounded-[4px] border border-dashed border-line2 px-4 py-3 sm:px-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent p-0 text-left"
      >
        <span className="text-[0.88rem] text-mist">
          <span className="tda-num font-cond text-[1.05rem] font-semibold text-cream">{bars.length}</span>{" "}
          bar{bars.length === 1 ? " has" : "s have"} no one credited
          <span className="text-mute"> — tap to claim</span>
        </span>
        <Icon
          name="chevronDown"
          size={14}
          className={`flex-shrink-0 text-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="m-0 mt-2 list-none p-0">
          {bars.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 border-t border-line/70 py-1.5">
              <span className="truncate font-serif text-[0.98rem] text-creamSoft">{b.name}</span>
              <button
                type="button"
                onClick={() => onEdit(b)}
                className="inline-flex h-8 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 font-cond text-[0.85rem] font-semibold uppercase tracking-[0.07em] text-gold transition-colors hover:bg-[rgba(241,232,214,0.05)] hover:text-cream"
              >
                <Icon name="pencil" size={12} /> Credit
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

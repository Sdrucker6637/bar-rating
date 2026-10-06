"use client";

import { useId, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { Bar } from "@/lib/types";
import { fmt } from "@/lib/scoring";
import { displayDescription } from "@/lib/parse";
import { ghostBtnCls, dqBtnCls, removeBtnCls, tagCls } from "@/lib/ui";
import Icon from "./Icon";
import ScoreSeal from "./ScoreSeal";
import Scorecard, { fmtSub } from "./Scorecard";
import type { ScoreKey } from "./Scorecard";
import ConfirmRemove from "./ConfirmRemove";

/* ------------------------------------------------------------------------
 * The General Classification.
 *
 * One ordered list, four presentations, so rank is legible from shape alone:
 *   LeaderFeature — #1: the maillot treatment, the only full ScoreSeal.
 *   PodiumCard    — #2 and #3: medium tiles, silver and bronze numerals.
 *   StandingRow   — #4 onward: compact classification rows.
 *   HorsCourseRow — disqualified bars, grouped below the classification.
 * Every variant exposes the same details + actions (Map, Edit, Disqualify,
 * Remove) behind one expand toggle, so rows stay scannable without losing
 * a single action.
 * ---------------------------------------------------------------------- */

/** The desktop classification grid — shared by the column header and every
 *  StandingRow so the columns line up down the page. */
export const STANDINGS_GRID =
  "lg:grid-cols-[3.25rem_minmax(0,1fr)_17rem_5rem_2.25rem] lg:gap-x-4";

export interface StandingProps {
  b: Bar;
  rank: number | null;
  score: number | null | undefined;
  /** Category the board is currently sorted by, if any. */
  highlight: ScoreKey | null;
  battleDecided: boolean;
  isFetching: boolean;
  detailsDeferred: boolean;
  detailsFailed: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDisqualify: () => void;
}

/** Row/tile click toggles details — except when the click landed on a real
 *  control (the name link, an action button) inside it. */
function rowToggle(toggle: () => void) {
  return (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button,input")) return;
    toggle();
  };
}

function BarName({ b, className }: { b: Bar; className: string }) {
  return b.mapsLink ? (
    <a
      href={b.mapsLink}
      target="_blank"
      rel="noreferrer"
      className={`${className} text-inherit no-underline decoration-brass/50 decoration-1 underline-offset-[5px] transition-colors hover:text-gold hover:underline`}
    >
      {b.name}
    </a>
  ) : (
    <span className={className}>{b.name}</span>
  );
}

function Meta({ b, className = "" }: { b: Bar; className?: string }) {
  if (!b.neighborhood && !(b.bathroomBonus > 0)) return null;
  return (
    <div className={`text-[0.84rem] leading-snug text-mute ${className}`}>
      {b.neighborhood}
      {b.neighborhood && b.bathroomBonus > 0 && (
        <span aria-hidden="true" className="px-1.5 text-dim">
          ·
        </span>
      )}
      {b.bathroomBonus > 0 && (
        <span className="whitespace-nowrap text-gold" title="Bathroom bonus">
          +{fmtSub(b.bathroomBonus)} bathroom bonus
        </span>
      )}
    </div>
  );
}

function BattleMark({ className = "" }: { className?: string }) {
  return (
    <span
      title="Position determined by Bar Battle"
      aria-label="Position determined by Bar Battle"
      className={`inline-flex text-mute ${className}`}
    >
      <Icon name="swords" size={13} />
    </span>
  );
}

function ExpandButton({
  open,
  controls,
  onClick,
  label,
  className = "",
}: {
  open: boolean;
  controls: string;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? "Hide" : "Show"} details for ${label}`}
      onClick={onClick}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] text-mute transition-colors hover:bg-[rgba(241,232,214,0.06)] hover:text-cream ${className}`}
    >
      <Icon
        name="chevronDown"
        size={14}
        className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

/** Everything behind the fold: tags, description, happy hour, notes,
 *  enrichment status, and the full action row. */
function Details({
  id,
  b,
  showNotes,
  isFetching,
  detailsDeferred,
  detailsFailed,
  onEdit,
  onDelete,
  onDisqualify,
  className = "",
}: Pick<
  StandingProps,
  | "b"
  | "isFetching"
  | "detailsDeferred"
  | "detailsFailed"
  | "onEdit"
  | "onDelete"
  | "onDisqualify"
> & { id: string; showNotes: boolean; className?: string }) {
  const cleanDesc = displayDescription(b.description);
  const isLong = !!cleanDesc && cleanDesc.length > 140;
  const [expanded, setExpanded] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const descText =
    isLong && !expanded ? cleanDesc.slice(0, 140) + "…" : cleanDesc;

  return (
    <div
      id={id}
      className={`animate-[tda-rise_220ms_cubic-bezier(0.2,0.7,0.2,1)] ${className}`}
    >
      {b.tags && b.tags.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {b.tags.map((t) => (
            <span key={t} className={tagCls}>
              {t}
            </span>
          ))}
        </div>
      )}

      {descText && (
        <p className="mb-0 mt-2 max-w-[68ch] text-[0.92rem] leading-[1.55] text-mist">
          {descText}
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-1.5 cursor-pointer border-none bg-transparent p-0 font-cond text-[0.85rem] font-semibold uppercase tracking-[0.06em] text-gold hover:text-cream"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </p>
      )}

      {(b.happyHour || (showNotes && b.notes)) && (
        <div className="mt-2.5 space-y-1.5">
          {b.happyHour && (
            <div className="flex items-center gap-2 text-[0.88rem] text-mist">
              <Icon name="clock" size={13} className="flex-shrink-0 text-mute" />
              {b.happyHour}
            </div>
          )}
          {showNotes && b.notes && (
            <div className="font-serif text-[0.98rem] italic text-creamSoft">
              &ldquo;{b.notes}&rdquo;
            </div>
          )}
        </div>
      )}

      {isFetching && (
        <div className="mt-2 flex items-center gap-2 text-[0.82rem] italic text-mute">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brass" />
          finding details…
        </div>
      )}
      {!isFetching && detailsDeferred && !detailsFailed && (
        <div className="mt-2 text-[0.82rem] italic text-dim">
          details will retry…
        </div>
      )}
      {!isFetching && detailsFailed && !cleanDesc && (
        <div className="mt-2 text-[0.82rem] italic text-dim">
          details unavailable
        </div>
      )}

      <div className="-ml-2.5 mt-3 flex flex-wrap items-center gap-x-0.5 gap-y-1">
        {b.mapsLink && (
          <a className={ghostBtnCls} href={b.mapsLink} target="_blank" rel="noreferrer">
            <Icon name="external" size={13} /> Map
          </a>
        )}
        <button className={ghostBtnCls} onClick={onEdit}>
          <Icon name="pencil" size={13} /> Edit
        </button>
        <button className={dqBtnCls} onClick={onDisqualify}>
          <Icon name="xCircle" size={13} />
          {b.disqualified ? "Un-disqualify" : "Disqualify"}
        </button>
        <button
          className={`${removeBtnCls} ml-auto`}
          onClick={() => setConfirmingRemove(true)}
        >
          <Icon name="x" size={13} /> Remove
        </button>
      </div>

      {confirmingRemove && (
        <ConfirmRemove
          name={b.name}
          listName="leaderboard"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => {
            setConfirmingRemove(false);
            onDelete();
          }}
        />
      )}
    </div>
  );
}

/** The score as a race result: condensed, tabular, ticking into place when
 *  it changes (the food toggle, a new rating). */
function ScoreFigure({
  score,
  className,
}: {
  score: number | null | undefined;
  className: string;
}) {
  const text = fmt(score);
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <span
        key={text}
        className={`tda-num inline-block animate-[tda-tick_300ms_cubic-bezier(0.2,0.7,0.2,1)] font-cond font-semibold leading-none ${className}`}
      >
        {text}
      </span>
    </span>
  );
}

/* ============================== #1 ====================================== */

export function LeaderFeature({
  categoryMode,
  ...p
}: StandingProps & {
  /** Board sorted by a category — this card then shows the OVERALL leader. */
  categoryMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const { b } = p;

  return (
    <section
      data-flip-id={b.id}
      aria-label={`Current leader: ${b.name}`}
      className="relative overflow-hidden rounded-[4px] border border-line2 bg-oak"
    >
      {/* maillot rule + a pool of warm light from the top-left */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-maillot" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_0%_0%,rgba(240,199,90,0.09),transparent_65%)]"
      />

      <div
        onClick={rowToggle(() => setOpen((o) => !o))}
        className="relative grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-5 px-5 pb-5 pt-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-8 sm:px-8 sm:pb-6 sm:pt-8"
      >
        <div className="order-2 sm:order-1">
          <ScoreSeal
            score={p.score ?? null}
            size={104}
            tone="leader"
            countUp
            className="sm:hidden"
          />
          <ScoreSeal
            score={p.score ?? null}
            size={144}
            tone="leader"
            countUp
            className="hidden sm:inline-flex"
          />
        </div>

        <div className="order-1 min-w-0 sm:order-2">
          <div className="flex items-center gap-2.5">
            {/* race bib */}
            <span className="tda-num inline-flex h-7 min-w-[1.9rem] items-center justify-center rounded-[2px] bg-maillot px-1.5 font-cond text-[1.2rem] font-bold leading-none text-deep shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)]">
              1
            </span>
            <span className="font-cond text-kicker font-semibold uppercase text-maillot">
              {categoryMode ? "Overall leader" : "Leader"}
            </span>
            {p.battleDecided && <BattleMark />}
          </div>
          <h3 className="m-0 mt-3 font-serif text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.02em] text-cream sm:text-[2.7rem]">
            <BarName b={b} className="" />
          </h3>
          <Meta b={b} className="mt-2 text-[0.92rem]" />
          {b.notes && (
            <p className="mb-0 mt-3 font-serif text-[1.02rem] italic leading-snug text-creamSoft">
              &ldquo;{b.notes}&rdquo;
            </p>
          )}
        </div>

      </div>

      <div className="relative flex items-end gap-4 border-t border-line2 px-5 py-4 sm:px-8">
        <Scorecard
          bar={b}
          highlight={p.highlight}
          size="md"
          align="start"
          className="flex-1 sm:max-w-[34rem]"
        />
        <ExpandButton
          open={open}
          controls={detailsId}
          label={b.name}
          onClick={() => setOpen((o) => !o)}
          className="-mb-1 ml-auto"
        />
      </div>
      {open && (
        <Details
          id={detailsId}
          {...p}
          showNotes={false}
          className="relative border-t border-line2 px-5 pb-4 pt-4 sm:px-8"
        />
      )}
    </section>
  );
}

/* ============================ #2, #3 ==================================== */

const PODIUM = {
  2: { metal: "#C4C1C7", label: "2nd" },
  3: { metal: "#B57E52", label: "3rd" },
} as const;

export function PodiumCard(p: StandingProps & { rank: 2 | 3 }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const { b } = p;
  const m = PODIUM[p.rank];

  return (
    <article
      data-flip-id={b.id}
      className="relative overflow-hidden rounded-[4px] border border-line bg-panel"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] opacity-70"
        style={{ background: m.metal }}
      />
      <div
        onClick={rowToggle(() => setOpen((o) => !o))}
        className="cursor-pointer px-4 pb-4 pt-5 transition-colors hover:bg-panelHover sm:px-5"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5">
          <span
            className="tda-num font-cond text-[3rem] font-bold leading-[0.78]"
            style={{ color: m.metal }}
            aria-label={`Rank ${p.rank}`}
          >
            {p.rank}
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className="m-0 font-serif text-[1.22rem] font-semibold leading-[1.15] tracking-[-0.01em] text-cream sm:text-[1.3rem]">
              <BarName b={b} className="" />
            </h3>
            <Meta b={b} className="mt-1" />
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              {p.battleDecided && <BattleMark />}
              <ScoreFigure score={p.score} className="text-[1.85rem] text-cream" />
            </div>
          </div>
        </div>
        {b.notes && (
          <p className="mb-0 mt-3 line-clamp-2 font-serif text-[0.95rem] italic leading-snug text-mist">
            &ldquo;{b.notes}&rdquo;
          </p>
        )}
        <div className="mt-4 flex items-end gap-3">
          <Scorecard bar={b} highlight={p.highlight} size="sm" className="flex-1" />
          <ExpandButton
            open={open}
            controls={detailsId}
            label={b.name}
            onClick={() => setOpen((o) => !o)}
            className="-mb-1 -mr-1.5"
          />
        </div>
      </div>
      {open && (
        <Details
          id={detailsId}
          {...p}
          showNotes={false}
          className="border-t border-line px-4 pb-3 pt-3.5 sm:px-5"
        />
      )}
    </article>
  );
}

/* ============================ #4 onward ================================= */

export function StandingRow(p: StandingProps) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const { b } = p;

  return (
    <div data-flip-id={b.id} className="border-b border-line">
      <div
        onClick={rowToggle(() => setOpen((o) => !o))}
        className={`grid cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)_auto_2rem] items-start gap-x-3 gap-y-2.5 px-1 py-3.5 transition-colors hover:bg-panelHover/70 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto_2.25rem] sm:gap-x-4 sm:px-3 lg:items-center lg:py-3 ${STANDINGS_GRID} ${
          open ? "bg-panel" : ""
        }`}
      >
        <span className="tda-num pt-0.5 font-cond text-[1.6rem] font-bold leading-none text-mist lg:pt-0 lg:text-[1.75rem]">
          {p.rank}
        </span>

        <div className="min-w-0">
          <div className="line-clamp-2 font-serif text-[1.08rem] font-medium leading-snug text-cream sm:text-[1.12rem]">
            <BarName b={b} className="" />
          </div>
          <Meta b={b} className="mt-0.5" />
        </div>

        <Scorecard
          bar={b}
          highlight={p.highlight}
          labels="none"
          size="sm"
          className="hidden lg:grid"
        />

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            {p.battleDecided && <BattleMark />}
            <ScoreFigure score={p.score} className="text-[1.5rem] text-cream sm:text-[1.6rem]" />
          </div>
        </div>


        <ExpandButton
          open={open}
          controls={detailsId}
          label={b.name}
          onClick={() => setOpen((o) => !o)}
          className="-mt-0.5 lg:mt-0"
        />

        {/* phones & tablets: the scorecard sits under the name, labeled
            like the podium tiles. */}
        <Scorecard
          bar={b}
          highlight={p.highlight}
          size="sm"
          className="col-span-3 col-start-2 sm:max-w-[28rem] lg:hidden"
        />
      </div>
      {open && (
        <Details
          id={detailsId}
          {...p}
          showNotes
          className="bg-panel pb-4 pl-[3.25rem] pr-2 pt-1 sm:pl-[4.5rem] sm:pr-4 lg:pl-[5rem]"
        />
      )}
    </div>
  );
}

/* ============================ Hors Course =============================== */

export function HorsCourseRow(p: StandingProps) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const { b } = p;

  return (
    <div data-flip-id={b.id} className="border-b border-line">
      <div
        onClick={rowToggle(() => setOpen((o) => !o))}
        className="grid cursor-pointer grid-cols-[3rem_minmax(0,1fr)_auto_2rem] items-start gap-x-3 px-1 py-3.5 transition-colors hover:bg-panelHover/70 sm:grid-cols-[4rem_minmax(0,1fr)_auto_2.25rem] sm:gap-x-4 sm:px-3"
      >
        {/* the DQ mark: struck like an official's stamp */}
        <span className="mt-0.5 inline-flex h-7 w-fit -rotate-[4deg] items-center justify-center rounded-[2px] border-[1.5px] border-claret/80 px-1.5 font-cond text-[0.95rem] font-bold uppercase tracking-[0.08em] text-red">
          DQ
        </span>
        <div className="min-w-0">
          <div className="line-clamp-2 font-serif text-[1.05rem] font-medium leading-snug text-mist">
            <BarName b={b} className="" />
          </div>
          <Meta b={b} className="mt-0.5" />
          {b.disqualifyReason && (
            <div className="mt-1.5 font-serif text-[0.92rem] italic text-mute">
              {b.disqualifyReason}
            </div>
          )}
        </div>
        <span className="tda-num pt-1 font-cond text-[1.2rem] font-semibold text-dim line-through decoration-claret/60">
          N/A
        </span>
        <ExpandButton
          open={open}
          controls={detailsId}
          label={b.name}
          onClick={() => setOpen((o) => !o)}
        />
      </div>
      {open && (
        <Details
          id={detailsId}
          {...p}
          showNotes
          className="pb-4 pl-[4rem] pr-2 sm:pl-[5.75rem] sm:pr-4"
        />
      )}
    </div>
  );
}

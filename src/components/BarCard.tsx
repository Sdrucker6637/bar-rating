"use client";

import { useState } from "react";
import type { Bar } from "@/lib/types";
import { displayDescription } from "@/lib/parse";
import { ghostBtnCls, removeBtnCls, tagCls, visitedBtnCls } from "@/lib/ui";
import Icon from "./Icon";
import ConfirmRemove from "./ConfirmRemove";

interface BarCardProps {
  b: Bar;
  isFetching?: boolean;
  /** True when the bar is between Gemini detail-enrichment attempts (a
   *  backoff wait or the slow deferred pool) — shows a subtle "will retry"
   *  status so the entry never looks like enrichment isn't supported. */
  detailsDeferred?: boolean;
  /** True when the bar's full enrichment budget is exhausted — shows
   *  "details unavailable" instead of "finding details…". */
  detailsFailed?: boolean;
  onNameClick?: () => void;
  onEdit: () => void;
  editLabel?: string;
  onDelete: () => void;
}

/** A wishlist entry, set like a line in a bar guide rather than a boxed
 *  card: the name, its particulars, the write-up, and the actions aligned
 *  to the right. (The leaderboard has its own classification rows — see
 *  Standings.tsx.) */
export default function BarCard({
  b,
  isFetching,
  detailsDeferred,
  detailsFailed,
  onEdit,
  editLabel,
  onDelete,
}: BarCardProps) {
  const cleanDesc = displayDescription(b.description);
  const isLong = !!cleanDesc && cleanDesc.length > 140;
  const [expanded, setExpanded] = useState(false);
  // Confirmation safeguard before removing — the one-tap Remove shouldn't
  // destroy a shared-list entry on a mis-tap.
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const descText =
    isLong && !expanded ? cleanDesc.slice(0, 140) + "…" : cleanDesc;

  return (
    <article className="grid grid-cols-1 gap-3 border-b border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span
            aria-hidden="true"
            className="relative top-[-2px] h-[7px] w-[7px] flex-shrink-0 rotate-45 bg-greenBright"
          />
          <h3 className="m-0 font-serif text-[1.25rem] font-semibold leading-tight text-cream">
            {b.mapsLink ? (
              <a
                href={b.mapsLink}
                target="_blank"
                rel="noreferrer"
                className="text-inherit no-underline decoration-brass/50 decoration-1 underline-offset-[5px] transition-colors hover:text-gold hover:underline"
              >
                {b.name}
              </a>
            ) : (
              b.name
            )}
          </h3>
        </div>

        {(b.neighborhood || (b.tags && b.tags.length > 0)) && (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 pl-[1.1rem]">
            {b.neighborhood && (
              <span className="text-[0.86rem] text-mute">{b.neighborhood}</span>
            )}
            {b.neighborhood && b.tags && b.tags.length > 0 && (
              <span aria-hidden="true" className="text-dim">
                ·
              </span>
            )}
            {b.tags?.map((t) => (
              <span key={t} className={tagCls}>
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="pl-[1.1rem]">
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

          {b.happyHour && (
            <div className="mt-2 flex items-center gap-2 text-[0.88rem] text-mist">
              <Icon name="clock" size={13} className="text-mute" />
              {b.happyHour}
            </div>
          )}

          {b.notes && (
            <div className="mt-2 font-serif text-[0.98rem] italic text-creamSoft">
              &ldquo;{b.notes}&rdquo;
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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 pl-[1.1rem] sm:flex-nowrap sm:items-start sm:pl-0">
        <button className={`${visitedBtnCls} mr-1.5`} onClick={onEdit}>
          <Icon name="pencil" size={13} /> {editLabel || "Edit"}
        </button>
        {b.mapsLink && (
          <a className={ghostBtnCls} href={b.mapsLink} target="_blank" rel="noreferrer">
            <Icon name="external" size={13} /> Map
          </a>
        )}
        <button
          className={`${removeBtnCls} ml-auto sm:ml-0`}
          onClick={() => setConfirmingRemove(true)}
          aria-label="Remove"
        >
          <Icon name="x" size={13} />
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>

      {confirmingRemove && (
        <ConfirmRemove
          name={b.name}
          listName="wishlist"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => {
            setConfirmingRemove(false);
            onDelete();
          }}
        />
      )}
    </article>
  );
}

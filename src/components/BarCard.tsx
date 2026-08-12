"use client";

import { useState } from "react";
import type { Bar } from "@/lib/types";
import { fmt } from "@/lib/scoring";
import { displayDescription } from "@/lib/parse";
import {
  ghostBtnCls,
  ghostBtnGreenCls,
  dqBtnCls,
  removeBtnCls,
  tagCls,
  cardHoverCls,
  cardBaseShadowCls,
  cardWarmSurfaceCls,
} from "@/lib/ui";
import Icon from "./Icon";

interface BarCardProps {
  b: Bar;
  rank?: number | null;
  score?: number | null;
  scoreLabel?: string;
  isFetching?: boolean;
  onNameClick?: () => void;
  onEdit: () => void;
  editLabel?: string;
  onDelete: () => void;
  onDisqualify?: () => void;
}

const STATS: Array<[keyof Bar, string]> = [
  ["vibe", "Vibe"],
  ["value", "Value"],
  ["service", "Service"],
  ["food", "Food"],
  ["drinks", "Drinks"],
];

export default function BarCard({
  b,
  rank,
  score,
  scoreLabel,
  isFetching,
  onNameClick,
  onEdit,
  editLabel,
  onDelete,
  onDisqualify,
}: BarCardProps) {
  const isWishlist = b.status === "to-try";
  const cleanDesc = displayDescription(b.description);
  const isLong = !!cleanDesc && cleanDesc.length > 140;
  const [expanded, setExpanded] = useState(false);

  const descText =
    isLong && !expanded ? cleanDesc.slice(0, 140) + "…" : cleanDesc;

  const railColor = b.disqualified
    ? "bg-line2"
    : isWishlist
      ? "bg-green"
      : rank === 1
        ? "bg-gold"
        : rank === 2
          ? "bg-silver"
          : rank === 3
            ? "bg-bronze"
            : "bg-line2";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-panel py-5 pl-6 pr-5 ${cardBaseShadowCls} ${cardWarmSurfaceCls} ${cardHoverCls} ${
        b.disqualified ? "border-line/60" : "border-line"
      } ${rank === 1 ? "border-gold/30" : ""}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1.5 ${railColor}`}
        aria-hidden="true"
      />

      {b.disqualified && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg bg-[#12100F]/60"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {rank ? (
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] font-mono text-[1.05rem] font-semibold ${
                rank === 1
                  ? "border-gold bg-gold text-deep shadow-lift"
                  : rank === 2
                    ? "border-silver text-silverLight"
                    : rank === 3
                      ? "border-bronze text-bronzeLight"
                      : "border-line2 text-mist"
              }`}
            >
              {rank}
            </span>
          ) : b.disqualified ? (
            <span className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-line2 font-mono text-[0.75rem] text-mute">
              N/A
            </span>
          ) : null}

          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <div
                className="min-w-0 cursor-pointer truncate font-serif text-[1.2rem] font-medium underline decoration-brass/40 decoration-[3px] underline-offset-[3px] hover:text-gold hover:decoration-gold"
                onClick={onNameClick}
              >
                {b.mapsLink ? (
                  <a
                    href={b.mapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-inherit no-underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {b.name}
                  </a>
                ) : (
                  b.name
                )}
              </div>

              {isWishlist && (
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.05em] text-greenLight">
                  ☆ wishlist
                </span>
              )}
            </div>

            {b.neighborhood && (
              <div className="mt-0.5 font-mono text-[0.8rem] text-gold">
                {b.neighborhood}
              </div>
            )}
          </div>
        </div>

        {score !== undefined && score !== null && (
          <div className="flex-shrink-0 rounded-[6px] border border-line2 bg-ink px-3.5 py-2 text-right shadow-[inset_0_1px_0_rgba(237,230,217,0.025)]">
            <div className="font-serif text-[1.3rem] font-medium leading-none text-gold">
              {b.disqualified ? "N/A" : fmt(score)}
            </div>
            <div
              className="ml-auto mt-1.5 h-px w-6 bg-brass/30"
              aria-hidden="true"
            />
            <div className="mt-1 text-[0.56rem] uppercase tracking-[0.08em] text-mute">
              {b.disqualified ? "disqualified" : scoreLabel}
            </div>
          </div>
        )}
      </div>

      {b.disqualified && b.disqualifyReason && (
        <div className="mt-2.5 border-l-2 border-line2 pl-3 text-[0.85rem] italic text-mist">
          Disqualified — {b.disqualifyReason}
        </div>
      )}

      {b.tags && b.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {b.tags.map((t) => (
            <span key={t} className={tagCls}>
              {t}
            </span>
          ))}
        </div>
      )}

      {descText && (
        <div className="mt-2">
          <div className="text-[0.85rem] leading-[1.5] text-mist">
            {descText}
          </div>

          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 cursor-pointer border-none bg-transparent p-0 font-mono text-[0.7rem] text-gold underline decoration-dotted underline-offset-2"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {b.status === "visited" && (
        <div className="mt-3.5 rounded-[6px] border border-line2 bg-ink shadow-[inset_0_1px_0_rgba(237,230,217,0.025)]">
          <div className="flex divide-x divide-line">
            {STATS.map(([key, label]) => {
              const v = b[key] as unknown as number | null;
              const strong = v !== null && v >= 8.5;
              const exceptional = v !== null && v >= 9.5;
              return (
                <div
                  key={key}
                  className="flex flex-1 flex-col items-center gap-1.5 px-1 py-2.5 text-center"
                >
                  <span
                    className={`font-serif text-[1.12rem] font-medium leading-none ${
                      exceptional
                        ? "text-gold [text-shadow:0_0_16px_rgba(201,168,118,0.35)]"
                        : strong
                          ? "text-gold"
                          : "text-cream"
                    }`}
                  >
                    {fmt(v)}
                  </span>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.08em] text-mute">
                    {label}
                  </span>
                </div>
              );
            })}

            {b.bathroomBonus > 0 && (
              <div className="flex flex-[1.8] flex-col items-center gap-1.5 px-1 py-2.5 text-center">
                <span className="font-serif text-[1.12rem] font-medium leading-none text-cream">
                  {fmt(b.bathroomBonus)}
                </span>
                <span className="whitespace-nowrap font-mono text-[0.58rem] uppercase tracking-[0.08em] text-mute">
                  Bathroom bonus
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {(b.happyHour || b.notes) && (
        <div className="mt-3 space-y-1.5 border-l-2 border-goldDeep/40 pl-3">
          {b.happyHour && (
            <div className="flex items-center gap-1.5 text-[0.82rem] text-mist">
              <Icon name="clock" size={12} className="text-gold/70" />
              {b.happyHour}
            </div>
          )}

          {b.notes && (
            <div className="text-[0.82rem] italic text-mist">
              &ldquo;{b.notes}&rdquo;
            </div>
          )}
        </div>
      )}

      {isFetching && (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[0.68rem] text-mute">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brass" />
          finding details…
        </div>
      )}

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-[rgba(184,150,95,0.14)] pt-3">
        {b.mapsLink && (
          <a
            className={ghostBtnCls}
            href={b.mapsLink}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external" size={12} /> Map
          </a>
        )}

        <button className={ghostBtnGreenCls} onClick={onEdit}>
          <Icon name="pencil" size={12} /> {editLabel || "Edit"}
        </button>

        {b.status === "visited" && onDisqualify && (
          <button className={dqBtnCls} onClick={onDisqualify}>
            <Icon name="xCircle" size={11} />
            {b.disqualified ? "Un-disqualify" : "Disqualify"}
          </button>
        )}

        {isWishlist && (
          <button className={`${removeBtnCls} ml-auto`} onClick={onDelete}>
            <Icon name="x" size={11} /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

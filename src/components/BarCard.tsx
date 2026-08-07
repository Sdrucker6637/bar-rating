"use client";

import { useState } from "react";
import type { Bar } from "@/lib/types";
import { fmt } from "@/lib/scoring";
import { displayDescription } from "@/lib/parse";
import { linkBtnCls, delBtnCls } from "@/lib/ui";

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
  const rankClass =
    rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
  const isWishlist = b.status === "to-try";
  const cleanDesc = displayDescription(b.description);
  const isLong = !!cleanDesc && cleanDesc.length > 140;
  const [expanded, setExpanded] = useState(false);
  const descText =
    isLong && !expanded ? cleanDesc.slice(0, 140) + "…" : cleanDesc;

  const cardClass = `tda-card ${
    isWishlist ? "wishlist" : ""
  } ${b.disqualified ? "disqualified" : ""}`;

  return (
    <div
      className={`${cardClass} rounded-lg border border-line bg-panel px-5 py-4 ${
        isWishlist ? "border-l-[3px] border-l-green" : ""
      } ${b.disqualified ? "border-dashed opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {rank ? (
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] font-mono text-[0.85rem] font-semibold ${
                rankClass === "gold"
                  ? "border-gold text-gold"
                  : rankClass === "silver"
                    ? "border-silver text-silverLight"
                    : rankClass === "bronze"
                      ? "border-bronze text-bronzeLight"
                      : "border-line2 text-mist"
              }`}
            >
              {rank}
            </span>
          ) : b.disqualified ? (
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#5D5666] font-mono text-[0.62rem] text-mute">
              N/A
            </span>
          ) : null}
          <div className="flex items-center gap-2">
            <div
              className="cursor-pointer font-serif text-[1.1rem] font-medium underline decoration-[3px] hover:text-gold hover:opacity-80"
              style={{ textUnderlineOffset: "3px" }}
              onClick={onNameClick}
            >
              {b.mapsLink ? (
                <a
                  href={b.mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "underline", color: "inherit" }}
                >
                  {b.name}
                </a>
              ) : (
                b.name
              )}
            </div>
            {isWishlist && (
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.04em] text-greenLight">
                ☆ wishlist
              </span>
            )}
          </div>
        </div>
        {score !== undefined && score !== null && (
          <div className="text-right">
            <div className="font-mono text-[1.3rem] font-semibold text-gold">
              {b.disqualified ? "N/A" : fmt(score)}
            </div>
            <div className="text-[0.6rem] uppercase tracking-[0.06em] text-mute">
              {b.disqualified ? "disqualified" : scoreLabel}
            </div>
          </div>
        )}
      </div>

      {b.disqualified && b.disqualifyReason && (
        <div className="mt-2 text-[0.85rem] italic text-mist">
          Disqualified — {b.disqualifyReason}
        </div>
      )}

      {b.tags && b.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {b.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-line px-2 py-0.5 font-mono text-[0.66rem] text-mist"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {b.neighborhood && (
        <div className="mt-1 font-mono text-[0.7rem] text-gold">
          {b.neighborhood}
        </div>
      )}

      {descText && (
        <div>
          <div className="mt-1.5 text-[0.85rem] leading-[1.45] text-mist">
            {descText}
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: "none",
                border: "none",
                color: "#C9A876",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.7rem",
                cursor: "pointer",
                padding: "0.15rem 0 0",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {b.status === "visited" && (
        <div className="mt-2.5 flex flex-wrap gap-4 font-mono text-[0.76rem] text-mist">
          <span>
            🎭 Vibe <b className="text-cream">{fmt(b.vibe)}</b>
          </span>
          <span>
            💰 Value <b className="text-cream">{fmt(b.value)}</b>
          </span>
          <span>
            🤝 Service <b className="text-cream">{fmt(b.service)}</b>
          </span>
          <span>
            🍽️ Food <b className="text-cream">{fmt(b.food)}</b>
          </span>
          <span>
            🍸 Drinks <b className="text-cream">{fmt(b.drinks)}</b>
          </span>
          {b.bathroomBonus > 0 && (
            <span>
              🚻 bonus <b className="text-cream">{fmt(b.bathroomBonus)}</b>
            </span>
          )}
        </div>
      )}

      {b.happyHour && (
        <div className="mt-2 text-[0.85rem] italic text-mist">🕔 {b.happyHour}</div>
      )}
      {b.notes && (
        <div className="mt-2 text-[0.85rem] italic text-mist">"{b.notes}"</div>
      )}

      {isFetching && (
        <div className="mt-1.5 font-mono text-[0.68rem] text-mute">
          finding details…
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {b.mapsLink && (
          <a
            className={linkBtnCls}
            href={b.mapsLink}
            target="_blank"
            rel="noreferrer"
          >
            Map ↗
          </a>
        )}
        <button
          className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-2.5 py-1 font-mono text-[0.7rem] text-mist hover:border-brass hover:text-cream"
          onClick={onEdit}
        >
          {editLabel || "Edit"}
        </button>
        {b.status === "visited" && onDisqualify && (
          <button
            className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-2.5 py-1 font-mono text-[0.7rem] text-mist hover:border-brass hover:text-cream"
            onClick={onDisqualify}
          >
            {b.disqualified ? "Un-disqualify" : "Disqualify"}
          </button>
        )}
        <button className={delBtnCls} onClick={onDelete}>
          Remove
        </button>
      </div>
    </div>
  );
}

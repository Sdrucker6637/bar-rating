"use client";

import type { PlaceResult } from "@/lib/types";
import { displayDescription, priceLevelSymbol } from "@/lib/parse";
import {
  linkBtnCls,
  tagCls,
  wishlistBtnCls,
  visitedBtnCls,
  replaceBtnCls,
} from "@/lib/ui";
import Icon from "./Icon";

interface SuggestionCardProps {
  s: PlaceResult;
  isEnriching: boolean;
  isFailed?: boolean;
  onWishlist: () => void;
  onVisited: () => void;
  showCrawlActions?: boolean;
  onReplace?: () => void;
  replacing?: boolean;
}

/** A discovery result as a short guide entry: name, a line of particulars
 *  (neighborhood · price · rating), menu-style tags, and the write-up. */
export default function SuggestionCard({
  s,
  isEnriching,
  isFailed,
  onWishlist,
  onVisited,
  showCrawlActions,
  onReplace,
  replacing,
}: SuggestionCardProps) {
  const desc = displayDescription(s.description);
  const price = priceLevelSymbol(s.priceLevel);
  const rating = typeof s.rating === "number" && s.rating > 0 ? s.rating : null;

  return (
    <div className="flex flex-col rounded-[4px] border border-line bg-panel p-4 transition-colors hover:border-line2 sm:p-5">
      <div className="font-serif text-[1.22rem] font-semibold leading-tight text-cream">
        {s.name}
      </div>
      {(s.neighborhood || price || rating) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.84rem] text-mute">
          {s.neighborhood && <span>{s.neighborhood}</span>}
          {price && (
            <>
              {s.neighborhood && <span aria-hidden="true" className="text-dim">·</span>}
              <span className="text-mist" title="Google Places price level">
                {price}
              </span>
            </>
          )}
          {rating && (
            <>
              {(s.neighborhood || price) && (
                <span aria-hidden="true" className="text-dim">·</span>
              )}
              <span
                className="tda-num inline-flex items-center gap-1 text-mist"
                title="Google Places rating"
              >
                <span aria-hidden="true" className="text-gold">
                  ★
                </span>
                {rating.toFixed(1)}
              </span>
            </>
          )}
        </div>
      )}
      {s.tags && s.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-2">
          {s.tags.map((t) => (
            <span key={t} className={tagCls}>
              {t}
            </span>
          ))}
        </div>
      ) : (
        isEnriching && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-3 w-14 animate-[tda-pulse_1.4s_ease-in-out_infinite] rounded-[2px] bg-skeleton"
              />
            ))}
          </div>
        )
      )}
      {desc ? (
        <div className="mt-2.5 text-[0.9rem] leading-[1.5] text-mist">{desc}</div>
      ) : isEnriching ? (
        <div className="mt-2.5 animate-[tda-pulse_1.4s_ease-in-out_infinite] text-[0.88rem] italic text-dim">
          finding details…
        </div>
      ) : isFailed ? (
        <div className="mt-2.5 text-[0.84rem] italic text-dim">
          details unavailable
        </div>
      ) : (
        s.address && (
          <div className="mt-2.5 text-[0.9rem] leading-[1.5] text-mist">
            {s.address}
          </div>
        )
      )}
      {s.happyHour && (
        <div className="mt-2.5 flex items-center gap-2 text-[0.88rem] leading-[1.4] text-creamSoft">
          <Icon name="clock" size={13} className="text-gold" />
          {s.happyHour}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <button className={wishlistBtnCls} onClick={onWishlist}>
          + Wishlist
        </button>
        <button className={visitedBtnCls} onClick={onVisited}>
          I visited
        </button>
        {s.mapsLink && (
          <a className={linkBtnCls} href={s.mapsLink} target="_blank" rel="noreferrer">
            <Icon name="external" size={13} /> Map
          </a>
        )}
        {showCrawlActions && onReplace && (
          <button className={replaceBtnCls} disabled={replacing} onClick={onReplace}>
            {replacing ? (
              "Finding…"
            ) : (
              <>
                <Icon name="refresh" size={12} /> Replace
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

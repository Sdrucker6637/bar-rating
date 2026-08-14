"use client";

import type { PlaceResult } from "@/lib/types";
import { displayDescription } from "@/lib/parse";
import {
  linkBtnCls,
  tagCls,
  cardHoverCls,
  cardBaseShadowCls,
  cardWarmSurfaceCls,
} from "@/lib/ui";
import Icon from "./Icon";

interface SuggestionCardProps {
  s: PlaceResult;
  isEnriching: boolean;
  onWishlist: () => void;
  onVisited: () => void;
  showCrawlActions?: boolean;
  onReplace?: () => void;
  replacing?: boolean;
}

export default function SuggestionCard({
  s,
  isEnriching,
  onWishlist,
  onVisited,
  showCrawlActions,
  onReplace,
  replacing,
}: SuggestionCardProps) {
  const desc = displayDescription(s.description);

  return (
    <div className={`rounded-lg border border-line bg-panel p-3.5 ${cardBaseShadowCls} ${cardWarmSurfaceCls} ${cardHoverCls}`}>
      <div className="font-serif text-[1.05rem] font-medium text-cream">
        {s.name}
      </div>
      {s.neighborhood && (
        <div className="mt-0.5 font-mono text-[0.68rem] text-mute">
          {s.neighborhood}
        </div>
      )}
      {s.tags && s.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {s.tags.map((t) => (
            <span key={t} className={tagCls}>
              {t}
            </span>
          ))}
        </div>
      ) : (
        isEnriching && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block w-[3.2rem] animate-[tda-pulse_1.4s_ease-in-out_infinite] rounded-full bg-skeleton py-0.5 text-transparent"
              >
                .
              </span>
            ))}
          </div>
        )
      )}
      {desc ? (
        <div className="mt-2 text-[0.82rem] leading-[1.4] text-mist">
          {desc}
        </div>
      ) : isEnriching ? (
        <div className="mt-2 animate-[tda-pulse_1.4s_ease-in-out_infinite] text-[0.82rem] italic text-dim">
          finding details…
        </div>
      ) : (
        s.address && (
          <div className="mt-2 text-[0.82rem] leading-[1.4] text-mist">
            {s.address}
          </div>
        )
      )}
      {s.happyHour && (
        <div className="mt-2 flex items-center gap-1.5 text-[0.82rem] leading-[1.4] text-gold">
          <Icon name="clock" size={12} />
          {s.happyHour}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {s.mapsLink && (
          <a
            className={linkBtnCls}
            href={s.mapsLink}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external" size={12} /> Map
          </a>
        )}
        <button
          className="flex-1 cursor-pointer rounded-[5px] border border-green bg-transparent px-3 py-1.5 font-mono text-[0.72rem] text-greenLight hover:bg-green hover:text-cream"
          onClick={onWishlist}
        >
          + Wishlist
        </button>
        <button
          className="cursor-pointer rounded-[5px] border border-[rgba(184,150,95,0.28)] bg-transparent px-3 py-1.5 font-mono text-[0.7rem] text-mist hover:border-brass hover:text-cream"
          onClick={onVisited}
        >
          I visited
        </button>
        {showCrawlActions && onReplace && (
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] border border-[rgba(184,150,95,0.28)] bg-transparent px-3 py-1.5 font-mono text-[0.7rem] text-mist hover:border-brass hover:text-cream disabled:cursor-default disabled:opacity-50"
            disabled={replacing}
            onClick={onReplace}
          >
            {replacing ? (
              "Finding…"
            ) : (
              <>
                <Icon name="refresh" size={11} /> Replace
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

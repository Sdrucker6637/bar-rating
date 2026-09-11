"use client";

import { useTour } from "@/lib/tour-context";
import type { CrawlStop } from "@/lib/tour-context";
import Modal from "./Modal";
import { displayDescription, priceLevelSymbol } from "@/lib/parse";
import { estimateWalkMinutes, haversineMeters } from "@/lib/scoring";
import {
  findBtnCls,
  inputCls,
  secondaryBtnCls,
  groupBtnCls,
  ghostBtnCls,
  wishlistBtnCls,
  visitedBtnCls,
  replaceBtnCls,
  tagCls,
} from "@/lib/ui";
import Icon from "../Icon";

export default function CrawlModal() {
  const {
    showCrawlModal,
    closeCrawlModal,
    crawlStartInput,
    setCrawlStartInput,
    crawlCount,
    setCrawlCount,
    crawlPlanning,
    crawlStops,
    crawlError,
    replacingIndex,
    crawlEnrichingNames,
    crawlFailedNames,
    startCrawlPlanning,
    replaceStop,
    removeCrawlStop,
    addSuggestionToWishlist,
    rankSuggestion,
  } = useTour();

  if (!showCrawlModal) return null;

  return (
    <Modal onClose={closeCrawlModal} maxWidth="640px">
      <h3 className="mt-0 flex items-center gap-2.5 font-serif font-medium text-cream">
        <Icon name="map" size={16} className="text-gold" />
        Plan a Crawl
      </h3>

      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <input
          className={`${inputCls} min-w-0 flex-[1_1_200px]`}
          placeholder="Starting bar (optional)"
          value={crawlStartInput}
          onChange={(e) => setCrawlStartInput(e.target.value)}
        />
        <div className="flex items-center gap-1.5 font-mono text-[0.85rem]">
          <span className="text-mist">Bars</span>
          <button
            className={groupBtnCls}
            onClick={() => setCrawlCount(Math.max(2, crawlCount - 1))}
          >
            −
          </button>
          <b className="text-cream">{crawlCount}</b>
          <button
            className={groupBtnCls}
            onClick={() => setCrawlCount(Math.min(8, crawlCount + 1))}
          >
            +
          </button>
        </div>
      </div>

      <button
        className={`${findBtnCls} w-full`}
        onClick={startCrawlPlanning}
        disabled={crawlPlanning}
      >
        {crawlPlanning ? "Planning…" : "Plan Crawl"}
      </button>

      {crawlPlanning && (
        <div className="py-6 text-center font-mono text-[0.8rem] text-mute">
          mapping out a route…
        </div>
      )}
      {crawlError && (
        <div className="py-10 text-center font-mono text-[0.85rem] text-mute">
          {crawlError}
        </div>
      )}

      {crawlStops.length > 0 && (
        <div className="mt-4 flex flex-col">
          {crawlStops.map((s: CrawlStop, i) => {
            const next = crawlStops[i + 1];
            const isEnriching = crawlEnrichingNames.has(s.name);
            const isFailed = crawlFailedNames.has(s.name);
            const desc = displayDescription(s.description);
            const price = priceLevelSymbol(s.priceLevel);
            const rating =
              typeof s.rating === "number" && s.rating > 0 ? s.rating : null;
            return (
              <div key={s.name}>
                <div className="flex items-start gap-4 rounded-lg border border-line2 border-l-[3px] border-l-brass bg-ink px-5 py-4">
                  <div className="mt-0.5 flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-brass font-mono text-[0.85rem] font-semibold text-deep">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-[1.08rem] font-medium text-cream">
                      {s.name}
                    </div>
                    {(s.neighborhood || price || rating) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[0.68rem] text-mute">
                        {s.neighborhood && <span>{s.neighborhood}</span>}
                        {price && <span className="text-gold">{price}</span>}
                        {rating && (
                          <span className="inline-flex items-center gap-1">
                            <span aria-hidden="true" className="text-gold/80">
                              ★
                            </span>
                            {rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                    {s.tags && s.tags.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {s.tags.map((t) => (
                          <span key={t} className={tagCls}>
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      isEnriching && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          <span className="inline-block w-[3.2rem] animate-[tda-pulse_1.4s_ease-in-out_infinite] rounded-full bg-skeleton py-0.5 text-transparent">
                            .
                          </span>
                          <span className="inline-block w-[3.2rem] animate-[tda-pulse_1.4s_ease-in-out_infinite] rounded-full bg-skeleton py-0.5 text-transparent">
                            .
                          </span>
                        </div>
                      )
                    )}
                    {desc ? (
                      <div className="mt-2.5 text-[0.82rem] leading-[1.55] text-mist">
                        {desc}
                      </div>
                    ) : isEnriching ? (
                      <div className="mt-2.5 animate-[tda-pulse_1.4s_ease-in-out_infinite] text-[0.82rem] italic text-dim">
                        finding details…
                      </div>
                    ) : isFailed ? (
                      <div className="mt-2.5 font-mono text-[0.68rem] italic text-mute/70">
                        details unavailable
                      </div>
                    ) : (
                      s.address && (
                        <div className="mt-2.5 text-[0.82rem] leading-[1.55] text-mist">
                          {s.address}
                        </div>
                      )
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.mapsLink && (
                        <a
                          className={ghostBtnCls}
                          href={s.mapsLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Icon name="external" size={12} /> Map
                        </a>
                      )}
                      <button
                        className={wishlistBtnCls}
                        onClick={() => {
                          addSuggestionToWishlist(s);
                          removeCrawlStop(s.name);
                        }}
                      >
                        + Wishlist
                      </button>
                      <button
                        className={visitedBtnCls}
                        onClick={() => rankSuggestion(s)}
                      >
                        I visited
                      </button>
                      <button
                        className={replaceBtnCls}
                        disabled={replacingIndex !== null}
                        onClick={() => replaceStop(i)}
                      >
                        {replacingIndex === i ? (
                          "Finding…"
                        ) : (
                          <>
                            <Icon name="refresh" size={11} /> Replace
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                {next && (
                  <div className="py-2.5 text-center font-mono text-[0.7rem] text-mute">
                    ↓ ~
                    {Math.max(
                      1,
                      Math.round(
                        estimateWalkMinutes(
                          haversineMeters(
                            s.latitude as number,
                            s.longitude as number,
                            next.latitude as number,
                            next.longitude as number,
                          ),
                        ),
                      ),
                    )}{" "}
                    min walk
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex gap-2.5">
        <button className={secondaryBtnCls} onClick={closeCrawlModal}>
          Close
        </button>
      </div>
    </Modal>
  );
}

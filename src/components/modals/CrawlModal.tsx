"use client";

import { useTour } from "@/lib/tour-context";
import type { CrawlStop } from "@/lib/tour-context";
import Modal from "./Modal";
import { displayDescription, priceLevelSymbol } from "@/lib/parse";
import { estimateWalkMinutes, haversineMeters } from "@/lib/scoring";
import {
  findBtnCls,
  inputCls,
  labelCls,
  modalTitleCls,
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
      <div className="flex items-center gap-2 font-cond text-kicker font-semibold uppercase text-mute">
        <Icon name="map" size={14} className="text-gold" /> The route
      </div>
      <h3 className={`${modalTitleCls} mb-5 mt-1.5`}>Plan a Crawl</h3>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <input
          className={`${inputCls} min-w-0 flex-[1_1_200px]`}
          placeholder="Starting bar (optional)"
          value={crawlStartInput}
          onChange={(e) => setCrawlStartInput(e.target.value)}
        />
        <div className="flex items-center gap-1.5">
          <span className={`${labelCls} mr-1`}>Bars</span>
          <button
            className={groupBtnCls}
            onClick={() => setCrawlCount(Math.max(2, crawlCount - 1))}
          >
            −
          </button>
          <b className="tda-num w-6 text-center font-cond text-[1.25rem] font-semibold text-cream">
            {crawlCount}
          </b>
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
        <div className="animate-[tda-pulse_1.6s_ease-in-out_infinite] py-8 text-center font-serif text-[0.98rem] italic text-mute">
          mapping out a route…
        </div>
      )}
      {crawlError && (
        <div className="py-10 text-center font-serif text-[0.98rem] italic text-mist">
          {crawlError}
        </div>
      )}

      {crawlStops.length > 0 && (
        <div className="mt-6 flex flex-col">
          {crawlStops.map((s: CrawlStop, i) => {
            const next = crawlStops[i + 1];
            const isEnriching = crawlEnrichingNames.has(s.name);
            const isFailed = crawlFailedNames.has(s.name);
            const desc = displayDescription(s.description);
            const price = priceLevelSymbol(s.priceLevel);
            const rating =
              typeof s.rating === "number" && s.rating > 0 ? s.rating : null;
            return (
              <div key={s.name} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3">
                {/* the route: stage number, and a line on to the next stop */}
                <div className="flex flex-col items-center">
                  <span className="tda-num flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[3px] border border-brass/70 font-cond text-[1.2rem] font-bold text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {next && <span aria-hidden="true" className="w-px flex-1 bg-line2" />}
                </div>
                <div className="min-w-0 pb-2">
                  <div className="rounded-[4px] border border-line bg-panel px-4 py-3.5">
                    <div className="font-serif text-[1.18rem] font-semibold leading-tight text-cream">
                      {s.name}
                    </div>
                    {(s.neighborhood || price || rating) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.84rem] text-mute">
                        {s.neighborhood && <span>{s.neighborhood}</span>}
                        {price && <span className="text-mist">{price}</span>}
                        {rating && (
                          <span className="tda-num inline-flex items-center gap-1 text-mist">
                            <span aria-hidden="true" className="text-gold">
                              ★
                            </span>
                            {rating.toFixed(1)}
                          </span>
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
                          <span className="inline-block h-3 w-14 animate-[tda-pulse_1.4s_ease-in-out_infinite] rounded-[2px] bg-skeleton" />
                          <span className="inline-block h-3 w-14 animate-[tda-pulse_1.4s_ease-in-out_infinite] rounded-[2px] bg-skeleton" />
                        </div>
                      )
                    )}
                    {desc ? (
                      <div className="mt-2.5 text-[0.9rem] leading-[1.55] text-mist">
                        {desc}
                      </div>
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
                        <div className="mt-2.5 text-[0.9rem] leading-[1.55] text-mist">
                          {s.address}
                        </div>
                      )
                    )}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
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
                      {s.mapsLink && (
                        <a
                          className={ghostBtnCls}
                          href={s.mapsLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Icon name="external" size={13} /> Map
                        </a>
                      )}
                      <button
                        className={replaceBtnCls}
                        disabled={replacingIndex !== null}
                        onClick={() => replaceStop(i)}
                      >
                        {replacingIndex === i ? (
                          "Finding…"
                        ) : (
                          <>
                            <Icon name="refresh" size={12} /> Replace
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {next && (
                    <div className="py-2.5 font-cond text-[0.88rem] font-medium tracking-[0.04em] text-mute">
                      ~
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
                      min walk to the next stop
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex gap-2.5">
        <button className={secondaryBtnCls} onClick={closeCrawlModal}>
          Close
        </button>
      </div>
    </Modal>
  );
}

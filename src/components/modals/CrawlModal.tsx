"use client";

import { useTour } from "@/lib/tour-context";
import type { CrawlStop } from "@/lib/tour-context";
import Modal from "./Modal";
import { displayDescription } from "@/lib/parse";
import { estimateWalkMinutes, haversineMeters } from "@/lib/scoring";
import { findBtnCls, inputCls, secondaryBtnCls } from "@/lib/ui";

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
    startCrawlPlanning,
    replaceStop,
    removeCrawlStop,
    addSuggestionToWishlist,
    rankSuggestion,
  } = useTour();

  if (!showCrawlModal) return null;

  return (
    <Modal onClose={closeCrawlModal} maxWidth="640px">
      <h3 className="mt-0 font-serif font-medium text-cream">
        🚶 Plan a Crawl
      </h3>

      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <input
          className={`${inputCls} min-w-0 flex-[1_1_200px]`}
          placeholder="Starting bar (optional)"
          value={crawlStartInput}
          onChange={(e) => setCrawlStartInput(e.target.value)}
        />
        <div className="flex items-center gap-1.5 font-mono text-[0.85rem]">
          <span style={{ color: "#857C8E" }}>Bars</span>
          <button
            className="h-[26px] w-[26px] cursor-pointer rounded-[5px] border border-line2 bg-ink text-base leading-none text-brass"
            onClick={() => setCrawlCount(Math.max(2, crawlCount - 1))}
          >
            −
          </button>
          <b className="text-cream">{crawlCount}</b>
          <button
            className="h-[26px] w-[26px] cursor-pointer rounded-[5px] border border-line2 bg-ink text-base leading-none text-brass"
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
            const desc = displayDescription(s.description);
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
                    {s.neighborhood && (
                      <div className="mt-1 font-mono text-[0.68rem] text-mute">
                        {s.neighborhood}
                      </div>
                    )}
                    {s.tags && s.tags.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {s.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-line px-2 py-0.5 font-mono text-[0.66rem] text-mist"
                          >
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
                          className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-2.5 py-1 font-mono text-[0.7rem] text-mist no-underline hover:border-brass hover:text-cream"
                          href={s.mapsLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Map ↗
                        </a>
                      )}
                      <button
                        className="flex-1 cursor-pointer rounded-[5px] border border-green bg-transparent px-3 py-1.5 font-mono text-[0.72rem] text-greenLight hover:bg-green hover:text-cream"
                        onClick={() => {
                          addSuggestionToWishlist(s);
                          removeCrawlStop(s.name);
                        }}
                      >
                        + Wishlist
                      </button>
                      <button
                        className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-1.5 font-mono text-[0.7rem] text-mist hover:border-brass hover:text-cream"
                        onClick={() => rankSuggestion(s)}
                      >
                        I visited
                      </button>
                      <button
                        className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-1.5 font-mono text-[0.7rem] text-mist hover:border-brass hover:text-cream disabled:cursor-default disabled:opacity-50"
                        disabled={replacingIndex !== null}
                        onClick={() => replaceStop(i)}
                      >
                        {replacingIndex === i ? "Finding…" : "↺ Replace"}
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

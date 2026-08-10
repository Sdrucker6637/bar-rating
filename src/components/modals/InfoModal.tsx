"use client";

import { useTour } from "@/lib/tour-context";
import Modal from "./Modal";
import { primaryBtnCls } from "@/lib/ui";

export default function InfoModal() {
  const { showInfo, setShowInfo } = useTour();
  if (!showInfo) return null;

  return (
    <Modal onClose={() => setShowInfo(false)}>
      <h3 className="mt-0 font-serif font-medium text-cream">How it works</h3>
      <div className="mt-2.5 text-[0.92rem] leading-[1.55] text-creamSoft">
        Find bars by vibe, then add promising ones to the wishlist. When you
        visit a bar, tap &ldquo;I visited&rdquo; and score the experience — it
        moves to the leaderboard automatically. Every bar shown comes straight
        from Google Places, so it&apos;s real and currently open.
      </div>
      <div className="mt-3.5 flex flex-col gap-1 font-mono text-[0.78rem] text-mist">
        <div>
          <b className="text-gold">💰 Baller Mode</b>
          <div className="mt-1 font-sans text-[0.92rem] leading-[1.55] text-creamSoft">
            Allows recommendations from more expensive bars. Useful for special
            occasions, rooftops, and premium experiences.
          </div>
        </div>
        <div className="mt-3">
          <b className="text-gold">🌎 Explore Mode</b>
          <div className="mt-1 font-sans text-[0.92rem] leading-[1.55] text-creamSoft">
            Expands the search distance beyond the normal limit. Useful when
            discovering bars outside your usual area.
          </div>
        </div>
        <div className="mt-3">
          <b className="text-gold">🚶 Plan a Crawl</b>
          <div className="mt-1 font-sans text-[0.92rem] leading-[1.55] text-creamSoft">
            Without a starting bar, Tour de Alcoholism picks a random starting
            point and builds a walkable crawl.
          </div>
          <div className="mt-2 font-sans text-[0.92rem] leading-[1.55] text-creamSoft">
            If you enter a starting bar, the crawl is built around that
            location.
          </div>
        </div>
        <div className="mt-3">
          <b className="text-gold">🍻 OG Rules</b>
          <div className="mt-1 font-sans text-[0.92rem] leading-[1.55] text-creamSoft">
            No American Whiskey.
          </div>
          <div className="mt-2 font-sans text-[0.92rem] leading-[1.55] text-creamSoft">
            No uncool people. If you know you know.
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2.5">
        <button className={primaryBtnCls} onClick={() => setShowInfo(false)}>
          Got it
        </button>
      </div>
    </Modal>
  );
}

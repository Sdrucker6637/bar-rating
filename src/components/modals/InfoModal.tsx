"use client";

import { useTour } from "@/lib/tour-context";
import Modal from "./Modal";
import { modalTitleCls, primaryBtnCls } from "@/lib/ui";
import Icon from "../Icon";
import type { IconName } from "../Icon";

const RULES: { icon: IconName; title: string; lines: string[] }[] = [
  {
    icon: "dollar",
    title: "Baller Mode",
    lines: [
      "Allows recommendations from more expensive bars. Useful for special occasions, rooftops, and premium experiences.",
    ],
  },
  {
    icon: "globe",
    title: "Explore Mode",
    lines: [
      "Expands the search distance beyond the normal limit. Useful when discovering bars outside your usual area.",
    ],
  },
  {
    icon: "map",
    title: "Plan a Crawl",
    lines: [
      "Without a starting bar, Tour de Alcoholism picks a random starting point and builds a walkable crawl.",
      "If you enter a starting bar, the crawl is built around that location.",
    ],
  },
  {
    icon: "beer",
    title: "OG Rules",
    lines: ["No American Whiskey.", "No uncool people. If you know you know."],
  },
];

export default function InfoModal() {
  const { showInfo, setShowInfo } = useTour();
  if (!showInfo) return null;

  return (
    <Modal onClose={() => setShowInfo(false)} maxWidth="520px">
      <div className="font-cond text-kicker font-semibold uppercase text-mute">
        Tour de Alcoholism
      </div>
      <h3 className={`${modalTitleCls} mt-1.5`}>How it works</h3>
      <p className="mb-0 mt-3 text-[0.95rem] leading-[1.6] text-creamSoft">
        Find bars by vibe, then add promising ones to the wishlist. When you
        visit a bar, tap &ldquo;I visited&rdquo; and score the experience — it
        moves to the leaderboard automatically. Every bar shown comes straight
        from Google Places, so it&apos;s real and currently open.
      </p>

      {/* the house rules, set like a bar menu: rule, then the fine print */}
      <dl className="mb-0 mt-5 divide-y divide-line border-y border-line">
        {RULES.map((r) => (
          <div key={r.title} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 py-3.5">
            <dt className="col-span-2 flex items-center gap-2.5 font-cond text-[1rem] font-semibold uppercase tracking-[0.08em] text-cream">
              <Icon name={r.icon} size={15} className="text-gold" />
              {r.title}
            </dt>
            {r.lines.map((line) => (
              <dd
                key={line}
                className="col-start-2 m-0 mt-1 text-[0.92rem] leading-[1.55] text-mist"
              >
                {line}
              </dd>
            ))}
          </div>
        ))}
      </dl>
      <div className="mt-6 flex gap-2.5">
        <button className={primaryBtnCls} onClick={() => setShowInfo(false)}>
          Got it
        </button>
      </div>
    </Modal>
  );
}

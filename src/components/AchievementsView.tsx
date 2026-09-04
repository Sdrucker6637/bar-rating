"use client";

import { useMemo, useState } from "react";
import { useTour } from "@/lib/tour-context";
import { ACHIEVEMENTS, type AchievementCategory } from "@/lib/achievements";
import TabIntro from "./TabIntro";
import Icon from "./Icon";
import {
  chipCls,
  chipActiveCls,
  kickerCls,
  cardBaseShadowCls,
  cardWarmSurfaceCls,
} from "@/lib/ui";

const CATEGORY_META: Record<
  AchievementCategory,
  { label: string; dot: string; rail: string; medalFrom: string; medalTo: string }
> = {
  exploration: {
    label: "Exploration",
    dot: "bg-silverLight",
    rail: "bg-silverLight",
    medalFrom: "#C9C6CE",
    medalTo: "#726F78",
  },
  rating: {
    label: "Rating",
    dot: "bg-gold",
    rail: "bg-gold",
    medalFrom: "#E5B93F",
    medalTo: "#8A6D2F",
  },
  battle: {
    label: "Leaderboard & Bar Battle",
    dot: "bg-redLight",
    rail: "bg-redLight",
    medalFrom: "#D98F8F",
    medalTo: "#9A4B4B",
  },
  wishlist: {
    label: "Wishlist",
    dot: "bg-greenLight",
    rail: "bg-greenLight",
    medalFrom: "#7FA88E",
    medalTo: "#1F2E28",
  },
  crawl: {
    label: "Crawl Planning",
    dot: "bg-blueLight",
    rail: "bg-blueLight",
    medalFrom: "#7FA8C9",
    medalTo: "#3F566B",
  },
  split: {
    label: "Split the Bill",
    dot: "bg-bronzeLight",
    rail: "bg-bronzeLight",
    medalFrom: "#C08E5F",
    medalTo: "#A9784F",
  },
};

const CATEGORY_ORDER: AchievementCategory[] = [
  "exploration",
  "rating",
  "battle",
  "wishlist",
  "crawl",
  "split",
];

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function AchievementsView() {
  const { achievementUnlocks } = useTour();
  const [filter, setFilter] = useState<"all" | AchievementCategory>("all");

  const unlockedByKey = useMemo(
    () => new Map(achievementUnlocks.map((u) => [u.key, u])),
    [achievementUnlocks],
  );

  const byCategory = useMemo(() => {
    const map = new Map<AchievementCategory, typeof ACHIEVEMENTS>();
    CATEGORY_ORDER.forEach((c) => map.set(c, []));
    ACHIEVEMENTS.forEach((a) => map.get(a.category)!.push(a));
    return map;
  }, []);

  const total = ACHIEVEMENTS.length;
  const unlockedCount = unlockedByKey.size;
  const pct = total > 0 ? Math.round((unlockedCount / total) * 1000) / 10 : 0;

  const mostRecent = useMemo(() => {
    if (achievementUnlocks.length === 0) return null;
    return [...achievementUnlocks].sort((a, b) => b.unlockedAt - a.unlockedAt)[0];
  }, [achievementUnlocks]);
  const mostRecentDef = mostRecent
    ? ACHIEVEMENTS.find((a) => a.key === mostRecent.key)
    : null;

  const visibleCategories =
    filter === "all" ? CATEGORY_ORDER : [filter];

  return (
    <div>
      <TabIntro
        title="The Trophy Case"
        sub="Badges unlock automatically as bars get rated, ranked, disqualified, crawled to, and split. There's no login here, so nothing is credited to a person — every badge just belongs to the house."
      />

      {mostRecentDef && (
        <div className="relative mb-6 overflow-hidden rounded-lg border border-brass/30 bg-panel">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-brass/60"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_120%_at_15%_-10%,rgba(184,150,95,0.1),transparent_60%)]"
          />
          <div className="relative flex items-center gap-4 px-5 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-brass/40 bg-[radial-gradient(circle_at_35%_30%,#E5B93F,#8A6D2F_75%)] text-deep shadow-lift">
              <Icon name="medal" size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.13em] text-gold">
                Just unlocked
              </div>
              <div className="mt-0.5 truncate font-serif text-[1rem] text-cream">
                <b className="font-semibold text-gold">{mostRecentDef.name}</b>
                {mostRecent!.context ? ` — ${mostRecent!.context}` : ""}
              </div>
              <div className="mt-0.5 font-mono text-[0.68rem] text-mute">
                {fmtDate(mostRecent!.unlockedAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-3 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-mute">
          <span>House progress</span>
          <b className="font-serif text-[1rem] normal-case tracking-normal text-cream">
            {unlockedCount} / {total} unlocked
          </b>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-line2 bg-skeleton">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg,#2E6E8C 0%, #4A8FB0 22%, #8A6D2F 50%, #D9A83C 78%, #FFE3A0 100%)",
            }}
          />
        </div>
        <div className="mt-2 flex items-start gap-1.5 font-mono text-[0.66rem] leading-relaxed text-mute">
          <Icon name="lock" size={11} className="mt-0.5 flex-shrink-0" />
          <span>
            <b className="font-semibold text-mist">
              Every badge is a one-time unlock.
            </b>{" "}
            Once earned it&apos;s locked in for good — disqualifying or
            editing a bar later never takes one back.
          </span>
        </div>
      </div>

      <div
        className={`mb-6 flex flex-wrap items-center justify-center gap-2.5 rounded-lg border border-line bg-panel px-4 py-3.5 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
      >
        <button
          className={`${chipCls} ${filter === "all" ? chipActiveCls : ""}`}
          onClick={() => setFilter("all")}
        >
          All <span className="opacity-70">{total}</span>
        </button>
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            className={`${chipCls} ${filter === c ? chipActiveCls : ""}`}
            onClick={() => setFilter(c)}
          >
            {CATEGORY_META[c].label}{" "}
            <span className="opacity-70">{byCategory.get(c)!.length}</span>
          </button>
        ))}
      </div>

      {visibleCategories.map((cat) => {
        const defs = byCategory.get(cat)!;
        const meta = CATEGORY_META[cat];
        return (
          <section key={cat} className="mt-8 first:mt-0">
            <div className="mb-3.5 flex items-baseline justify-between gap-3 border-b border-brass/[0.14] pb-2">
              <div className={`${kickerCls} flex items-center gap-2`}>
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </div>
              <div className="font-mono text-[0.68rem] text-mute">
                {defs.length} badges
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {defs.map((def) => {
                const unlock = unlockedByKey.get(def.key);
                const locked = !unlock;
                return (
                  <div
                    key={def.key}
                    className={`relative overflow-hidden rounded-lg border bg-panel py-4 pl-[18px] pr-4 ${cardBaseShadowCls} ${cardWarmSurfaceCls} ${
                      locked ? "border-line/60" : "border-line"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-[5px] ${
                        locked ? "bg-line2" : meta.rail
                      }`}
                    />
                    <div
                      className={`flex items-start gap-3 ${locked ? "opacity-45" : ""}`}
                    >
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-cream/10"
                        style={{
                          background: locked
                            ? "#221C17"
                            : `radial-gradient(circle at 35% 30%, ${meta.medalFrom}, ${meta.medalTo} 75%)`,
                          filter: locked ? "grayscale(1) brightness(0.75)" : undefined,
                        }}
                      >
                        <Icon
                          name={locked ? "lock" : "medal"}
                          size={15}
                          className={locked ? "text-mute" : "text-deep"}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-serif text-[1.02rem] font-medium leading-snug ${
                            locked ? "text-mist" : "text-cream"
                          }`}
                        >
                          {def.name}
                        </div>
                        <div className="mt-1.5 text-[0.82rem] leading-[1.5] text-mist">
                          {def.desc}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`relative z-10 mt-3 flex flex-wrap items-center gap-2 border-t border-[rgba(184,150,95,0.14)] pt-2.5 font-mono text-[0.64rem] ${
                        locked ? "text-dim" : "text-mute"
                      }`}
                    >
                      {locked ? (
                        <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-line2 bg-[rgba(110,100,87,0.1)] px-1.5 py-0.5">
                          <Icon name="lock" size={9} /> Locked
                        </span>
                      ) : (
                        <>
                          <span className="rounded-[4px] border border-[rgba(201,168,118,0.3)] bg-[rgba(201,168,118,0.1)] px-1.5 py-0.5 tracking-[0.04em] text-gold">
                            Earned
                          </span>
                          <span>
                            {unlock!.context ? `${unlock!.context} · ` : ""}
                            {fmtDate(unlock!.unlockedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="mt-10 text-center font-mono text-[0.68rem] text-dim">
        Shared list, shared trophies — anyone with this page unlocks for the
        whole house.
      </div>
    </div>
  );
}

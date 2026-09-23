"use client";

import { useMemo, useState } from "react";
import { useTour } from "@/lib/tour-context";
import { ACHIEVEMENTS, type AchievementCategory } from "@/lib/achievements";
import TabIntro from "./TabIntro";
import Icon from "./Icon";
import Insignia, { INSIGNIA_TONES } from "./Insignia";
import { SectionRule } from "./Ornament";

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

  const mostRecent = useMemo(() => {
    if (achievementUnlocks.length === 0) return null;
    return [...achievementUnlocks].sort((a, b) => b.unlockedAt - a.unlockedAt)[0];
  }, [achievementUnlocks]);
  const mostRecentDef = mostRecent
    ? ACHIEVEMENTS.find((a) => a.key === mostRecent.key)
    : null;

  const visibleCategories = filter === "all" ? CATEGORY_ORDER : [filter];

  const tabCls = (on: boolean) =>
    `relative flex-shrink-0 cursor-pointer whitespace-nowrap border-none bg-transparent px-3 py-3 font-cond text-[0.92rem] font-semibold uppercase tracking-[0.08em] transition-colors ${
      on ? "text-cream" : "text-mute hover:text-cream"
    }`;

  return (
    <div>
      <TabIntro
        kicker="Awards"
        title="The Trophy Case"
        sub="Badges unlock automatically as bars get rated, ranked, disqualified, crawled to, and split. There's no login here, so nothing is credited to a person — every badge just belongs to the house."
      />

      {/* The house tally: a big count, and one tick per award — like marks
          chalked on a bar tab. */}
      <div className="mb-8 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-10">
        <div>
          <div className="font-cond text-kicker font-semibold uppercase text-mute">
            House tally
          </div>
          <div className="tda-num mt-1 font-cond font-semibold leading-none">
            <span className="text-[3.4rem] text-cream">{unlockedCount}</span>
            <span className="text-[1.6rem] text-mute"> / {total}</span>
          </div>
          <div className="mt-1 font-serif text-[0.95rem] italic text-mist">
            awards earned
          </div>
        </div>
        <div className="min-w-0">
          <div
            role="img"
            aria-label={`${unlockedCount} of ${total} awards earned`}
            className="flex h-8 items-end gap-[3px]"
          >
            {ACHIEVEMENTS.map((a, i) => {
              const on = unlockedByKey.has(a.key);
              return (
                <span
                  key={a.key}
                  className={`min-w-0 flex-1 rounded-[1px] ${
                    on ? "bg-brass" : "bg-line2"
                  } ${(i + 1) % 5 === 0 ? "h-full" : "h-[70%]"}`}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-start gap-2 text-[0.86rem] leading-relaxed text-mute">
            <Icon name="lock" size={13} className="mt-1 flex-shrink-0" />
            <span>
              <b className="font-semibold text-mist">
                Every badge is a one-time unlock.
              </b>{" "}
              Once earned it&apos;s locked in for good — disqualifying or
              editing a bar later never takes one back.
            </span>
          </div>
        </div>
      </div>

      {mostRecentDef && (
        <div className="relative mb-9 overflow-hidden rounded-[4px] border border-line2 bg-oak">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-brass/80" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_0%_0%,rgba(201,162,106,0.1),transparent_65%)]"
          />
          <div className="relative flex items-center gap-4 px-5 py-5 sm:gap-6 sm:px-7">
            <Insignia
              icon={mostRecentDef.icon}
              category={mostRecentDef.category}
              size={68}
            />
            <div className="min-w-0">
              <div className="font-cond text-kicker font-semibold uppercase text-gold">
                Just unlocked
              </div>
              <div className="mt-1 font-serif text-[1.45rem] font-semibold leading-tight text-cream">
                {mostRecentDef.name}
              </div>
              <div className="mt-1 text-[0.88rem] text-mist">
                {mostRecent!.context ? `${mostRecent!.context} · ` : ""}
                {fmtDate(mostRecent!.unlockedAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* category tabs — the same underline language as the site nav */}
      <div className="tda-scroll-x -mx-4 mb-8 border-b border-line px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-stretch">
          <button className={tabCls(filter === "all")} onClick={() => setFilter("all")}>
            All <span className="tda-num text-mute">{total}</span>
            {filter === "all" && (
              <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-[2px] bg-brass" />
            )}
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button key={c} className={tabCls(filter === c)} onClick={() => setFilter(c)}>
              {INSIGNIA_TONES[c].label}{" "}
              <span className="tda-num text-mute">{byCategory.get(c)!.length}</span>
              {filter === c && (
                <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-[2px] bg-brass" />
              )}
            </button>
          ))}
        </div>
      </div>

      {visibleCategories.map((cat) => {
        const defs = byCategory.get(cat)!;
        const tone = INSIGNIA_TONES[cat];
        const earned = defs.filter((d) => unlockedByKey.has(d.key));
        const locked = defs.filter((d) => !unlockedByKey.has(d.key));
        return (
          <section key={cat} className="mb-11 last:mb-0">
            <SectionRule
              label={tone.label}
              accent={tone.metalDark}
              meta={`${earned.length} of ${defs.length} earned`}
            />

            {earned.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {earned.map((def) => {
                  const unlock = unlockedByKey.get(def.key)!;
                  return (
                    <div
                      key={def.key}
                      className="relative flex items-start gap-4 rounded-[4px] border border-line bg-panel p-4"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-[2px] opacity-70"
                        style={{ background: tone.metal }}
                      />
                      <Insignia icon={def.icon} category={cat} size={54} />
                      <div className="min-w-0 flex-1">
                        <div className="font-serif text-[1.12rem] font-semibold leading-tight text-cream">
                          {def.name}
                        </div>
                        <div className="mt-1 text-[0.86rem] leading-snug text-mist">
                          {def.desc}
                        </div>
                        <div className="mt-2.5 font-cond text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-mute">
                          <span className="text-gold">Earned</span>
                          <span className="normal-case tracking-normal">
                            {" · "}
                            {unlock.context ? `${unlock.context} · ` : ""}
                            {fmtDate(unlock.unlockedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {locked.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {locked.map((def) => (
                  <div
                    key={def.key}
                    className="flex flex-col items-center rounded-[4px] border border-line/70 px-3 pb-3.5 pt-4 text-center"
                  >
                    <Insignia icon={def.icon} category={cat} size={40} locked />
                    <span className="sr-only">Locked:</span>
                    <div className="mt-2.5 font-serif text-[0.98rem] font-medium leading-tight text-mist">
                      {def.name}
                    </div>
                    <div className="mt-1 text-[0.8rem] leading-snug text-dim">
                      {def.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <div className="mt-10 text-center font-serif text-[0.88rem] italic text-dim">
        Shared list, shared trophies — anyone with this page unlocks for the
        whole house.
      </div>
    </div>
  );
}

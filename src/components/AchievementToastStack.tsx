"use client";

import { useEffect, useState } from "react";
import { useTour } from "@/lib/tour-context";
import { ACHIEVEMENTS_BY_KEY } from "@/lib/achievements";
import type { AchievementUnlock } from "@/lib/types";

const VISIBLE_MS = 4200;

/** One toast card — mounts already at its entrance transform (never at
 *  opacity:0 waiting on an observer), flips to its "shown" position on the
 *  next frame so the transition actually animates, then flips again to its
 *  exit state shortly before `onDone` unmounts it. */
function Toast({
  unlock,
  onDone,
}: {
  unlock: AchievementUnlock;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const def = ACHIEVEMENTS_BY_KEY.get(unlock.key);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const leaveTimer = setTimeout(() => setLeaving(true), VISIBLE_MS);
    const doneTimer = setTimeout(onDone, VISIBLE_MS + 260);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!def) return null;

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-[min(360px,calc(100vw-32px))] items-center gap-3 rounded-[10px] border border-goldDeep/50 bg-panel px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(237,230,217,0.04)] transition-all duration-300 ease-out motion-reduce:transition-opacity ${
        shown && !leaving
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0"
      }`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-brass/40 bg-[radial-gradient(circle_at_35%_30%,#E5B93F,#8A6D2F_75%)] text-[1.05rem] leading-none shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]">
        {def.icon}
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[0.58rem] uppercase tracking-[0.13em] text-gold">
          Achievement Unlocked
        </div>
        <div className="mt-0.5 truncate font-serif text-[0.95rem] font-medium text-cream">
          {def.name}
        </div>
        <div className="mt-0.5 truncate text-[0.74rem] text-mist">
          {def.desc}
        </div>
      </div>
    </div>
  );
}

/** Mounted once in Shell so an achievement unlock pops up no matter which
 *  tab someone's on — the toast is independent of the Achievements page
 *  itself, which just reflects the same `achievementUnlocks` state at rest. */
export default function AchievementToastStack() {
  const { pendingAchievementToasts, dismissAchievementToast } = useTour();

  if (pendingAchievementToasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[1000] flex flex-col items-center gap-2.5 px-4"
    >
      {pendingAchievementToasts.map((u) => (
        <Toast
          key={u.key}
          unlock={u}
          onDone={() => dismissAchievementToast(u.key)}
        />
      ))}
    </div>
  );
}

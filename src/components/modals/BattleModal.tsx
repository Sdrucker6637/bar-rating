"use client";

import { useState } from "react";
import Modal from "./Modal";
import Icon from "../Icon";
import { StarRing } from "../ScoreSeal";
import { SCORE_CATS, fmtSub } from "../Scorecard";
import { fmt } from "@/lib/scoring";
import type { Bar } from "@/lib/types";
import type { BattlePair } from "@/lib/ranking";
import { btnPrimaryCls, modalTitleCls } from "@/lib/ui";

interface BattleModalProps {
  /** Live list of pairs still needing a tiebreak. The parent recomputes this
   *  from the shared battle state, so each recorded battle shrinks it and the
   *  modal simply advances to the next unresolved pair. */
  pairs: BattlePair[];
  onResolve: (
    bar1Id: string,
    bar2Id: string,
    winnerId: string,
  ) => Promise<boolean>;
  onClose: () => void;
}

function BattleKicker({ right }: { right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 font-cond text-kicker font-semibold uppercase text-gold">
        <Icon name="swords" size={14} /> Bar Battle
      </div>
      {right}
    </div>
  );
}

/** One corner of the head-to-head. The whole corner is the vote. */
function Contender({
  bar,
  side,
  disabled,
  onPick,
}: {
  bar: Bar;
  side: "left" | "right";
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      aria-label={`${bar.name} wins`}
      className={`group relative flex sm:min-h-[7.5rem] w-full min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-[4px] border border-line2 bg-panel p-3.5 transition-[border-color,background-color,transform] duration-150 hover:border-brass hover:bg-[#2A221C] active:scale-[0.985] disabled:cursor-default disabled:opacity-50 sm:p-5 ${
        side === "left" ? "items-start text-left" : "items-end text-right"
      }`}
    >
      <span className="min-w-0">
        <span className="block break-words font-serif text-[1.25rem] font-semibold leading-[1.15] text-cream transition-colors group-hover:text-gold sm:text-[1.45rem]">
          {bar.name}
        </span>
        {bar.neighborhood && (
          <span className="mt-1 block text-[0.84rem] text-mute">
            {bar.neighborhood}
          </span>
        )}
      </span>
      <span className="inline-flex items-center gap-1.5 font-cond text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-mist transition-colors group-hover:text-cream">
        {side === "left" && <Icon name="arrowLeft" size={13} />}
        Pick
        {side === "right" && <Icon name="arrowRight" size={13} />}
      </span>
    </button>
  );
}

/** Tale of the tape: the two bars' category marks, mirrored around the
 *  category name, the stronger side lit. */
function TaleOfTheTape({ a, b }: { a: Bar; b: Bar }) {
  return (
    <div className="mt-5 rounded-[4px] border border-line bg-well/60 px-3 py-3 sm:px-5">
      <div className="mb-2 text-center font-cond text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-mute">
        Tale of the tape
      </div>
      <div className="flex flex-col gap-2">
        {SCORE_CATS.map(({ key, label }) => {
          const va = a[key];
          const vb = b[key];
          const na = va ?? 0;
          const nb = vb ?? 0;
          const aWins = va !== null && (vb === null || na > nb);
          const bWins = vb !== null && (va === null || nb > na);
          return (
            <div
              key={key}
              className="grid grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] sm:gap-3"
            >
              <div className="flex items-center justify-end gap-2">
                <span className="relative hidden h-[3px] flex-1 overflow-hidden rounded-full bg-line sm:block">
                  <span
                    className={`absolute inset-y-0 right-0 rounded-full ${aWins ? "bg-brass" : "bg-mist/40"}`}
                    style={{ width: `${Math.min(10, na) * 10}%` }}
                  />
                </span>
                <span
                  className={`tda-num w-9 text-right font-cond text-[1.15rem] font-semibold ${aWins ? "text-cream" : "text-mute"}`}
                >
                  {fmtSub(va)}
                </span>
              </div>
              <span className="text-center font-cond text-[0.82rem] font-semibold uppercase tracking-[0.1em] text-mist">
                {label}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`tda-num w-9 font-cond text-[1.15rem] font-semibold ${bWins ? "text-cream" : "text-mute"}`}
                >
                  {fmtSub(vb)}
                </span>
                <span className="relative hidden h-[3px] flex-1 overflow-hidden rounded-full bg-line sm:block">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${bWins ? "bg-brass" : "bg-mist/40"}`}
                    style={{ width: `${Math.min(10, nb) * 10}%` }}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BattleModal({
  pairs,
  onResolve,
  onClose,
}: BattleModalProps) {
  const [flashName, setFlashName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState(false);

  if (pairs.length === 0) {
    return (
      <Modal onClose={onClose} maxWidth="520px">
        <BattleKicker />
        <h3 className={`${modalTitleCls} mt-3`}>All ties settled!</h3>
        <p className="mb-0 mt-2.5 text-[0.92rem] leading-relaxed text-mist">
          Every tied pair now has a shared winner, so the leaderboard&apos;s
          order is decided.
        </p>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className={btnPrimaryCls}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  const pair = pairs[0];
  const multi = pairs.length > 1;

  const choose = async (winnerId: string) => {
    if (resolving) return;
    const winnerName =
      winnerId === pair.bar1.id ? pair.bar1.name : pair.bar2.name;
    setResolving(true);
    setError(false);
    const ok = await onResolve(pair.bar1.id, pair.bar2.id, winnerId);
    setResolving(false);
    if (!ok) {
      setError(true);
      return;
    }
    setFlashName(winnerName);
    window.setTimeout(() => setFlashName(null), 950);
  };

  return (
    <Modal onClose={onClose} maxWidth="680px">
      <BattleKicker
        right={
          multi ? (
            <span className="font-cond text-[0.85rem] font-medium tracking-[0.04em] text-mute">
              {pairs.length} matchups left
            </span>
          ) : null
        }
      />
      <h3 className={`${modalTitleCls} mt-3`}>
        These bars finished with the same score.
      </h3>
      <p className="mb-0 mt-2 font-serif text-[1rem] italic text-mist">
        Which do you prefer? The winner takes the higher spot — scores stay
        untouched.
      </p>

      {flashName ? (
        // The championship moment: the house star ring turns into place
        // around the trophy and the winner's name rises underneath.
        <div
          role="status"
          className="mt-6 flex flex-col items-center rounded-[4px] border border-brass/40 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(240,199,90,0.12),transparent_70%)] px-5 py-7 text-center"
        >
          <div className="relative flex h-[92px] w-[92px] items-center justify-center">
            <StarRing
              size={92}
              tone="leader"
              className="absolute inset-0 animate-[tda-crown_520ms_cubic-bezier(0.2,0.8,0.2,1)_both]"
            />
            <Icon
              name="trophy"
              size={28}
              className="relative animate-[tda-strike_420ms_ease-out_120ms_both] text-maillot"
            />
          </div>
          <div className="mt-4 font-cond text-kicker font-semibold uppercase text-maillot">
            Tiebreaker won
          </div>
          <div className="mt-1.5 animate-[tda-rise_360ms_ease-out_160ms_both] font-serif text-[1.9rem] font-semibold italic leading-tight text-cream">
            {flashName} wins!
          </div>
          <div className="mt-2 text-[0.85rem] text-mute">
            settling the next matchup…
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
            <Contender
              bar={pair.bar1}
              side="left"
              disabled={resolving}
              onPick={() => choose(pair.bar1.id)}
            />
            <div className="flex items-center justify-center gap-3 py-1 sm:flex-col sm:gap-2 sm:py-0">
              <span className="font-serif text-[1.7rem] font-semibold italic leading-none text-gold sm:text-[2.2rem]">
                vs
              </span>
              <span className="tda-num rounded-[2px] border border-line2 px-1.5 py-0.5 font-cond text-[0.95rem] font-semibold text-cream">
                {fmt(pair.score)}
              </span>
              <span className="font-cond text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-mute">
                each
              </span>
            </div>
            <Contender
              bar={pair.bar2}
              side="right"
              disabled={resolving}
              onPick={() => choose(pair.bar2.id)}
            />
          </div>

          <TaleOfTheTape a={pair.bar1} b={pair.bar2} />

          {error && (
            <p className="mb-0 mt-3 text-[0.85rem] text-red">
              Couldn&apos;t save that battle — check your connection and try
              again.
            </p>
          )}
        </>
      )}

      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="h-9 cursor-pointer rounded-[3px] border-none bg-transparent px-2 font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] text-mute transition-colors hover:text-cream"
        >
          Skip for now
        </button>
      </div>
    </Modal>
  );
}

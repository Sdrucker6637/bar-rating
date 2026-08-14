"use client";

import { useState } from "react";
import Modal from "./Modal";
import Icon from "../Icon";
import { fmt } from "@/lib/scoring";
import type { BattlePair } from "@/lib/ranking";

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
        <div className="flex items-center gap-2 font-mono text-kicker uppercase text-gold">
          <Icon name="swords" size={13} /> Bar Battle
        </div>
        <h3 className="mt-3 font-serif text-title-md font-medium text-cream">
          All ties settled!
        </h3>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-mist">
          Every tied pair now has a shared winner, so the leaderboard&apos;s
          order is decided.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-brass px-5 py-2.5 font-mono text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-deep shadow-lift transition-all duration-150 hover:bg-gold active:scale-[0.98]"
          >
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

  const contenderBtn =
    "group flex w-full cursor-pointer flex-col items-start gap-1 rounded-[8px] border border-[rgba(184,150,95,0.28)] bg-ink px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(237,230,217,0.03)] transition-all duration-150 hover:border-gold hover:bg-[rgba(184,150,95,0.07)] active:scale-[0.985] disabled:cursor-default disabled:opacity-50";

  return (
    <Modal onClose={onClose} maxWidth="520px">
      <div className="flex items-center gap-2 font-mono text-kicker uppercase text-gold">
        <Icon name="swords" size={13} /> Bar Battle
      </div>
      <h3 className="mt-3 font-serif text-title-md font-medium text-cream">
        These bars finished with the same score.
      </h3>
      <p className="mt-1.5 text-[0.85rem] italic text-mist">
        Which do you prefer? The winner takes the higher spot — scores stay
        untouched.
      </p>

      {flashName ? (
        <div className="mt-5 rounded-[8px] border border-brass/30 bg-[rgba(184,150,95,0.08)] px-5 py-6 text-center">
          <div className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-gold">
            ⚔️ Tiebreaker won
          </div>
          <div className="mt-2 font-serif text-title-md font-medium text-cream">
            {flashName} wins!
          </div>
          <div className="mt-1.5 font-mono text-[0.7rem] text-mute">
            settling the next matchup…
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              className={contenderBtn}
              disabled={resolving}
              onClick={() => choose(pair.bar1.id)}
            >
              <span className="font-serif text-[1.05rem] font-medium leading-snug text-cream group-hover:text-gold">
                {pair.bar1.name}
              </span>
              {pair.bar1.neighborhood && (
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
                  {pair.bar1.neighborhood}
                </span>
              )}
              <span className="mt-1 font-mono text-[0.72rem] text-gold">
                {fmt(pair.score)}
              </span>
            </button>
            <button
              type="button"
              className={contenderBtn}
              disabled={resolving}
              onClick={() => choose(pair.bar2.id)}
            >
              <span className="font-serif text-[1.05rem] font-medium leading-snug text-cream group-hover:text-gold">
                {pair.bar2.name}
              </span>
              {pair.bar2.neighborhood && (
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
                  {pair.bar2.neighborhood}
                </span>
              )}
              <span className="mt-1 font-mono text-[0.72rem] text-gold">
                {fmt(pair.score)}
              </span>
            </button>
          </div>
          {multi && (
            <p className="mt-3 font-mono text-[0.68rem] text-mute">
              {pairs.length} matchup{pairs.length === 1 ? "" : "s"} left to
              settle this tie.
            </p>
          )}
          {error && (
            <p className="mt-3 font-mono text-[0.7rem] text-red">
              Couldn&apos;t save that battle — check your connection and try
              again.
            </p>
          )}
        </>
      )}

      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="cursor-pointer border-none bg-transparent p-1 font-mono text-[0.7rem] uppercase tracking-[0.04em] text-mute transition-colors hover:text-cream"
        >
          Skip for now
        </button>
      </div>
    </Modal>
  );
}

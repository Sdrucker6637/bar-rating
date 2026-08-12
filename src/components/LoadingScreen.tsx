"use client";

import { useTour } from "@/lib/tour-context";

export default function LoadingScreen() {
  const { connError } = useTour();
  return (
    <div className="tda-atmosphere flex min-h-screen items-center justify-center p-6">
      {connError ? (
        <div className="flex items-center gap-2.5 rounded-[6px] border border-redDeep bg-[rgba(199,118,118,0.08)] px-4 py-3.5 font-mono text-[0.85rem] tracking-[0.02em] text-red">
          <span aria-hidden="true">⚠</span>
          couldn&apos;t connect — check your Firebase config
        </div>
      ) : (
        <div className="text-center">
          <div className="font-serif text-[1.2rem] italic text-gold">
            Tour de Alcoholism
          </div>
          <div className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mute">
            setting the table…
          </div>
        </div>
      )}
    </div>
  );
}

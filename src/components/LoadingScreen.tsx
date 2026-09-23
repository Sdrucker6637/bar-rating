"use client";

import { useTour } from "@/lib/tour-context";
import BrandMark from "./BrandMark";

export default function LoadingScreen() {
  const { connError } = useTour();
  return (
    <div className="tda-atmosphere flex min-h-screen items-center justify-center p-6">
      {connError ? (
        <div className="flex items-center gap-2.5 rounded-[3px] border border-redDeep bg-[rgba(168,69,63,0.1)] px-4 py-3.5 text-[0.9rem] text-red">
          <span aria-hidden="true">⚠</span>
          couldn&apos;t connect — check your Firebase config
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <BrandMark size={64} animated />
          <div className="mt-5 font-serif text-[1.5rem] font-semibold text-cream">
            Tour de <span className="font-normal italic text-gold">Alcoholism</span>
          </div>
          <div className="mt-1.5 animate-[tda-pulse_1.8s_ease-in-out_infinite] font-serif text-[0.95rem] italic text-mute">
            setting the table…
          </div>
        </div>
      )}
    </div>
  );
}

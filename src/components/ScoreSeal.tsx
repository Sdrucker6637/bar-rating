"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/scoring";

// Same five-point star, same ring count, as the app's own favicon/BrandMark
// (ten of them ringing a mug) — reused here so the motif means one
// consistent thing everywhere it appears.
export const STAR_PATH =
  "M0 -6 L-1.35 -1.85 L-5.71 -1.85 L-2.18 0.71 L-3.53 4.85 L0 2.29 L3.53 4.85 L2.18 0.71 L5.71 -1.85 L1.35 -1.85 Z";
const STAR_COUNT = 10;

type SealTone = "leader" | "quiet";

const TONES: Record<
  SealTone,
  { star: string; starOpacity: number; ring: string; inner: string; num: string }
> = {
  // The current leader: maillot-yellow stars, the only yellow on the board.
  leader: {
    star: "#F0C75A",
    starOpacity: 0.95,
    ring: "rgba(240,199,90,0.42)",
    inner: "rgba(240,199,90,0.2)",
    num: "#F6EEDC",
  },
  // Every other appearance: brass, pulled back, so the seal doesn't repeat
  // at full volume.
  quiet: {
    star: "#C9A26A",
    starOpacity: 0.6,
    ring: "rgba(201,162,106,0.28)",
    inner: "rgba(201,162,106,0.14)",
    num: "#F1E8D6",
  },
};

/** The star ring on its own — an insignia frame reused by the Bar Battle
 *  winner moment. */
export function StarRing({
  size,
  tone = "quiet",
  className = "",
}: {
  size: number;
  tone?: SealTone;
  className?: string;
}) {
  const t = TONES[tone];
  const r = size / 2;
  // Stars sit close to the rim so the medallion inside has room to breathe.
  const starRadius = r - size * 0.085;
  // Floored rather than purely proportional — below ~96px a linear scale
  // shrinks the star past where it reads as a star at all.
  const starScale = Math.max(0.6, (size / 96) * 0.62);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      {/* engraved double outer ring */}
      <circle cx={r} cy={r} r={r - 1} fill="none" stroke={t.ring} strokeWidth={1} />
      <circle
        cx={r}
        cy={r}
        r={r - Math.max(3, size * 0.028)}
        fill="none"
        stroke={t.ring}
        strokeOpacity={0.45}
        strokeWidth={0.75}
      />
      {Array.from({ length: STAR_COUNT }).map((_, i) => {
        const angle = (i / STAR_COUNT) * Math.PI * 2 - Math.PI / 2;
        const x = r + Math.cos(angle) * starRadius;
        const y = r + Math.sin(angle) * starRadius;
        return (
          <path
            key={i}
            d={STAR_PATH}
            fill={t.star}
            opacity={t.starOpacity}
            transform={`translate(${x} ${y}) scale(${starScale})`}
          />
        );
      })}
      {/* inner medallion */}
      <circle cx={r} cy={r} r={r - size * 0.16} fill="url(#tda-seal-fill)" />
      <circle
        cx={r}
        cy={r}
        r={r - size * 0.16}
        fill="none"
        stroke={t.inner}
        strokeWidth={1}
      />
      <defs>
        <radialGradient id="tda-seal-fill" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#2B241E" />
          <stop offset="100%" stopColor="#15110E" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Count-up plays once per browser session (the first time the leader's seal
// is seen), never on every tab switch.
let countedUp = false;

function useCountUp(target: number | null, enabled: boolean) {
  const [value, setValue] = useState<number | null>(() =>
    enabled && !countedUp && target !== null ? 0 : target,
  );
  useEffect(() => {
    if (!enabled || countedUp || target === null) {
      setValue(target);
      return;
    }
    countedUp = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const dur = 850;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);
  return value;
}

interface ScoreSealProps {
  score: number | null;
  label?: string;
  size?: number;
  tone?: SealTone;
  /** Count the number up from zero the first time it's seen this session. */
  countUp?: boolean;
  className?: string;
}

/** The house's rating insignia — the emblem's star ring around a score.
 *  The leader carries the full maillot version; anywhere else it appears
 *  quieter, so it reads as an earned distinction rather than a widget. */
export default function ScoreSeal({
  score,
  label,
  size = 96,
  tone = "quiet",
  countUp = false,
  className = "",
}: ScoreSealProps) {
  const shown = useCountUp(score, countUp);
  const t = TONES[tone];

  return (
    <div
      className={`relative inline-flex flex-shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        score === null ? "No score yet" : `Score ${fmt(score)} out of 10`
      }
    >
      <StarRing size={size} tone={tone} className="absolute inset-0" />
      <div className="relative flex flex-col items-center justify-center">
        <span
          className="tda-num font-serif font-semibold leading-none tracking-[-0.02em]"
          style={{ fontSize: size * (label ? 0.2 : 0.22), color: t.num }}
        >
          {fmt(shown)}
        </span>
        {label && (
          <span
            className="mt-1 whitespace-nowrap font-cond font-semibold uppercase tracking-[0.12em] text-mute"
            style={{ fontSize: Math.max(9.5, size * 0.085) }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

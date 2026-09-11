import { fmt } from "@/lib/scoring";

// Same five-point star, same ring count, as the app's own favicon/BrandMark
// (ten of them ringing a mug) — reused here so the motif means one
// consistent thing everywhere it appears: "this is the number that matters
// most on this screen."
const STAR_PATH =
  "M0 -6 L-1.35 -1.85 L-5.71 -1.85 L-2.18 0.71 L-3.53 4.85 L0 2.29 L3.53 4.85 L2.18 0.71 L5.71 -1.85 L1.35 -1.85 Z";
const STAR_COUNT = 10;

interface ScoreSealProps {
  score: number | null;
  label?: string;
  size?: number;
  className?: string;
}

/** The house's signature score mark — the same star ring as the app's own
 *  emblem (see BrandMark/the favicon), circling the number instead of a mug.
 *  Deliberately reserved
 *  for the single best score on a screen — a leaderboard champion, a #1
 *  ranked bar — so it reads as an earned distinction rather than a widget
 *  repeated on every card. */
export default function ScoreSeal({
  score,
  label,
  size = 96,
  className = "",
}: ScoreSealProps) {
  const r = size / 2;
  const starRadius = r - size * 0.09;
  const starScale = (size / 96) * 0.62;

  return (
    <div
      className={`relative inline-flex flex-shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        score === null ? "No score yet" : `Score ${fmt(score)} out of 10`
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <circle
          cx={r}
          cy={r}
          r={r - 1}
          fill="none"
          stroke="rgba(184,150,95,0.24)"
          strokeWidth={1}
        />
        <circle
          cx={r}
          cy={r}
          r={r - size * 0.065}
          fill="none"
          stroke="rgba(184,150,95,0.15)"
          strokeWidth={1}
        />
        {Array.from({ length: STAR_COUNT }).map((_, i) => {
          const angle = (i / STAR_COUNT) * Math.PI * 2 - Math.PI / 2;
          const x = r + Math.cos(angle) * starRadius;
          const y = r + Math.sin(angle) * starRadius;
          return (
            <path
              key={i}
              d={STAR_PATH}
              fill="#E5B93F"
              opacity={0.88}
              transform={`translate(${x} ${y}) scale(${starScale})`}
            />
          );
        })}
      </svg>
      <div className="relative flex flex-col items-center justify-center">
        <span
          className="font-serif font-medium leading-none text-gold [text-shadow:0_0_18px_rgba(201,168,118,0.4)]"
          style={{ fontSize: size * 0.27 }}
        >
          {fmt(score)}
        </span>
        {label && (
          <span
            className="mt-1 whitespace-nowrap font-mono uppercase tracking-[0.12em] text-mute"
            style={{ fontSize: Math.max(8, size * 0.085) }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

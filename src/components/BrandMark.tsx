// Same star used by ScoreSeal, and by the favicon this component's markup
// mirrors byte-for-byte (see the data: URI in layout.tsx).
const STAR_PATH =
  "M0 -6 L-1.35 -1.85 L-5.71 -1.85 L-2.18 0.71 L-3.53 4.85 L0 2.29 L3.53 4.85 L2.18 0.71 L5.71 -1.85 L1.35 -1.85 Z";
const STAR_COUNT = 10;

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** The house emblem — a mug ringed by ten stars. ScoreSeal borrows this same
 *  star-ring math in gold, circling a score instead of the mascot formed
 *  here; together they're the one recurring mark that ties the header, the
 *  favicon, and a screen's best number back to the same identity. */
export default function BrandMark({ size = 32, className = "" }: BrandMarkProps) {
  const center = 36;
  const starRadius = 28;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      className={className}
      aria-hidden="true"
    >
      {Array.from({ length: STAR_COUNT }).map((_, i) => {
        const angle = (i / STAR_COUNT) * Math.PI * 2 - Math.PI / 2;
        const x = center + Math.cos(angle) * starRadius;
        const y = center + Math.sin(angle) * starRadius;
        return (
          <path
            key={i}
            d={STAR_PATH}
            fill="#F7F0E1"
            transform={`translate(${x} ${y}) scale(0.8)`}
          />
        );
      })}
      <g transform="translate(20.87 18.02) scale(0.62)">
        <path
          d="M39 30 h6 a9 9 0 0 1 0 18 h-6"
          fill="none"
          stroke="#16130F"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path
          d="M39 30 h6a9 9 0 0 1 0 18 h-6"
          fill="none"
          stroke="#DCEAEE"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.92}
        />
        <rect
          x={9}
          y={18}
          width={30}
          height={42}
          rx={5}
          fill="#E5B93F"
          fillOpacity={0.88}
          stroke="#16130F"
          strokeOpacity={0.5}
          strokeWidth={3.5}
        />
        <rect x={13} y={38} width={24} height={6} rx={1} fill="#8A6D2F" opacity={0.5} />
        <rect x={15} y={24} width={5} height={32} rx={2.5} fill="#FFFFFF" opacity={0.4} />
        <rect x={32} y={26} width={2.5} height={28} rx={1.25} fill="#FFFFFF" opacity={0.22} />
        <path
          d="M3.6 22.0 C2.8 13.0 7.9 6.0 13.0 9.0 C14.7 1.0 22.3 -1.0 25.7 5.0 C29.9 -2.0 37.6 1.0 37.6 9.0 C42.7 7.0 45.2 15.0 41.8 22.0 Z"
          fill="#F7F0E1"
        />
      </g>
    </svg>
  );
}

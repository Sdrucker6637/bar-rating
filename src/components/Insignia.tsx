import type { AchievementCategory } from "@/lib/achievements";

/** Enamel-and-metal palette per award category — warm metals first, with a
 *  few muted enamels so the six families stay distinguishable. */
export const INSIGNIA_TONES: Record<
  AchievementCategory,
  { metal: string; metalDark: string; enamel: string; label: string }
> = {
  exploration: { metal: "#9FBFA6", metalDark: "#3F6B4E", enamel: "#1C2B22", label: "Exploration" },
  rating: { metal: "#E2C48E", metalDark: "#8C6D3E", enamel: "#2A2016", label: "Rating" },
  battle: { metal: "#E4A39B", metalDark: "#8E3A35", enamel: "#2B1614", label: "Leaderboard & Bar Battle" },
  wishlist: { metal: "#D3CFD6", metalDark: "#77727C", enamel: "#1F1D22", label: "Wishlist" },
  crawl: { metal: "#A9C0D1", metalDark: "#3D5467", enamel: "#17212A", label: "Crawl Planning" },
  split: { metal: "#DDAE84", metalDark: "#8F5A34", enamel: "#2A1A10", label: "Split the Bill" },
};

const BEADS = 28;

/** An award insignia: a struck-metal rim with a beaded edge around an
 *  enamel center holding the award's glyph. Locked awards are the same
 *  object, un-struck — a debossed blank with a keyhole, so "locked" reads
 *  as intentional rather than faded. */
export default function Insignia({
  icon,
  category,
  size = 52,
  locked = false,
  className = "",
  strike = false,
}: {
  icon: string;
  category: AchievementCategory;
  size?: number;
  locked?: boolean;
  className?: string;
  /** Play the "struck" landing animation (unlock toast). */
  strike?: boolean;
}) {
  const t = INSIGNIA_TONES[category];
  const r = size / 2;
  const gid = `ins-${category}-${locked ? "l" : "u"}`;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex flex-shrink-0 items-center justify-center ${
        strike ? "animate-[tda-strike_480ms_cubic-bezier(0.2,0.8,0.2,1)_both]" : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={locked ? "#2E2620" : t.metal} />
            <stop offset="100%" stopColor={locked ? "#1C1714" : t.metalDark} />
          </linearGradient>
        </defs>
        {locked ? (
          <>
            <circle cx={r} cy={r} r={r - 1} fill="#17130F" stroke="#3A2F28" strokeWidth={1} />
            <circle
              cx={r}
              cy={r}
              r={r - size * 0.14}
              fill="#110E0B"
              stroke="#2B231E"
              strokeWidth={1}
              strokeDasharray="2 2.5"
            />
            {/* keyhole */}
            <circle cx={r} cy={r - size * 0.05} r={size * 0.07} fill="#4E4034" />
            <path
              d={`M ${r - size * 0.04} ${r} L ${r + size * 0.04} ${r} L ${r + size * 0.055} ${r + size * 0.15} L ${r - size * 0.055} ${r + size * 0.15} Z`}
              fill="#4E4034"
            />
          </>
        ) : (
          <>
            {/* metal rim */}
            <circle cx={r} cy={r} r={r - 0.5} fill={`url(#${gid})`} />
            {/* beaded edge */}
            {Array.from({ length: BEADS }).map((_, i) => {
              const a = (i / BEADS) * Math.PI * 2;
              const br = r - size * 0.07;
              return (
                <circle
                  key={i}
                  cx={r + Math.cos(a) * br}
                  cy={r + Math.sin(a) * br}
                  r={Math.max(0.55, size * 0.018)}
                  fill="rgba(0,0,0,0.28)"
                />
              );
            })}
            {/* enamel center */}
            <circle cx={r} cy={r} r={r - size * 0.15} fill={t.enamel} />
            <circle
              cx={r}
              cy={r}
              r={r - size * 0.15}
              fill="none"
              stroke="rgba(0,0,0,0.45)"
              strokeWidth={1.2}
            />
            {/* glint */}
            <path
              d={`M ${r - r * 0.62} ${r - r * 0.35} A ${r * 0.78} ${r * 0.78} 0 0 1 ${r - r * 0.1} ${r - r * 0.78}`}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
      {!locked && (
        <span className="relative leading-none" style={{ fontSize: size * 0.36 }}>
          {icon}
        </span>
      )}
    </span>
  );
}

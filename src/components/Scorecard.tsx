import type { Bar } from "@/lib/types";

export type ScoreKey = "vibe" | "value" | "service" | "food" | "drinks";

export const SCORE_CATS: { key: ScoreKey; label: string }[] = [
  { key: "vibe", label: "Vibe" },
  { key: "value", label: "Value" },
  { key: "service", label: "Service" },
  { key: "food", label: "Food" },
  { key: "drinks", label: "Drinks" },
];

/** Display-only: sub-scores read as a guide would print them — "9",
 *  "5.5", "7.25" — without the trailing zeros of the overall average. */
export function fmtSub(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return String(Number(Number(v).toFixed(2)));
}

type Size = "sm" | "md" | "lg";

const NUM: Record<Size, string> = {
  sm: "text-[1.05rem]",
  md: "text-[1.2rem]",
  lg: "text-[1.55rem]",
};

/** A bar's five category marks as a rating-guide scorecard: a figure over a
 *  hairline scale (0–10). Only a 9+ earns a brass mark, so a glance shows
 *  where a bar actually excels. With `labels="none"` the category names are
 *  left to a shared column header (the classification table). */
export default function Scorecard({
  bar,
  highlight = null,
  labels = "always",
  size = "sm",
  align = "center",
  className = "",
}: {
  bar: Bar;
  highlight?: ScoreKey | null;
  labels?: "always" | "none";
  size?: Size;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-5 gap-x-2.5 sm:gap-x-3 ${className}`}>
      {SCORE_CATS.map(({ key, label }) => {
        const v = bar[key];
        const has = v !== null && v !== undefined && !isNaN(v);
        const pct = has ? Math.max(0, Math.min(10, v as number)) * 10 : 0;
        const top = has && (v as number) >= 9;
        const low = has && (v as number) < 5;
        const hi = highlight === key;
        return (
          <div
            key={key}
            className={`flex min-w-0 flex-col gap-1 ${
              align === "center" ? "items-center text-center" : "items-start"
            }`}
            title={`${label}: ${fmtSub(v)}`}
          >
            <span
              className={`tda-num font-cond font-semibold leading-none ${NUM[size]} ${
                hi || top ? "text-cream" : low ? "text-mute" : "text-creamSoft"
              }`}
            >
              {fmtSub(v)}
            </span>
            <span
              aria-hidden="true"
              className={`relative block h-[3px] w-full overflow-hidden rounded-full bg-line ${
                align === "center" ? "max-w-[3.25rem]" : ""
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 rounded-full ${
                  top || hi ? "bg-brass" : low ? "bg-mute/45" : "bg-mist/55"
                }`}
                style={{ width: `${pct}%` }}
              />
            </span>
            {labels === "always" && (
              <span
                className={`font-cond text-[0.74rem] font-semibold uppercase tracking-[0.1em] ${
                  hi ? "text-gold" : "text-mute"
                }`}
              >
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

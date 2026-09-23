import { STAR_PATH } from "./ScoreSeal";

/** A bar-menu ornamental rule: hairline · star · hairline. Used sparingly —
 *  under the masthead, and to close out empty states — so it stays a
 *  signature rather than wallpaper. */
export default function Ornament({
  className = "",
  tone = "brass",
}: {
  className?: string;
  tone?: "brass" | "quiet";
}) {
  const fill = tone === "brass" ? "#C9A26A" : "#5A4B3E";
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center gap-3 ${className}`}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line2" />
      <svg width="30" height="10" viewBox="-15 -5 30 10">
        <path d={STAR_PATH} fill={fill} transform="translate(0 0) scale(0.7)" />
        <circle cx="-10" cy="0.4" r="1" fill={fill} opacity="0.6" />
        <circle cx="10" cy="0.4" r="1" fill={fill} opacity="0.6" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line2" />
    </div>
  );
}

/** A section heading in the classification style:
 *  LABEL ─────────────────── meta */
export function SectionRule({
  label,
  meta,
  accent,
  className = "",
}: {
  label: React.ReactNode;
  meta?: React.ReactNode;
  /** Small colored mark before the label (e.g. claret for Hors Course). */
  accent?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="flex items-center gap-2 font-cond text-kicker font-semibold uppercase text-mist">
        {accent && (
          <span
            aria-hidden="true"
            className="h-[7px] w-[7px] rotate-45"
            style={{ background: accent }}
          />
        )}
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      {meta && (
        <span className="font-cond text-[0.85rem] font-medium tracking-[0.04em] text-mute">
          {meta}
        </span>
      )}
    </div>
  );
}

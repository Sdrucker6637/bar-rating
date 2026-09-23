import type { ReactNode } from "react";

/** Page opener — a small condensed section label, a Fraunces headline, the
 *  guide-voice standfirst, and an optional action aligned to the right on
 *  wider screens (full-width underneath on phones). */
export default function TabIntro({
  title,
  sub,
  kicker,
  action,
}: {
  title: string;
  sub: string;
  kicker?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="min-w-0">
        {kicker && (
          <div className="mb-2 font-cond text-kicker font-semibold uppercase text-mute">
            {kicker}
          </div>
        )}
        <h2 className="m-0 font-serif text-display font-semibold text-cream">
          {title}
        </h2>
        <p className="mb-0 mt-2.5 max-w-[56ch] text-[0.95rem] leading-relaxed text-mist">
          {sub}
        </p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

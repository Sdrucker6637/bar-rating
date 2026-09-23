import type { ReactNode } from "react";
import Icon from "./Icon";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
}

/** Shared empty/loading-adjacent state — an engraved glyph, a line in the
 *  guide's italic voice, and a plain hint. Restrained on purpose. */
export default function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line2 text-mute"
      >
        {icon ?? <Icon name="martini" size={20} />}
      </div>
      <div className="font-serif text-[1.15rem] italic text-cream">{title}</div>
      {hint && (
        <div className="mt-1.5 max-w-[46ch] text-[0.88rem] text-mute">{hint}</div>
      )}
    </div>
  );
}

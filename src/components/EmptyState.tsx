import type { ReactNode } from "react";
import Icon from "./Icon";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
}

/** Shared empty/loading-adjacent state — a dashed "receipt" rule and a small
 *  editorial voice instead of a bare gray sentence. Kept restrained on purpose. */
export default function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div className="border-t border-dashed border-line2 py-10 text-center">
      <div aria-hidden="true" className="mb-2.5 flex justify-center opacity-60">
        {icon ?? <Icon name="martini" size={18} />}
      </div>
      <div className="font-serif text-[1rem] italic text-mist">{title}</div>
      {hint && (
        <div className="mt-1.5 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-dim">
          {hint}
        </div>
      )}
    </div>
  );
}

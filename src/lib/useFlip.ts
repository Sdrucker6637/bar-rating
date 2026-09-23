"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

/** FLIP reordering for a list whose items carry `data-flip-id`.
 *
 *  Call `snapshot()` immediately BEFORE a state change that reorders the
 *  list (a sort or filter toggle). On the next commit every item that moved
 *  glides from its old position to its new one, so a re-ranking is SEEN,
 *  not just swapped. Purely visual: it never touches the data or order, and
 *  it does nothing under prefers-reduced-motion. */
export function useFlip(containerRef: RefObject<HTMLElement>) {
  const first = useRef<Map<string, DOMRect> | null>(null);

  const snapshot = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rects = new Map<string, DOMRect>();
    el.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((n) => {
      rects.set(n.dataset.flipId!, n.getBoundingClientRect());
    });
    first.current = rects;
  }, [containerRef]);

  useLayoutEffect(() => {
    const rects = first.current;
    const el = containerRef.current;
    if (!rects || !el) return;
    first.current = null;
    el.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((n) => {
      if (typeof n.animate !== "function") return;
      const before = rects.get(n.dataset.flipId!);
      const after = n.getBoundingClientRect();
      if (!before) {
        n.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 260,
          easing: "ease-out",
        });
        return;
      }
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      n.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 460, easing: "cubic-bezier(0.2, 0.75, 0.2, 1)" },
      );
    });
  });

  return snapshot;
}

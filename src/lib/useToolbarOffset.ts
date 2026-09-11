"use client";

import { useEffect, useState } from "react";

/** How far the fixed mobile bottom nav needs to sit above the page's own
 *  bottom edge to actually stay clear of the browser's own chrome.
 *
 *  `position: fixed; bottom: 0` alone isn't enough on mobile Safari (and to
 *  a lesser extent mobile Chrome): the collapsible address bar/toolbar isn't
 *  part of the page, so right after a fresh load or navigation — before the
 *  toolbar has settled to its compact state — `bottom: 0` can render
 *  directly behind it instead of above it, which is exactly what "the tabs
 *  aren't visible until I scroll" looks like (scrolling is what collapses
 *  the toolbar). `env(safe-area-inset-bottom)` doesn't help here: that's the
 *  home-indicator inset, a separate, always-on space; it says nothing about
 *  the toolbar's current (variable) height.
 *
 *  window.visualViewport reports the area actually visible right now, so
 *  the gap between it and the full layout viewport (window.innerHeight) is
 *  exactly how much of the bottom the browser's own UI currently covers.
 *  Tracking that and adding it to `bottom` keeps the nav above the chrome
 *  at all times — collapsed, expanded, or mid-animation — with no scroll
 *  required to first reveal it. Browsers without visualViewport (or
 *  desktop, where there's no such overlay) just get 0, i.e. today's
 *  behavior. */
export function useToolbarOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const covered = window.innerHeight - (vv.height + vv.offsetTop);
      setOffset(Math.max(0, Math.round(covered)));
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}

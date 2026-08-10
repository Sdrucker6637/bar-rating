/** Shared Tailwind class strings so repeated UI patterns stay pixel-consistent.
 *  One button language: `findBtnCls`/`altBtnCls` for standalone marquee actions,
 *  `primaryBtnCls`/`secondaryBtnCls` for paired modal footer actions,
 *  `ghostBtnCls`/`delBtnCls` for low-emphasis card-row actions. */

const btnBase =
  "inline-flex items-center justify-center gap-1.5 cursor-pointer rounded-full font-mono text-[0.78rem] font-semibold uppercase tracking-[0.04em] transition-all duration-150 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0";

export const inputCls =
  "w-full rounded-[6px] border border-line2 bg-ink px-3.5 py-2.5 font-sans text-[0.88rem] text-cream placeholder:text-dim focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20 tda-input transition-colors";

/** The one true "primary" marquee CTA — Find Bars, Plan Crawl. */
export const findBtnCls = `${btnBase} bg-brass px-6 py-3 text-deep shadow-lift hover:-translate-y-px hover:bg-gold hover:shadow-panel`;

/** Secondary marquee action — same shape as findBtnCls, one quiet fill so it never competes with it. */
export const altBtnCls = `${btnBase} border border-line2 bg-panel px-6 py-3 text-mist hover:-translate-y-px hover:border-brass hover:text-cream`;

/** Modal footer confirm button. */
export const primaryBtnCls = `${btnBase} flex-1 bg-brass px-4 py-2.5 text-deep shadow-lift hover:bg-gold active:scale-[0.98]`;

/** Modal footer cancel/back button. */
export const secondaryBtnCls = `${btnBase} flex-1 border border-line2 bg-transparent px-4 py-2.5 text-mist hover:border-brass hover:text-cream active:scale-[0.98]`;

export const addBtnCls =
  "mt-3 w-full cursor-pointer rounded-lg border border-dashed border-line2 bg-transparent px-5 py-3 font-mono text-[0.78rem] uppercase tracking-[0.04em] text-brass transition-colors hover:border-brass hover:bg-[rgba(184,150,95,0.06)]";

/** Low-emphasis action inside a card footer (Map, Edit, Disqualify). */
export const ghostBtnCls =
  "inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-line2 bg-transparent px-2.5 py-1.5 font-mono text-[0.7rem] text-mist no-underline transition-colors hover:border-brass hover:text-cream";

export const linkBtnCls = ghostBtnCls;

/** Destructive action — deliberately quiet at rest so it never reads as equal-weight to safe actions. */
export const delBtnCls =
  "cursor-pointer rounded-[6px] border border-transparent bg-transparent px-2 py-1.5 font-mono text-[0.68rem] text-dim no-underline transition-colors hover:border-redDeep hover:bg-[rgba(199,118,118,0.08)] hover:text-red";

/** Filter/mode toggle chip. Combine with chipActiveCls from the caller for the active state. */
export const chipCls =
  "inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line2 bg-transparent px-3.5 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.03em] text-mist transition-colors duration-150 hover:border-brass hover:text-cream disabled:cursor-default disabled:opacity-40";

export const chipActiveCls = "border-brass bg-brass text-deep font-semibold";

export const groupBtnCls =
  "flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-line2 bg-ink text-base leading-none text-brass transition-colors hover:border-brass disabled:cursor-default disabled:opacity-30";

export const tagCls =
  "rounded-full bg-line px-2.5 py-1 font-mono text-[0.66rem] text-mist";

/** Small uppercase mono label used above section/panel titles for editorial hierarchy. */
export const kickerCls = "font-mono text-kicker uppercase text-gold";

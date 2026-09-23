/** Shared Tailwind class strings — the design system's primitives.
 *
 *  ONE shape language: 3px corners on every control and surface. Circles are
 *  reserved for the emblems (ScoreSeal, award insignia) so they stay special.
 *
 *  FOUR action weights, and only four:
 *  - PRIMARY   brass fill, dark type — the one action a screen is about.
 *              `findBtnCls` (marquee), `primaryBtnCls` (modal footer),
 *              `btnPrimaryCls` (standalone).
 *  - SECONDARY warm hairline, parchment type — real but lesser actions.
 *              `altBtnCls`, `secondaryBtnCls`, `btnSecondaryCls`,
 *              `addBtnCls`, `visitedBtnCls`, `wishlistBtnCls` (bottle green).
 *  - TERTIARY  quiet text + icon, no border at rest — in-row actions.
 *              `ghostBtnCls`, `linkBtnCls`, `replaceBtnCls`.
 *  - DESTRUCTIVE tertiary at rest (so a list of rows never shouts red), and
 *              claret only on hover/focus — `dqBtnCls`, `removeBtnCls`. The
 *              confirm dialog is where claret gets to be loud.
 *
 *  Labels on controls are Barlow Condensed caps (race-programme type), not
 *  tracked monospace. */

const btnBase =
  "inline-flex select-none items-center justify-center gap-2 cursor-pointer rounded-[3px] font-cond text-[0.95rem] font-semibold uppercase leading-none tracking-[0.07em] transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:translate-y-px disabled:cursor-default disabled:opacity-40 disabled:active:translate-y-0";

const primaryFill =
  "bg-brass text-deep shadow-[inset_0_1px_0_rgba(255,244,220,0.35),0_1px_0_rgba(0,0,0,0.5)] hover:bg-gold disabled:hover:bg-brass";

const secondaryLine =
  "border border-line2 bg-transparent text-cream hover:border-brass/60 hover:bg-oak disabled:hover:border-line2 disabled:hover:bg-transparent";

/** Shared input treatment — an inset well with a warm hairline and a brass
 *  focus state. Entered text is set in Fraunces, the same voice as bar names,
 *  so typing into the app feels like writing in its guide. */
export const inputCls =
  "w-full rounded-[3px] border border-line2 bg-well px-3.5 py-2.5 font-serif text-[1rem] text-cream placeholder:text-dim shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-colors focus:border-brass/80 focus:outline-none focus:ring-2 focus:ring-brass/15 tda-input";

/** Form field label — condensed caps, quiet. */
export const labelCls =
  "font-cond text-[0.82rem] font-semibold uppercase tracking-[0.1em] text-mist";

/** Modal / dialog title. */
export const modalTitleCls =
  "m-0 font-serif text-[1.5rem] font-semibold leading-tight tracking-[-0.015em] text-cream";

/** The one true primary marquee CTA — Find Bars, Plan Crawl. */
export const findBtnCls = `${btnBase} ${primaryFill} h-12 px-6`;

/** Secondary marquee action — hairline, never competes with the primary. */
export const altBtnCls = `${btnBase} ${secondaryLine} h-12 px-6`;

/** Modal footer confirm button. */
export const primaryBtnCls = `${btnBase} ${primaryFill} h-11 flex-1 px-4`;

/** Modal footer cancel/back button. */
export const secondaryBtnCls = `${btnBase} border border-line2 bg-transparent text-mist hover:border-mute hover:text-cream h-11 flex-1 px-4`;

/** Standalone primary button (not flex-1). */
export const btnPrimaryCls = `${btnBase} ${primaryFill} h-11 px-5`;

/** Standalone quiet secondary button (not flex-1). */
export const btnSecondaryCls = `${btnBase} border border-line2 bg-transparent text-mist hover:border-mute hover:text-cream h-11 px-4`;

/** "Add" action (Add to wishlist by name, Add item) — a full-width
 *  secondary with a brass "+", not a dashed placeholder box. */
export const addBtnCls = `${btnBase} ${secondaryLine} mt-3 h-11 w-full px-5 text-mist hover:text-cream`;

/** Tertiary in-row action (Map, Edit) — quiet text + icon, no border at
 *  rest; a faint warm wash on hover. */
export const ghostBtnCls =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] text-mist no-underline transition-colors hover:bg-[rgba(241,232,214,0.05)] hover:text-cream active:translate-y-px";

/** Kept for call sites that distinguish "management" actions; it now shares
 *  the tertiary look — difference is carried by the label, not a color. */
export const ghostBtnGreenCls = ghostBtnCls;

export const linkBtnCls = ghostBtnCls;

/** Disqualify — tertiary at rest so a board of rows never reads as an error
 *  list; claret appears only when you reach for it. */
export const dqBtnCls =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] text-mist no-underline transition-colors hover:bg-[rgba(168,69,63,0.12)] hover:text-red active:translate-y-px";

/** Remove — same family as Disqualify, one notch quieter at rest. */
export const removeBtnCls =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] text-mute no-underline transition-colors hover:bg-[rgba(168,69,63,0.12)] hover:text-red active:translate-y-px";

/** Toggle chip (modes, filters, map layer). Squared like every control.
 *  Combine with chipActiveCls from the caller for the on state. */
export const chipCls =
  "inline-flex h-9 flex-shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[3px] border border-line2 bg-transparent px-3 font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] text-mist transition-colors duration-150 hover:border-mute hover:text-cream disabled:cursor-default disabled:opacity-40";

/** Utility filter chip — same object as chipCls now (one shape language). */
export const filterChipCls = chipCls;

// NOTE: the `!` important prefixes are load-bearing. chipCls sets
// border/bg/text utilities that Tailwind emits AFTER the extended colors, so
// without `!` the inactive styles would win and an "on" chip would silently
// render as off. Same for every *ActiveCls below.
export const chipActiveCls =
  "!border-brass/80 !bg-[rgba(201,162,106,0.14)] !text-cream";

export const filterChipActiveCls = chipActiveCls;

/** "Mode" toggles (Baller/Explore) share the on-state — brass means ON. */
export const modeChipActiveCls = chipActiveCls;

/** Cards no longer carry drop shadows — depth comes from the surface steps
 *  (base → panel → oak). Kept as exports so existing call sites compile. */
export const cardBaseShadowCls = "";
export const cardWarmSurfaceCls = "";

/** Hover feedback for passive containers — a surface step, not a glow. */
export const cardHoverCls = "transition-colors duration-150 hover:bg-panelHover";

/** Plain panel surface for forms and tools. */
export const surfaceCls = "rounded-[4px] border border-line bg-panel";

/** Split the Bill panels — the same surface; the totals panel adds
 *  `tda-receipt` for its perforated edge. */
export const receiptCls = "rounded-[4px] border border-line bg-panel";

// h-9/w-9 (36px) — this is the app's one stepper control (group size, crawl
// stops, split rounds/units/places); 28px was fiddly to tap one-handed.
export const groupBtnCls =
  "flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-[3px] border border-line2 bg-well font-cond text-[1.15rem] leading-none text-cream transition-colors hover:border-brass/70 active:translate-y-px disabled:cursor-default disabled:opacity-30";

/** Vibe tag — a bar-menu annotation, not a UI badge: italic serif separated
 *  by middots, with no box around it. */
export const tagCls =
  "font-serif text-[0.86rem] italic leading-snug text-mist after:ml-2 after:text-dim after:content-['·'] last:after:content-none";

/** Section label — condensed caps, quiet taupe (not gold: gold is earned). */
export const kickerCls =
  "font-cond text-kicker font-semibold uppercase text-mute";

/** "+ Wishlist" — the wishlist's bottle-green secondary action. */
export const wishlistBtnCls = `${btnBase} h-9 flex-1 border border-green bg-transparent px-3 text-[0.9rem] text-greenLight hover:bg-[rgba(63,107,78,0.25)] hover:text-cream`;

/** "I visited" — neutral secondary companion to wishlistBtnCls. */
export const visitedBtnCls = `${btnBase} h-9 border border-line2 bg-transparent px-3 text-[0.9rem] text-cream hover:border-brass/60 hover:bg-oak`;

/** "Replace" — re-roll a single result; tertiary. */
export const replaceBtnCls = `${ghostBtnCls} disabled:cursor-default disabled:opacity-50`;

/** Tiny "x" that pulls one entry out of a chip (a roster name, a
 *  screenshot) — quiet until hovered, then a claret wash. Callers add size. */
export const miniRemoveBtnCls =
  "flex flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent text-mute transition-colors hover:border-red/40 hover:bg-[rgba(168,69,63,0.15)] hover:text-red";

/** Segmented toggle (food filter, split method, share mode, map layer) — an
 *  inset well holding squared segments; the active segment is lifted onto
 *  oak with a brass hairline. The `!` is load-bearing (see chipActiveCls). */
export const segmentWrapCls =
  "inline-flex rounded-[3px] border border-line2 bg-well p-[3px]";
export const segmentBtnCls =
  "inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] px-3 font-cond text-[0.9rem] font-semibold uppercase tracking-[0.07em] text-mute transition-colors hover:text-cream disabled:cursor-default disabled:opacity-40";
export const segmentBtnActiveCls =
  "!bg-oak !text-cream shadow-[inset_0_0_0_1px_rgba(201,162,106,0.55)]";

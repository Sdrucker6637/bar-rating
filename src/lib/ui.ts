/** Shared Tailwind class strings so repeated UI patterns stay pixel-consistent.
 *  One button language, three weights:
 *  - PRIMARY (brass fill, pill): `findBtnCls` (marquee), `primaryBtnCls`
 *    (modal footer), `btnPrimaryCls` (standalone steps) — the heavy action.
 *  - SECONDARY (dark surface + hairline, squared): `altBtnCls` (marquee),
 *    `secondaryBtnCls` (modal footer), `btnSecondaryCls` (standalone steps).
 *  - TERTIARY/DESTRUCTIVE (quiet, in-card): `ghostBtnCls`/`ghostBtnGreenCls`,
 *    `dqBtnCls` (readable muted-danger), `removeBtnCls` (same family, quieter).
 *  Primary actions are pills, secondary actions are squared — shape reinforces
 *  importance without color shouting. Icons stay small and monochrome. */

const btnBase =
  "inline-flex items-center justify-center gap-1.5 cursor-pointer font-mono text-[0.78rem] font-semibold uppercase tracking-[0.04em] transition-all duration-150 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0";

/** Shared input treatment — a deliberate dark surface, not a default field:
 *  warm espresso fill, warm brass hairline at rest, faint inner depth, brass
 *  focus state. The typeface is the site's editorial serif (Fraunces, the
 *  same family as bar names) rather than the generic form-control sans, so
 *  entered text and placeholder carry the app's editorial character. */
export const inputCls =
  "w-full rounded-[6px] border border-[rgba(184,150,95,0.22)] bg-[#171310] px-3.5 py-2.5 font-serif text-[0.88rem] text-cream placeholder:text-mist shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20 tda-input transition-colors";

/** The one true "primary" marquee CTA — Find Bars, Plan Crawl. */
export const findBtnCls = `${btnBase} rounded-full bg-brass px-6 py-3 text-deep shadow-lift hover:-translate-y-px hover:bg-gold hover:shadow-panel`;

/** Secondary marquee action — squared and quiet so it never competes with the
 *  primary. Warm surface, warm brass hairline, warm cream text. */
export const altBtnCls = `${btnBase} rounded-[6px] border border-[rgba(184,150,95,0.28)] bg-panel px-6 py-3 text-mist hover:-translate-y-px hover:border-brass hover:text-cream`;

/** Modal footer confirm button. */
export const primaryBtnCls = `${btnBase} rounded-full flex-1 bg-brass px-4 py-2.5 text-deep shadow-lift hover:bg-gold active:scale-[0.98]`;

/** Modal footer cancel/back button. */
export const secondaryBtnCls = `${btnBase} rounded-[6px] flex-1 border border-[rgba(184,150,95,0.28)] bg-transparent px-4 py-2.5 text-mist hover:border-brass hover:text-cream active:scale-[0.98]`;

/** Standalone primary button (not flex-1) — split-flow continuations. */
export const btnPrimaryCls = `${btnBase} rounded-full bg-brass px-5 py-2.5 text-deep shadow-lift hover:-translate-y-px hover:bg-gold hover:shadow-panel`;

/** Standalone quiet secondary button (not flex-1) — split-flow back steps. */
export const btnSecondaryCls = `${btnBase} rounded-[6px] border border-[rgba(184,150,95,0.28)] bg-transparent px-4 py-2.5 text-mist hover:-translate-y-px hover:border-brass hover:text-cream`;

/** Dashed "add" CTA (Add a bar you visited, Add to wishlist, Add item) —
 *  rest state carries a clearly visible brass-dashed outline so the control
 *  reads as interactive against the dark walnut background, warming to a
 *  solid brass border on hover without ever becoming a filled gold button. */
export const addBtnCls =
  "mt-3 w-full cursor-pointer rounded-lg border border-dashed border-brass/45 bg-transparent px-5 py-3 font-mono text-[0.78rem] uppercase tracking-[0.04em] text-brass transition-colors hover:border-brass hover:bg-[rgba(184,150,95,0.06)]";

/** Low-emphasis action inside a card footer (Map, Edit) — a quiet bordered
 *  control; navigation actions warm to brass, management actions to green. */
export const ghostBtnCls =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-[rgba(184,150,95,0.25)] bg-transparent px-2.5 py-1.5 font-mono text-[0.7rem] text-mist no-underline transition-colors active:scale-[0.97] hover:border-brass hover:text-cream";

/** Same shape as ghostBtnCls but for "management" actions (Edit) — a muted
 *  green accent instead of brass, so it reads as a distinct kind of action
 *  rather than identical-looking buttons doing different things. */
export const ghostBtnGreenCls =
  "inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-[rgba(184,150,95,0.25)] bg-transparent px-2.5 py-1.5 font-mono text-[0.7rem] text-mist no-underline transition-colors active:scale-[0.97] hover:border-greenLight hover:text-cream";

export const linkBtnCls = ghostBtnCls;

/** Secondary/destructive in-card action (Disqualify) — clearly readable at
 *  rest (red text on a subtle red-tinted border) so it never reads as
 *  disabled, but small and quiet enough to stay below Map/Edit in weight.
 *  Warms slightly on hover without becoming a warning banner. */
export const dqBtnCls =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-redDeep/55 bg-[rgba(199,118,118,0.05)] px-2.5 py-1.5 font-mono text-[0.7rem] text-red no-underline transition-colors active:scale-[0.97] hover:border-red hover:bg-[rgba(199,118,118,0.1)] hover:text-redLight";

/** Destructive/quiet action (Remove) — same design family as Disqualify so
 *  the whole action row shares one language: readable red text on a subtle
 *  red-tinted border. One notch quieter than dqBtnCls (fainter border, no
 *  resting fill) so Disqualify stays the more present of the two. */
export const removeBtnCls =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-redDeep/40 bg-transparent px-2.5 py-1.5 font-mono text-[0.7rem] text-red no-underline transition-colors active:scale-[0.97] hover:border-red hover:bg-[rgba(199,118,118,0.1)] hover:text-redLight";

/** Filter/mode toggle chip. Combine with chipActiveCls from the caller for the active state. */
export const chipCls =
  "inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(184,150,95,0.28)] bg-transparent px-3.5 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.03em] text-mist transition-colors duration-150 hover:border-brass hover:text-cream disabled:cursor-default disabled:opacity-40";

/** Utility filter chip (Fits Our Group) — squared rather than pill, so
 *  plain filters read differently from the playful mode toggles below. */
export const filterChipCls =
  "inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-[5px] border border-[rgba(184,150,95,0.28)] bg-transparent px-3 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.03em] text-mist transition-colors duration-150 hover:border-brass hover:text-cream disabled:cursor-default disabled:opacity-40 sm:px-3.5";

/** Active state for filterChipCls — same important-modifier caveat as chipActiveCls. */
export const filterChipActiveCls =
  "!border-brass !bg-brass !text-deep font-semibold";

// NOTE: the `!` important prefixes are load-bearing. chipCls sets
// border-line2 / bg-transparent / text-mist, and Tailwind emits those core
// utilities AFTER the extended brass/gold colors, so without `!` the
// inactive styles would win and an "active" chip would silently render as
// inactive. Same reason modeChipActiveCls uses them.
export const chipActiveCls = "!border-brass !bg-brass !text-deep font-semibold";

/** Active state for "mode" toggles (Baller/Explore) — deliberately a different accent
 *  than chipActiveCls so playful modes read as distinct from plain utility filters. */
export const modeChipActiveCls =
  "!border-goldDeep !bg-goldDeep !text-cream font-semibold";

/** Restrained resting shadow so cards read as physical objects rather than
 *  flat fills — a faint top highlight plus a soft, tight drop shadow.
 *  Deliberately small/tight, not a "floating card" effect. */
export const cardBaseShadowCls =
  "shadow-[inset_0_1px_0_rgba(237,230,217,0.025),0_4px_14px_rgba(0,0,0,0.22)]";

/** A whisper of warm light catching one corner of a card — reads as the
 *  card sitting in the room's ambient light rather than a flat dark fill.
 *  Background-IMAGE layered on top of the card's own background-COLOR
 *  utility (bg-panel/bg-ink), so both coexist. */
export const cardWarmSurfaceCls =
  "bg-[linear-gradient(160deg,rgba(184,150,95,0.045)_0%,transparent_45%)]";

/** Shared hover feedback for passive (non-button) card containers, so lists feel alive. */
export const cardHoverCls =
  "transition-all duration-200 hover:border-line2 hover:shadow-[inset_0_1px_0_rgba(237,230,217,0.05),0_12px_28px_rgba(0,0,0,0.4)]";

export const groupBtnCls =
  "flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-[rgba(184,150,95,0.28)] bg-ink text-base leading-none text-brass transition-colors hover:border-brass disabled:cursor-default disabled:opacity-30";

/** Vibe tag on bar cards — a small menu label, not a UI badge: warm-black
 *  surface, faint brass hairline, muted cream italic serif. Compact and
 *  quietly editorial, always subordinate to the name, score, and stats. */
export const tagCls =
  "rounded-[4px] border border-[rgba(184,150,95,0.18)] bg-[#141110] px-2 py-[3px] font-serif text-[0.72rem] italic leading-snug text-creamSoft";

/** Small uppercase mono label used above section/panel titles for editorial hierarchy. */
export const kickerCls = "font-mono text-kicker uppercase text-gold";

"use client";

import type { ReactNode, SVGProps } from "react";

/**
 * Tiny hand-rolled icon set — 24px grid, thin strokes, monochrome
 * (inherits currentColor). Deliberately small: no icon library, no emoji,
 * just the few glyphs the app actually needs. Each icon renders at `size`
 * px and stays quiet/understated next to its label.
 */

const GLYPHS: Record<string, ReactNode> = {
  // magnifying glass
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.2" y2="16.2" />
    </>
  ),
  // three-dot die
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  // map pin
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  // folded map (route planning)
  map: (
    <>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </>
  ),
  // arrow out of a box (external link)
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>
  ),
  // pencil
  pencil: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  // close
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  // clock
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </>
  ),
  // group of people
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  // dollar sign
  dollar: (
    <>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  // compass
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8" />
    </>
  ),
  // globe
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z" />
    </>
  ),
  // beer mug
  beer: (
    <>
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3.5 8h14v9a4.5 4.5 0 0 1-4.5 4.5H8A4.5 4.5 0 0 1 3.5 17V8z" />
      <line x1="7" y1="3" x2="7" y2="5" />
      <line x1="11" y1="3" x2="11" y2="5" />
      <line x1="15" y1="3" x2="15" y2="5" />
    </>
  ),
  // trophy
  trophy: (
    <>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M7 5.5H4a2 2 0 0 0 2 3.5h1" />
      <path d="M17 5.5h3a2 2 0 0 1-2 3.5h-1" />
    </>
  ),
  // itemized receipt
  receipt: (
    <>
      <path d="M6 2.5h12V21.5l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4V2.5z" />
      <line x1="9" y1="7.5" x2="15" y2="7.5" />
      <line x1="9" y1="11.5" x2="15" y2="11.5" />
      <line x1="9" y1="15.5" x2="13" y2="15.5" />
    </>
  ),
  // message bubble
  message: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  // circular arrow (replace)
  refresh: (
    <>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </>
  ),
  // x inside a circle (no results / ban)
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </>
  ),
  // clipboard / ledger page
  ledger: (
    <>
      <path d="M9 3h6v3H9z" />
      <path d="M6 4h2M16 4h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </>
  ),
  // cocktail coupe
  martini: (
    <>
      <path d="M5 3h14l-7 9-7-9z" />
      <line x1="12" y1="12" x2="12" y2="19" />
      <line x1="8.5" y1="21" x2="15.5" y2="21" />
      <circle cx="12" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // right arrow
  arrowRight: (
    <>
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </>
  ),
  // left arrow
  arrowLeft: (
    <>
      <line x1="20" y1="12" x2="5" y2="12" />
      <polyline points="11 6 5 12 11 18" />
    </>
  ),
  // crossed swords (Bar Battle tiebreak)
  swords: (
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
      <path d="M6.5 3.5 3 7l4 4" />
      <path d="M8 8l4-4" />
      <path d="M21 17l-4-4" />
      <path d="M19 19l-2 2" />
    </>
  ),
  // chevron down (select controls)
  chevronDown: <polyline points="6 9 12 15 18 9" />,
  // check (selected state)
  check: <polyline points="20 6 9 17 4 12" />,
};

export type IconName = keyof typeof GLYPHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 14, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {GLYPHS[name]}
    </svg>
  );
}

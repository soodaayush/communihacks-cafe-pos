import type { ReactNode } from "react";

// One small icon set for the whole app, drawn like the menu pictures: a dark rounded outline
// (it takes the text colour) with soft pastel fills from the design tokens. 48 x 48 grid.
const SAGE = "#b8d4c0";
const SKY = "#b9d3e6";
const BLUSH = "#f0c8c4";
const BUTTER = "#f3e3ad";
const WHITE = "#fffdf9";
const TAN = "#ead9c6";
const BROWN = "#a07c5e";

const ICONS = {
  // --- Tabs ---
  cart: (
    <>
      <path d="M15 16h27l-5 15H19z" fill={BUTTER} />
      <path d="M4 8h7l6 23h20" />
      <circle cx="21" cy="39" r="3" fill={WHITE} />
      <circle cx="35" cy="39" r="3" fill={WHITE} />
    </>
  ),
  boxes: (
    <>
      <rect x="5" y="26" width="23" height="15" rx="2" fill={TAN} />
      <rect x="28" y="20" width="15" height="21" rx="2" fill={SKY} />
      <rect x="13" y="10" width="15" height="16" rx="2" fill={BUTTER} />
      <path d="M12 31h9M33 27h5M18 15h5" />
    </>
  ),
  coin: (
    <>
      <circle cx="24" cy="24" r="17" fill={BUTTER} />
      <path d="M29 19c-1-2.5-3.2-3.5-5.5-3.5-3 0-5 1.5-5 3.8 0 5 11 2.7 11 8 0 2.5-2.2 4.2-5.5 4.2-2.6 0-4.8-1.2-5.7-3.6" />
      <path d="M24 11v5M24 32v5" />
    </>
  ),
  shelf: (
    <>
      <rect x="6" y="6" width="36" height="36" rx="4" fill={WHITE} />
      <path d="M6 24h36" />
      <rect x="12" y="12" width="8" height="12" rx="2" fill={SKY} />
      <rect x="24" y="16" width="12" height="8" rx="2" fill={BLUSH} />
      <rect x="12" y="32" width="12" height="10" rx="2" fill={SAGE} />
      <rect x="28" y="30" width="8" height="12" rx="2" fill={BUTTER} />
    </>
  ),
  crate: (
    <>
      <path d="M5 20l7-10h10l-2 10zM43 20l-7-10H26l2 10z" fill={BUTTER} />
      <rect x="5" y="20" width="38" height="21" rx="2" fill={TAN} />
      <path d="M18 27h12" />
    </>
  ),
  chart: (
    <>
      <path d="M7 6v35h35" />
      <rect x="13" y="27" width="7" height="14" rx="1.5" fill={SKY} />
      <rect x="23" y="18" width="7" height="23" rx="1.5" fill={SAGE} />
      <rect x="33" y="10" width="7" height="31" rx="1.5" fill={BUTTER} />
    </>
  ),
  // --- Actions and signs ---
  pencil: (
    <>
      <path d="M9 39l2.5-9.5L31 10l7 7-19.5 19.5z" fill={BUTTER} />
      <path d="M27 14l7 7M11.5 29.5l7 7" />
    </>
  ),
  check: <path d="M10 25l10 10 19-21" strokeWidth={4.5} />,
  alert: (
    <>
      <path d="M24 10v17" strokeWidth={4.5} />
      <circle cx="24" cy="37" r="2.5" fill="currentColor" />
    </>
  ),
  cross: <path d="M13 13l22 22M35 13L13 35" strokeWidth={4.5} />,
  star: (
    <path
      d="M24 5l5.5 11.6 12.5 1.6-9.2 8.7 2.3 12.5L24 33.4l-11.1 6 2.3-12.5L6 18.2l12.5-1.6z"
      fill={BUTTER}
    />
  ),
  sun: (
    <>
      <circle cx="24" cy="24" r="8" fill={BUTTER} />
      <path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4 4M33.5 33.5l4 4M37.5 10.5l-4 4M14.5 33.5l-4 4" />
    </>
  ),
  calendar: (
    <>
      <rect x="6" y="9" width="36" height="32" rx="4" fill={WHITE} />
      <path d="M6 19h36V13a4 4 0 0 0-4-4H10a4 4 0 0 0-4 4z" fill={BLUSH} />
      <path d="M15 5v8M33 5v8" />
      <path d="M15 27h4M22 27h4M29 27h4M15 34h4M22 34h4" />
    </>
  ),
  hourglass: (
    <>
      <path d="M14 7h20c0 9-5 12-5 17s5 8 5 17H14c0-9 5-12 5-17S14 16 14 7z" fill={WHITE} />
      <path d="M17 11h14c-.6 4.5-3.5 7-7 7s-6.4-2.5-7-7z" fill={BUTTER} />
      <path d="M12 7h24M12 41h24" />
    </>
  ),
  trendUp: (
    <>
      <path d="M6 35l12-12 8 8 15-17" />
      <path d="M31 14h10v10" />
    </>
  ),
  trendDown: (
    <>
      <path d="M6 13l12 12 8-8 15 17" />
      <path d="M31 34h10V24" />
    </>
  ),
  trophy: (
    <>
      <path d="M15 7h18v13a9 9 0 0 1-18 0z" fill={BUTTER} />
      <path d="M15 11H8c0 6 3 9 8 9M33 11h7c0 6-3 9-8 9" />
      <path d="M24 29v6M16 41h16M18 35h12" />
    </>
  ),
  receipt: (
    <>
      <path d="M11 5h26v38l-4.3-3.2L28.3 43 24 39.8 19.7 43l-4.4-3.2L11 43z" fill={WHITE} />
      <path d="M17 14h14M17 21h14M17 28h8" />
    </>
  ),
  turtle: (
    <>
      <path d="M8 31a14 12 0 0 1 28 0z" fill={SAGE} />
      <path d="M22 19v12M14 25l4 6M30 25l-4 6" />
      <circle cx="40" cy="27" r="4.5" fill={SAGE} />
      <path d="M13 31v5M31 31v5" />
    </>
  ),
  // --- The back room ---
  coffeeBeans: (
    <>
      <path d="M13 12h22l4 29H9z" fill={TAN} />
      <path d="M13 12L10 6h28l-3 6" fill={BUTTER} />
      <ellipse cx="24" cy="28" rx="5.5" ry="8" transform="rotate(30 24 28)" fill={BROWN} />
      <path d="M21 33c3-3 5-8 6-10" stroke={WHITE} strokeWidth={2.5} />
    </>
  ),
  milk: (
    <>
      <path d="M13 15h22v26H13z" fill={WHITE} />
      <path d="M13 15l5-9h12l5 9z" fill={SKY} />
      <path d="M24 22c-3.5 4-5 6.5-5 9a5 5 0 0 0 10 0c0-2.5-1.5-5-5-9z" fill={SKY} />
    </>
  ),
  teaBox: (
    <>
      <rect x="8" y="17" width="32" height="24" rx="3" fill={SAGE} />
      <path d="M8 24h32" />
      <path d="M31 17v-7" />
      <rect x="27" y="4" width="9" height="7" rx="1.5" fill={WHITE} />
    </>
  ),
  cocoa: (
    <>
      <rect x="11" y="15" width="26" height="26" rx="3" fill="#d9b8a0" />
      <rect x="9" y="8" width="30" height="7" rx="2.5" fill={TAN} />
      <circle cx="24" cy="28" r="6" fill={WHITE} />
      <path d="M21 28h6" />
    </>
  ),
  sugar: (
    <>
      <path d="M8 16h14v26H8z" fill={SKY} transform="rotate(-8 15 29)" />
      <path d="M8 16h14" transform="rotate(-8 15 29)" strokeDasharray="2.5 3" />
      <path d="M26 8h14v32H26z" fill={WHITE} transform="rotate(7 33 24)" />
      <path d="M26 8h14" transform="rotate(7 33 24)" strokeDasharray="2.5 3" />
      <path d="M29 24h8M29 30h8" transform="rotate(7 33 24)" strokeWidth={2.5} />
    </>
  ),
  eggs: (
    <>
      <ellipse cx="13.5" cy="21" rx="5.5" ry="7.5" fill={WHITE} />
      <ellipse cx="24" cy="21" rx="5.5" ry="7.5" fill={WHITE} />
      <ellipse cx="34.5" cy="21" rx="5.5" ry="7.5" fill={WHITE} />
      <path d="M5 27h38l-3 14H8z" fill={TAN} />
    </>
  ),
  bread: (
    <>
      <path d="M7 27c0-9 5-16 12-16h10c7 0 12 7 12 16v14H7z" fill="#ecc99a" />
      <path d="M18 19l-2.5 7M25.5 19L23 26M33 19l-2.5 7" />
    </>
  ),
  cups: (
    <>
      <path d="M10 8h28l-3.5 33h-21z" fill={WHITE} />
      <path d="M11.3 19h25.4l-1.2 11H12.5z" fill={BLUSH} />
      <path d="M8 8h32" />
    </>
  ),
  lids: (
    <>
      <ellipse cx="24" cy="34" rx="17" ry="6.5" fill={BLUSH} />
      <ellipse cx="24" cy="26" rx="17" ry="6.5" fill={WHITE} />
      <ellipse cx="24" cy="18" rx="17" ry="6.5" fill={SKY} />
      <ellipse cx="24" cy="18" rx="6" ry="2" fill={WHITE} />
    </>
  ),
  teaLeaves: (
    <>
      <rect x="10" y="14" width="28" height="27" rx="3" fill={SAGE} />
      <rect x="8" y="8" width="32" height="7" rx="2.5" fill={WHITE} />
      <path d="M24 35c-6-3-7-10-1-15 6 4 6 11 1 15z" fill={WHITE} />
      <path d="M24 35v-9" />
    </>
  ),
  lemonade: (
    <>
      <path d="M19 5h10v7l4 6v21a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V18l4-6z" fill={WHITE} />
      <path d="M15.5 24h17v15a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4z" fill={BUTTER} />
      <circle cx="24" cy="31" r="5" fill={WHITE} />
      <path d="M24 26v10M19 31h10" strokeWidth={2} />
    </>
  ),
  oranges: (
    <>
      <circle cx="24" cy="27" r="15" fill="#f6c58f" />
      <path d="M24 12c0-3 1-5 3-6" />
      <path d="M26 11c3-4 9-4 11-1-3 3-8 3-11 1z" fill={SAGE} />
      <path d="M17 24v.1M22 31v.1M30 25v.1M28 33v.1" strokeWidth={3.5} />
    </>
  ),
  volume: (
    <>
      <path d="M6 19h8l10-8v26l-10-8H6z" fill={SKY} />
      <path d="M31 18a9 9 0 0 1 0 12M36 13a16 16 0 0 1 0 22" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M6 19h8l10-8v26l-10-8H6z" fill={SKY} />
      <path d="M32 19l10 10M42 19L32 29" />
    </>
  ),
  // --- Learn ---
  book: (
    <>
      <path d="M24 12C19 8.5 11 8 5 9.5v28c6-1.5 14-1 19 2.5z" fill={SKY} />
      <path d="M24 12c5-3.5 13-4 19-2.5v28c-6-1.5-14-1-19 2.5z" fill={WHITE} />
      <path d="M24 12v28" />
      <path d="M30 18h8M30 25h8" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-8" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

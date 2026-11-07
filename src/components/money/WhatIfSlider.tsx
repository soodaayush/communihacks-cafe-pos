"use client";

import { formatCents } from "@/lib/money";
import type { MenuItem } from "@/lib/types";

export interface WhatIfSliderProps {
  item: MenuItem;
  priceCents: number;
  minCents: number;
  maxCents: number;
  stepCents?: number;
  /** Gets an update from the latest price, so fast taps never use a stale value. Pass a useState setter. */
  onChange: (update: (priceCents: number) => number) => void;
}

const stepBtn =
  "flex size-16 shrink-0 items-center justify-center rounded-full bg-cream text-4xl font-bold ring-1 ring-ink/10 transition-transform disabled:opacity-40 motion-safe:active:scale-95";

// Big thumb for unsteady hands, plus − / + buttons for one exact step at a time.
const thumb =
  "[&::-webkit-slider-thumb]:size-14 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:shadow-md " +
  "[&::-moz-range-thumb]:size-14 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-ink";

export function WhatIfSlider({
  item,
  priceCents,
  minCents,
  maxCents,
  stepCents = 25,
  onChange,
}: WhatIfSliderProps) {
  const clamp = (cents: number) => Math.min(Math.max(cents, minCents), maxCents);
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange((p) => clamp(p - stepCents))}
        disabled={priceCents <= minCents}
        aria-label={`Lower the ${item.name} price`}
        className={stepBtn}
      >
        −
      </button>
      <input
        type="range"
        min={minCents}
        max={maxCents}
        step={stepCents}
        value={priceCents}
        onChange={(e) => {
          const cents = clamp(Number(e.target.value));
          onChange(() => cents);
        }}
        aria-label={`${item.name} price`}
        aria-valuetext={formatCents(priceCents)}
        className={`h-5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-ink/10 ${thumb}`}
      />
      <button
        type="button"
        onClick={() => onChange((p) => clamp(p + stepCents))}
        disabled={priceCents >= maxCents}
        aria-label={`Raise the ${item.name} price`}
        className={stepBtn}
      >
        +
      </button>
    </div>
  );
}

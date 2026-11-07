"use client";

import type { MenuItem } from "@/lib/types";

export interface WhatIfSliderProps {
  item: MenuItem;
  priceCents: number;
  minCents: number;
  maxCents: number;
  stepCents?: number;
  onChange: (priceCents: number) => void;
}

// TODO(dev3): large thumb (min-h-touch), shows price as coins while dragging.
export function WhatIfSlider(_props: WhatIfSliderProps) {
  return null;
}

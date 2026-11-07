import type { DrinkSize } from "./types";

// Drinks come in three sizes. Each size adds a fixed amount to the drink's menu (small) price.
// Shared by the register and the sales API so both always agree on the price.
export const SIZES: { size: DrinkSize; label: string; extraCents: number }[] = [
  { size: "S", label: "Small", extraCents: 0 },
  { size: "M", label: "Medium", extraCents: 50 },
  { size: "L", label: "Large", extraCents: 100 },
];

export const hasSizes = (category: string): boolean => category === "drink";

export const isSize = (v: unknown): v is DrinkSize => v === "S" || v === "M" || v === "L";

export const sizePriceCents = (baseCents: number, size?: DrinkSize): number =>
  baseCents + (SIZES.find((s) => s.size === size)?.extraCents ?? 0);

export const sizeLabel = (size?: DrinkSize): string | undefined =>
  SIZES.find((s) => s.size === size)?.label;

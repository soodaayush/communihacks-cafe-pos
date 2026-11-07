// "What if I change the price?" Pure maths, no UI. All money in cents.
import type { MenuItem } from "./types";

export const PRICE_STEP_CENTS = 25;

/**
 * A guess, not data: how strongly customers react to price. With 1.5, a price 10% higher
 * sells about 14% fewer. Above 1, there is a "best" price (3 × cost) and going past it
 * loses money. Set to 0 to assume the same number sold at any price.
 */
export const PRICE_SENSITIVITY = 1.5;

/** A lower price can bring more people, but never more than this many times today's. */
export const MAX_GROWTH = 2;

export interface Outcome {
  priceCents: number;
  keepEachCents: number; // price - cost, can be negative
  soldPerDay: number; // whole people
  keepPerDayCents: number; // keepEachCents × soldPerDay
}

export type Verdict = "more" | "less" | "same";

export function estimateSold(soldNow: number, priceNow: number, priceNew: number): number {
  if (priceNow <= 0 || priceNew <= 0) return Math.round(soldNow);
  const guess = soldNow * (priceNow / priceNew) ** PRICE_SENSITIVITY;
  return Math.round(Math.min(guess, soldNow * MAX_GROWTH));
}

export function outcome(item: MenuItem, soldNow: number, priceCents: number): Outcome {
  const soldPerDay = estimateSold(soldNow, item.priceCents, priceCents);
  const keepEachCents = priceCents - item.costCents;
  return { priceCents, keepEachCents, soldPerDay, keepPerDayCents: keepEachCents * soldPerDay };
}

/** Slider range: from one step up to double today's price (or 3 × cost, if higher). */
export function priceRange(item: MenuItem): { minCents: number; maxCents: number } {
  const top = Math.max(item.priceCents * 2, item.costCents * 3, 100);
  return {
    minCents: PRICE_STEP_CENTS,
    maxCents: Math.ceil(top / PRICE_STEP_CENTS) * PRICE_STEP_CENTS,
  };
}

/** "same" when the daily difference is under 50¢ or under 2%. */
export function compare(now: Outcome, next: Outcome): Verdict {
  const diff = next.keepPerDayCents - now.keepPerDayCents;
  if (Math.abs(diff) < 50 || Math.abs(diff) <= Math.abs(now.keepPerDayCents) * 0.02) return "same";
  return diff > 0 ? "more" : "less";
}

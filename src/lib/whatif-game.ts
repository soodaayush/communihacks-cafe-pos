// "Guess first" rounds for the What-if screen. Pure logic, no UI.
import type { MenuItem } from "./types";
import { PRICE_STEP_CENTS, compare, outcome, priceRange, type Outcome } from "./whatif";

export interface Scenario {
  item: MenuItem;
  now: Outcome;
  next: Outcome;
  /** true = price goes up, false = price goes down */
  up: boolean;
  /** Which jar ends up with more money. Never "same": every round has a clear answer. */
  winner: "now" | "next";
}

/**
 * A new price for a real item, 50¢ to $1 away from today's. Kept above what the item costs to
 * make (losing money is a different lesson), and only where the answer is clear.
 * `avoid` skips the last item so rounds feel different.
 */
export function makeScenario(
  menu: MenuItem[],
  soldPerDay: Record<string, number>,
  random: () => number = Math.random,
  avoid?: string,
): Scenario | null {
  const pool = menu.filter((m) => (soldPerDay[m.id] ?? 0) >= 3 && m.priceCents > m.costCents);
  const candidates = pool.length > 1 ? pool.filter((m) => m.id !== avoid) : pool;
  for (let tries = 0; tries < 60 && candidates.length > 0; tries++) {
    const item = candidates[Math.floor(random() * candidates.length)];
    const up = random() < 0.5;
    const steps = 2 + Math.floor(random() * 3); // 2 to 4 steps of 25¢
    const price = item.priceCents + (up ? 1 : -1) * steps * PRICE_STEP_CENTS;
    const { maxCents } = priceRange(item);
    if (price <= item.costCents || price > maxCents) continue;

    const sold = soldPerDay[item.id];
    const now = outcome(item, sold, item.priceCents);
    const next = outcome(item, sold, price);
    const verdict = compare(now, next);
    if (verdict === "same" || now.soldPerDay === next.soldPerDay) continue;
    return { item, now, next, up, winner: verdict === "more" ? "next" : "now" };
  }
  return null;
}

/** One short reason per question, shown after the answer (right or wrong). */
export function reasons(s: Scenario) {
  const name = s.item.name.toLowerCase();
  const nextWins = s.winner === "next";
  return {
    yours: `One part buys the ${name}. The rest is yours.`,
    each: s.up
      ? "A higher price gives you more from each one."
      : "A lower price gives you less from each one.",
    people: s.up
      ? "When the price goes up, some people stop buying."
      : "When the price goes down, more people buy.",
    jar: s.up
      ? nextWins
        ? "Fewer people, but each one gave you more."
        : "You got more from each, but lost too many people."
      : nextWins
        ? "Less from each, but many more people came."
        : "More people came, but each gave you too little.",
  };
}

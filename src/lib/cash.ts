// Canadian cash. Pennies are gone, so cash totals round to the nearest 5 cents.
export const DENOMS = [5000, 2000, 1000, 500, 200, 100, 25, 10, 5] as const;
export type Denom = (typeof DENOMS)[number];

export const roundCash = (cents: number): number => Math.round(cents / 5) * 5;

/** Fewest bills and coins that make `cents`, biggest first. Canadian set is canonical, so greedy is optimal. */
export function breakdown(cents: number): Denom[] {
  const out: Denom[] = [];
  let left = roundCash(cents);
  for (const d of DENOMS) {
    while (left >= d) {
      out.push(d);
      left -= d;
    }
  }
  return out;
}

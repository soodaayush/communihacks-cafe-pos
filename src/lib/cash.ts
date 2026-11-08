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

const PIECE_NAMES: Record<number, [string, string]> = {
  5000: ["a 50-dollar bill", "50-dollar bills"],
  2000: ["a 20-dollar bill", "20-dollar bills"],
  1000: ["a 10-dollar bill", "10-dollar bills"],
  500: ["a 5-dollar bill", "5-dollar bills"],
  200: ["a 2-dollar coin", "2-dollar coins"],
  100: ["a 1-dollar coin", "1-dollar coins"],
  25: ["a quarter", "quarters"],
  10: ["a dime", "dimes"],
  5: ["a nickel", "nickels"],
};

/** Change in words, largest first: [500, 100, 25, 25] -> "a 5-dollar bill, a 1-dollar coin and 2 quarters". */
export function sayPieces(pieces: number[]): string {
  const counts = new Map<number, number>();
  for (const p of [...pieces].sort((a, b) => b - a)) counts.set(p, (counts.get(p) ?? 0) + 1);
  const parts = [...counts].map(([p, n]) => {
    const [one, many] = PIECE_NAMES[p] ?? [`a ${p}-cent piece`, `${p}-cent pieces`];
    return n === 1 ? one : `${n} ${many}`;
  });
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
    : (parts[0] ?? "");
}

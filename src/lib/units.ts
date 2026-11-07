// How amounts are written. Safe on client and server.
//   Measured drink ingredients: "620 g", "1.2 kg", "350 ml", "3.4 L"
//   Everything else is counted in plain words: "1 bag", "3 bags", "24 oranges"

/** Plural word -> singular for exactly one: "bags" -> "bag". */
export const unitOf = (n: number, unit: string) =>
  Math.round(n) === 1 ? unit.replace(/s$/, "") : unit;

/** Grams and millilitres are weighed / poured, not counted. */
export const isMeasured = (unit: string) => unit === "g" || unit === "ml";

const trim = (n: number) => (Math.round(n * 10) / 10).toString();

export function formatAmount(n: number, unit: string): string {
  if (unit === "g") return n >= 1000 ? `${trim(n / 1000)} kg` : `${Math.round(n)} g`;
  if (unit === "ml") return n >= 1000 ? `${trim(n / 1000)} L` : `${Math.round(n)} ml`;
  return `${Math.round(n)} ${unitOf(n, unit)}`;
}

/** What a pack is: "1 bag = 1 kg", or "" when you buy single units. */
export function packNote(item: { packName: string; packSize: number; unit: string }): string {
  if (item.packSize === 1 && item.packName === item.unit) return "";
  return `1 ${unitOf(1, item.packName)} = ${formatAmount(item.packSize, item.unit)}`;
}

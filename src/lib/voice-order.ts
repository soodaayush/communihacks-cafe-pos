import { hasSizes, sizeLabel } from "./sizes";
import type { DrinkSize, MenuItem } from "./types";

// Turns what the cashier said ("two large coffees and a muffin") into order lines. Pure and
// instant: no AI call, so it works the same every time and can be tested. The words come from
// the menu itself, so a new menu item can be ordered by its name without any code change.

export interface ParsedLine {
  menuItemId: string;
  name: string;
  size?: DrinkSize;
  qty: number;
}
export interface ParsedOrder {
  lines: ParsedLine[];
  /** Words we could not use, so the screen can say "I didn't understand: …". */
  unknown: string[];
}

const MAX_QTY = 20;

const NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  couple: 2,
  another: 1,
};
const SIZES: Record<string, DrinkSize> = {
  small: "S",
  little: "S",
  medium: "M",
  large: "L",
  big: "L",
};
// Words that carry no order information (and are not worth reporting).
const FILLER = new Set([
  "and",
  "then",
  "plus",
  "also",
  "with",
  "please",
  "i",
  "id",
  "ill",
  "we",
  "want",
  "would",
  "like",
  "can",
  "could",
  "may",
  "get",
  "have",
  "give",
  "me",
  "us",
  "of",
  "some",
  "the",
  "for",
  "just",
  "um",
  "uh",
  "ok",
  "okay",
  "thanks",
  "thank",
  "you",
  "to",
  "take",
  "order",
  "need",
  "of",
  "in",
  "cup",
  "glass",
  "slice",
  "piece",
  "more",
  "too",
]);

// Other ways people say a menu item. Anything not listed still works by its menu name.
const ALIASES: Record<string, string[]> = {
  "hot chocolate": ["cocoa", "hot cocoa", "chocolate"],
  juice: ["orange juice"],
};

/** "coffee" -> "coffees", "sandwich" -> "sandwiches", "cookie" -> "cookies". */
export function plural(word: string): string {
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}
/** Plural of the last word only: "hot chocolate" -> "hot chocolates". */
function pluralPhrase(phrase: string): string {
  const parts = phrase.split(" ");
  parts[parts.length - 1] = plural(parts[parts.length - 1]);
  return parts.join(" ");
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

interface Alias {
  words: string[];
  item: MenuItem;
}

function buildAliases(menu: MenuItem[]): Alias[] {
  const out: Alias[] = [];
  for (const item of menu) {
    const base = item.name.toLowerCase();
    const phrases = new Set<string>();
    for (const p of [base, ...(ALIASES[base] ?? [])]) {
      phrases.add(p);
      phrases.add(pluralPhrase(p));
    }
    for (const p of phrases) out.push({ words: p.split(" "), item });
  }
  // Longest phrases first, so "hot chocolate" wins over "chocolate".
  return out.sort((a, b) => b.words.length - a.words.length);
}

export function parseOrder(text: string, menu: MenuItem[]): ParsedOrder {
  const words = normalise(text);
  const aliases = buildAliases(menu);
  const found = new Map<string, ParsedLine>();
  const unknown: string[] = [];
  let groups: { qty?: number; size?: DrinkSize }[] = [];
  let lastItem: MenuItem | null = null;

  const matchAt = (i: number): { item: MenuItem; length: number } | null => {
    for (const a of aliases) {
      if (a.words.every((w, k) => words[i + k] === w))
        return { item: a.item, length: a.words.length };
    }
    // A near miss from the transcript ("cofee", "muffen") still counts, for longer words.
    const w = words[i];
    if (w && w.length >= 5) {
      for (const a of aliases) {
        if (a.words.length === 1 && a.words[0][0] === w[0] && distance(a.words[0], w) <= 1) {
          return { item: a.item, length: 1 };
        }
      }
    }
    return null;
  };

  const emit = (item: MenuItem, size: DrinkSize | undefined, qty: number) => {
    const useSize = hasSizes(item.category) ? (size ?? "S") : undefined;
    const key = `${item.id}|${useSize ?? ""}`;
    const line = found.get(key);
    const total = Math.min(MAX_QTY, (line?.qty ?? 0) + qty);
    found.set(key, {
      menuItemId: item.id,
      name: item.name,
      ...(useSize && { size: useSize }),
      qty: total,
    });
  };
  /** `fallbackSize` is a size said right after the item ("a coffee large"). */
  const emitGroups = (item: MenuItem, fallbackSize?: DrinkSize) => {
    if (groups.length === 0) groups = [{}];
    for (const g of groups) emit(item, g.size ?? fallbackSize, g.qty ?? 1);
    groups = [];
    lastItem = item;
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const match = matchAt(i);
    if (match) {
      const after = i + match.length;
      // "a coffee large": a size right after the drink belongs to it (if none was said before).
      const trailing = SIZES[words[after]];
      const useTrailing =
        trailing !== undefined && hasSizes(match.item.category) && !groups.some((g) => g.size);
      emitGroups(match.item, useTrailing ? trailing : undefined);
      i = after - 1 + (useTrailing ? 1 : 0);
      continue;
    }
    const number = /^\d+$/.test(w) ? Number(w) : NUMBERS[w];
    if (number !== undefined) {
      const current = groups[groups.length - 1];
      if (!current || current.qty !== undefined)
        groups.push({ qty: Math.min(MAX_QTY, Math.max(1, number)) });
      else current.qty = Math.min(MAX_QTY, Math.max(1, number));
      continue;
    }
    if (SIZES[w]) {
      const current = groups[groups.length - 1];
      if (!current || current.size !== undefined) groups.push({ size: SIZES[w] });
      else current.size = SIZES[w];
      continue;
    }
    if (!FILLER.has(w)) unknown.push(w);
  }
  // "two small coffees and one large": the left-over "one large" is more of the same drink.
  if (groups.length > 0 && lastItem) emitGroups(lastItem);

  return { lines: [...found.values()], unknown };
}

const SMALL_NUMBERS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** One line as a person would say it: "two large coffees", "one muffin". */
export function describeLine(line: Pick<ParsedLine, "name" | "size" | "qty">): string {
  const count = SMALL_NUMBERS[line.qty] ?? String(line.qty);
  const size = line.size ? `${sizeLabel(line.size)!.toLowerCase()} ` : "";
  const name = line.name.toLowerCase();
  return `${count} ${size}${line.qty === 1 ? name : pluralPhrase(name)}`;
}

/** "two large coffees and one muffin". */
export function describeOrder(lines: Pick<ParsedLine, "name" | "size" | "qty">[]): string {
  const parts = lines.map(describeLine);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

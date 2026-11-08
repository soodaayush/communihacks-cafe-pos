// Shared contract. Money is always whole cents (integers). Change only with team agreement.

export type PaymentMethod = "cash" | "debit";
export type ExpenseType = "rent" | "salary" | "inventory" | "other";
export type SummaryRange = "day" | "week" | "month";

export interface MenuItem {
  id: string;
  name: string;
  imagePublicId: string;
  category: string;
  priceCents: number;
  costCents: number;
  stock: number;
  reorderLevel: number;
}

// Back-room stock (ingredients, packaging, supplies): what the cafe buys, not what it sells.
export type InventoryCategory = "ingredient" | "packaging" | "supply";
export type StockReason = "purchase" | "use" | "waste" | "adjustment";

export interface InventoryItem {
  id: string;
  name: string;
  imagePublicId: string;
  category: InventoryCategory;
  unit: string; // what `stock` counts: "g", "ml", "oranges", "bags", "cartons", "units"
  stock: number; // current amount, in `unit`
  reorderLevel: number; // in `unit`
  unitCostCents: number; // price of one pack
  packName: string; // what you buy: "bags", "bottles", "crates" (same as `unit` for single units)
  packSize: number; // `unit`s in one pack: 1 bag of beans = 1000 g
  fullQty: number | null; // a full container, for "% full"; null = just a count
  usedLast7Days: number; // taken out for drinks in the last 7 days, in `unit`
  daysLeft: number | null; // how long it lasts at the last 7 days' pace; null = not used lately
}

export interface StockMovement {
  inventoryItemId: string;
  changeQty: number; // positive adds stock, negative removes it
  reason: StockReason;
}

export type DrinkSize = "S" | "M" | "L";

export interface SaleItem {
  menuItemId: string;
  /** Drinks only. Missing on a drink means small. Price rules live in src/lib/sizes.ts. */
  size?: DrinkSize;
  qty: number;
  unitPriceCents: number;
  unitCostCents: number;
}

export interface Sale {
  id: string;
  createdAt: string; // ISO 8601
  paymentMethod: PaymentMethod;
  totalCents: number;
  items: SaleItem[];
}

export interface Expense {
  id: string;
  type: ExpenseType;
  amountCents: number;
  date: string; // YYYY-MM-DD
}

export interface Purchase {
  id: string;
  menuItemId: string;
  qty: number;
  totalCostCents: number;
  paymentMethod: PaymentMethod;
  createdAt: string; // ISO 8601
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  moneyInCents: number;
  moneyOutCents: number;
  leftCents: number;
  profitCents: number;
}

// API payloads not covered by the contract above.
// TODO(dev1): confirm these shapes with dev2/dev3.
export interface TrendPoint {
  date: string;
  menuItemId: string;
  qtySold: number;
}

export interface RestockSuggestion {
  menuItemId: string;
  stock: number;
  reorderLevel: number;
  suggestedQty: number;
  daysLeft?: number; // days the current stock lasts at the usual pace for each weekday (capped at 14)
}

// Sales grouped by hour of the day (UTC), summed over the requested days.
export interface BusyHour {
  hour: number; // 0-23
  saleCount: number;
  moneyInCents: number;
}

export interface ExplainRequest {
  topic: "money" | "trends";
  numbers: Record<string, number>;
}

export interface ExplainResponse {
  text: string;
}

export interface SpeakRequest {
  text: string;
}

// POST /api/speak answers with audio (ElevenLabs) when it is set up, or with this JSON, which means
// "read this text with the browser's voice".
export interface SpeakResponse {
  engine: "browser";
  text: string;
}

// Insights: numbers are computed in code (src/lib/metrics.ts); Gemini only picks and phrases.
export type InsightTone = "good" | "watch" | "neutral";

export type MetricKey =
  | "moneyLeft"
  | "moneyLeftChange"
  | "bestSeller"
  | "bestEarner"
  | "slowSeller"
  | "lowStock"
  | "runningOut"
  | "biggestCost";

export interface Metric {
  key: MetricKey;
  tone: InsightTone;
  /** Plain-English fact with the exact numbers. Source of truth for any wording. */
  fact: string;
  valueCents?: number;
  count?: number;
  menuItemId?: string;
}

export interface Insight {
  metricKey: MetricKey;
  tone: InsightTone;
  icon: string; // one emoji
  headline: string; // a few words
  sentence: string; // one short sentence, speakable
  valueCents?: number;
  count?: number;
  menuItemId?: string;
}

export interface InsightsResponse {
  range: SummaryRange;
  source: "gemini" | "local";
  insights: Insight[];
  metrics: Metric[];
}

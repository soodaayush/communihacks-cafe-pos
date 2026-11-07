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
  unit: string; // "kg", "L", "pcs" ...
  stock: number; // in `unit`
  reorderLevel: number;
  unitCostCents: number;
}

export interface StockMovement {
  inventoryItemId: string;
  changeQty: number; // positive adds stock, negative removes it
  reason: StockReason;
}

export interface SaleItem {
  menuItemId: string;
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

// End-of-day level of one back-room item.
export interface StockPoint {
  date: string; // YYYY-MM-DD
  stock: number;
}

export interface ExplainRequest {
  topic: "money" | "whatif" | "trends";
  numbers: Record<string, number>;
}

export interface ExplainResponse {
  text: string;
}

export interface SpeakRequest {
  text: string;
}

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

export interface ImageSignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

// Hard-coded fake data so the front end can work before the database is wired.
// TODO(dev1): replace each usage in src/app/api with a real query via src/lib/db.ts.
import type {
  BusyHour,
  DaySummary,
  InventoryItem,
  Expense,
  MenuItem,
  Purchase,
  RestockSuggestion,
  Sale,
  StockPoint,
  SummaryRange,
  TrendPoint,
} from "./types";

export const mockMenu: MenuItem[] = [
  {
    id: "m1",
    name: "Coffee",
    imagePublicId: "kwhab/menu/coffee",
    category: "drink",
    priceCents: 200,
    costCents: 60,
    stock: 40,
    reorderLevel: 10,
  },
  {
    id: "m2",
    name: "Tea",
    imagePublicId: "kwhab/menu/tea",
    category: "drink",
    priceCents: 150,
    costCents: 30,
    stock: 8,
    reorderLevel: 10,
  },
  {
    id: "m3",
    name: "Muffin",
    imagePublicId: "kwhab/menu/muffin",
    category: "food",
    priceCents: 250,
    costCents: 90,
    stock: 12,
    reorderLevel: 6,
  },
  {
    id: "m4",
    name: "Cookie",
    imagePublicId: "kwhab/menu/cookie",
    category: "food",
    priceCents: 100,
    costCents: 25,
    stock: 3,
    reorderLevel: 8,
  },
];

export const mockSupplies: InventoryItem[] = [
  {
    id: "i1",
    name: "Coffee beans",
    imagePublicId: "kwhab/inventory/coffee-beans",
    category: "ingredient",
    unit: "kg",
    stock: 4.5,
    reorderLevel: 3,
    unitCostCents: 1800,
  },
  {
    id: "i2",
    name: "Paper cups",
    imagePublicId: "kwhab/inventory/paper-cups",
    category: "packaging",
    unit: "pcs",
    stock: 150,
    reorderLevel: 100,
    unitCostCents: 8,
  },
];

export const mockSale: Sale = {
  id: "s1",
  createdAt: "2026-11-07T15:00:00.000Z",
  paymentMethod: "cash",
  totalCents: 450,
  items: [
    { menuItemId: "m1", qty: 1, unitPriceCents: 200, unitCostCents: 60 },
    { menuItemId: "m3", qty: 1, unitPriceCents: 250, unitCostCents: 90 },
  ],
};

export const mockPurchase: Purchase = {
  id: "p1",
  menuItemId: "m4",
  qty: 24,
  totalCostCents: 600,
  paymentMethod: "debit",
  createdAt: "2026-11-07T14:00:00.000Z",
};

export const mockExpenses: Expense[] = [
  { id: "e1", type: "rent", amountCents: 50000, date: "2026-11-01" },
  { id: "e2", type: "salary", amountCents: 30000, date: "2026-11-01" },
  { id: "e3", type: "inventory", amountCents: 600, date: "2026-11-07" },
];

export const mockTrends: TrendPoint[] = [
  { date: "2026-11-06", menuItemId: "m1", qtySold: 22 },
  { date: "2026-11-07", menuItemId: "m1", qtySold: 25 },
  { date: "2026-11-06", menuItemId: "m4", qtySold: 9 },
  { date: "2026-11-07", menuItemId: "m4", qtySold: 12 },
];

export const mockRestock: RestockSuggestion[] = [
  { menuItemId: "m2", stock: 8, reorderLevel: 10, suggestedQty: 20, daysLeft: 2 },
  { menuItemId: "m4", stock: 3, reorderLevel: 8, suggestedQty: 24, daysLeft: 1 },
];

export const mockBusyHours: BusyHour[] = [
  { hour: 9, saleCount: 40, moneyInCents: 16000 },
  { hour: 12, saleCount: 65, moneyInCents: 28000 },
  { hour: 15, saleCount: 30, moneyInCents: 12000 },
];

export const mockStockHistory: StockPoint[] = [
  { date: "2026-11-06", stock: 5.2 },
  { date: "2026-11-07", stock: 4.5 },
];

const DAYS: Record<SummaryRange, number> = { day: 1, week: 7, month: 30 };

export function mockSummary(range: SummaryRange): DaySummary[] {
  return Array.from({ length: DAYS[range] }, (_, i) => ({
    date: new Date(Date.UTC(2026, 10, 7 - i)).toISOString().slice(0, 10),
    moneyInCents: 12000,
    moneyOutCents: 7000,
    leftCents: 5000,
    profitCents: 5000,
  }));
}

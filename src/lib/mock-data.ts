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
  SummaryRange,
  TrendPoint,
} from "./types";

// One shelf shared by every route (in dev each route can load its own copy of this module),
// so a mock sale shows up on the Stock screen. Resets when the server restarts.
const shared = globalThis as { __kwhabMockMenu?: MenuItem[] };
export const mockMenu: MenuItem[] = (shared.__kwhabMockMenu ??= [
  {
    id: "m1",
    name: "Coffee",
    imagePublicId: "kwhab/menu/coffee",
    category: "drink",
    priceCents: 200,
    costCents: 60,
    stock: 120,
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
    id: "m5",
    name: "Hot Chocolate",
    imagePublicId: "kwhab/menu/hot-chocolate",
    category: "drink",
    priceCents: 275,
    costCents: 80,
    stock: 30,
    reorderLevel: 10,
  },
  {
    id: "m6",
    name: "Lemonade",
    imagePublicId: "kwhab/menu/lemonade",
    category: "drink",
    priceCents: 225,
    costCents: 50,
    stock: 40,
    reorderLevel: 8,
  },
  {
    id: "m3",
    name: "Muffin",
    imagePublicId: "kwhab/menu/muffin",
    category: "food",
    priceCents: 250,
    costCents: 90,
    stock: 50,
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
  {
    id: "m7",
    name: "Bagel",
    imagePublicId: "kwhab/menu/bagel",
    category: "food",
    priceCents: 300,
    costCents: 100,
    stock: 30,
    reorderLevel: 5,
  },
  {
    id: "m8",
    name: "Sandwich",
    imagePublicId: "kwhab/menu/sandwich",
    category: "food",
    priceCents: 650,
    costCents: 275,
    stock: 6,
    reorderLevel: 4,
  },
]);

// Same back-room items as scripts/seed.ts, so the app without a database offers the same choices
// (e.g. milk in "We bought something"). Eggs are out of stock on purpose, like the seed.
export const mockSupplies: InventoryItem[] = [
  {
    id: "i1",
    name: "Coffee beans",
    imagePublicId: "kwhab/inventory/coffee-beans",
    category: "ingredient",
    unit: "g",
    stock: 1800,
    reorderLevel: 700,
    unitCostCents: 1800,
    packName: "bags",
    packSize: 1000,
    fullQty: 4000,
    usedLast7Days: 2400,
  },
  {
    id: "i3",
    name: "Tea leaves",
    imagePublicId: "kwhab/inventory/tea-leaves",
    category: "ingredient",
    unit: "g",
    stock: 400,
    reorderLevel: 100,
    unitCostCents: 700,
    packName: "tins",
    packSize: 250,
    fullQty: 750,
    usedLast7Days: 210,
  },
  {
    id: "i4",
    name: "Cocoa powder",
    imagePublicId: "kwhab/inventory/cocoa-powder",
    category: "ingredient",
    unit: "g",
    stock: 1500,
    reorderLevel: 400,
    unitCostCents: 900,
    packName: "bags",
    packSize: 1000,
    fullQty: 3000,
    usedLast7Days: 900,
  },
  {
    id: "i5",
    name: "Milk",
    imagePublicId: "kwhab/inventory/milk",
    category: "ingredient",
    unit: "ml",
    stock: 9000,
    reorderLevel: 4000,
    unitCostCents: 450,
    packName: "cartons",
    packSize: 2000,
    fullQty: 24000,
    usedLast7Days: 14000,
  },
  {
    id: "i6",
    name: "Lemonade",
    imagePublicId: "kwhab/inventory/lemonade",
    category: "ingredient",
    unit: "ml",
    stock: 12000,
    reorderLevel: 4000,
    unitCostCents: 900,
    packName: "bottles",
    packSize: 5000,
    fullQty: 28000,
    usedLast7Days: 9000,
  },
  {
    id: "i7",
    name: "Oranges",
    imagePublicId: "kwhab/inventory/oranges",
    category: "ingredient",
    unit: "oranges",
    stock: 90,
    reorderLevel: 60,
    unitCostCents: 2000,
    packName: "crates",
    packSize: 40,
    fullQty: 200,
    usedLast7Days: 70,
  },
  {
    id: "i8",
    name: "Sugar",
    imagePublicId: "kwhab/inventory/sugar",
    category: "ingredient",
    unit: "pouches",
    stock: 600,
    reorderLevel: 150,
    unitCostCents: 600,
    packName: "boxes",
    packSize: 500,
    fullQty: 1000,
    usedLast7Days: 420,
  },
  {
    id: "i2",
    name: "Paper cups",
    imagePublicId: "kwhab/inventory/paper-cups",
    category: "packaging",
    unit: "units",
    stock: 150,
    reorderLevel: 60,
    unitCostCents: 400,
    packName: "sleeves",
    packSize: 50,
    fullQty: null,
    usedLast7Days: 260,
  },
  {
    id: "i9",
    name: "Cup lids",
    imagePublicId: "kwhab/inventory/cup-lids",
    category: "packaging",
    unit: "units",
    stock: 140,
    reorderLevel: 60,
    unitCostCents: 200,
    packName: "sleeves",
    packSize: 50,
    fullQty: null,
    usedLast7Days: 260,
  },
  {
    id: "i10",
    name: "Eggs",
    imagePublicId: "kwhab/inventory/eggs",
    category: "ingredient",
    unit: "cartons",
    stock: 0,
    reorderLevel: 4,
    unitCostCents: 450,
    packName: "cartons",
    packSize: 1,
    fullQty: null,
    usedLast7Days: 8,
  },
  {
    id: "i11",
    name: "Bread",
    imagePublicId: "kwhab/inventory/bread",
    category: "ingredient",
    unit: "units",
    stock: 10,
    reorderLevel: 6,
    unitCostCents: 300,
    packName: "units",
    packSize: 1,
    fullQty: null,
    usedLast7Days: 21,
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

// 70 days of bills ending 2026-11-07 (back to Sept 1): rent and wages on the 1st, buying stock every 7 days,
// and two small "other" bills a month. Enough history for the budget's carried-over balances.
export const mockExpenses: Expense[] = Array.from({ length: 70 }, (_, daysAgo) => {
  const d = new Date(Date.UTC(2026, 10, 7 - daysAgo));
  const date = d.toISOString().slice(0, 10);
  const day = d.getUTCDate();
  const bills: Expense[] = [];
  if (day === 1)
    bills.push(
      { id: `rent-${date}`, type: "rent", amountCents: 50000, date },
      { id: `salary-${date}`, type: "salary", amountCents: 30000, date },
    );
  if (daysAgo % 7 === 0)
    bills.push({
      id: `stock-${date}`,
      type: "inventory",
      amountCents: 6000 + (daysAgo % 3) * 1500,
      date,
    });
  if (day === 10 || day === 22)
    bills.push({ id: `other-${date}`, type: "other", amountCents: day === 10 ? 1800 : 3500, date });
  return bills;
}).flat();

export const mockBusyHours: BusyHour[] = [
  { hour: 9, saleCount: 40, moneyInCents: 16000 },
  { hour: 12, saleCount: 65, moneyInCents: 28000 },
  { hour: 15, saleCount: 30, moneyInCents: 12000 },
];

export const RANGE_DAYS: Record<SummaryRange, number> = { day: 1, week: 7, month: 30 };

const dayString = (daysAgo: number) =>
  new Date(Date.UTC(2026, 10, 7 - daysAgo)).toISOString().slice(0, 10);

/** Newest first. offsetDays shifts the window back (use RANGE_DAYS[range] for the previous period). */
export function mockSummary(
  range: SummaryRange,
  offsetDays = 0,
  days = RANGE_DAYS[range],
): DaySummary[] {
  return Array.from({ length: days }, (_, i) => {
    const daysAgo = i + offsetDays;
    const moneyInCents = 11000 + ((daysAgo * 37) % 9) * 300 - Math.min(daysAgo, 30) * 20;
    const moneyOutCents = 7000 + ((daysAgo * 13) % 5) * 200;
    const leftCents = moneyInCents - moneyOutCents;
    return {
      date: dayString(daysAgo),
      moneyInCents,
      moneyOutCents,
      leftCents,
      profitCents: leftCents,
    };
  });
}

// Typical sales per day. Items not listed sell DEFAULT_DAILY_QTY a day.
const BASE_DAILY_QTY: Record<string, number> = {
  m1: 24,
  m2: 6,
  m3: 10,
  m4: 9,
  m5: 7,
  m6: 5,
  m7: 6,
  m8: 4,
};
const DEFAULT_DAILY_QTY = 5;

/** Qty sold per item per day, newest first. */
export function mockItemSales(range: SummaryRange, offsetDays = 0): TrendPoint[] {
  return Array.from({ length: RANGE_DAYS[range] }, (_, i) => i + offsetDays).flatMap((daysAgo) =>
    mockMenu.map((item, idx) => ({
      date: dayString(daysAgo),
      menuItemId: item.id,
      qtySold: Math.max(
        0,
        (BASE_DAILY_QTY[item.id] ?? DEFAULT_DAILY_QTY) + ((daysAgo * 7 + idx * 3) % 5) - 2,
      ),
    })),
  );
}

/** Like GET /api/trends: the last 30 days, oldest first. */
export const mockTrends: TrendPoint[] = [...mockItemSales("month")].reverse();

/** Same rule as the real /api/restock-suggestions query, with a flat daily pace from the last week:
 *  suggest when at the reorder level or running out within 3 days; buy a week's sales
 *  (at least double the reorder level) minus what is on the shelf. Uses the current mock stock. */
export function mockRestock(): RestockSuggestion[] {
  return mockMenu.flatMap((m) => {
    const sold = mockItemSales("week")
      .filter((t) => t.menuItemId === m.id)
      .reduce((sum, t) => sum + t.qtySold, 0);
    const daysLeft = sold > 0 ? Math.min(14, Math.floor(m.stock / (sold / 7))) : 14;
    if (m.stock > m.reorderLevel && daysLeft > 3) return [];
    return [
      {
        menuItemId: m.id,
        stock: m.stock,
        reorderLevel: m.reorderLevel,
        suggestedQty: Math.max(sold, m.reorderLevel * 2) - m.stock,
        daysLeft,
      },
    ];
  });
}

/** Mock mode only: a sale takes its items off the shelf (never below zero), like the real route. */
export function applyMockSale(items: unknown): void {
  if (!Array.isArray(items)) return;
  for (const line of items as { menuItemId?: unknown; qty?: unknown }[]) {
    const item = mockMenu.find((m) => m.id === line?.menuItemId);
    const qty = line?.qty;
    if (item && typeof qty === "number" && Number.isInteger(qty) && qty > 0)
      item.stock = Math.max(0, item.stock - qty);
  }
}

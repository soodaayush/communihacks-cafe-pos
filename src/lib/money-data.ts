// Server-only. Money and sales history from Tiger Data, shared by the Money screen, the Gemini
// insights and the /api/summary + /api/busy-hours routes, so they always agree.
// Each get* falls back to mock data when DATABASE_URL is not set.
import { CAFE_TZ, cafeDate, dayWindow } from "./cafe-time";
import { hasDb, query } from "./db";
import {
  mockBusyHours,
  mockExpenses,
  mockItemSales,
  mockMenu,
  mockSummary,
  RANGE_DAYS,
} from "./mock-data";
import type { BusyHour, DaySummary, Expense, SummaryRange, TrendPoint } from "./types";

// Every "day" here is a café day (Toronto time, see cafe-time.ts), never a UTC day.
const TZ = `'${CAFE_TZ}'`; // a constant, written into the SQL
const window = (days: number, offsetDays: number) => dayWindow(days, offsetDays);

const rangeFor = (days: number): SummaryRange =>
  (Object.entries(RANGE_DAYS).find(([, n]) => n === days)?.[0] as SummaryRange) ?? "week";

/**
 * One row per café day, newest first. Days with no sales still appear, as zeros.
 *   moneyIn  = sales taken that day            (sales_daily continuous aggregate)
 *   moneyOut = expenses that day               (restocks are logged as "inventory" expenses)
 *   left     = moneyIn - moneyOut
 *   profit   = sales - cost of what was sold - non-inventory expenses (item_daily)
 * Gapfill bounds are passed explicitly: they cannot be inferred through a real-time aggregate.
 */
export function queryDaySummaries(days: number, offsetDays = 0) {
  const [start, end] = window(days, offsetDays);
  return query<DaySummary>(
    `WITH sold AS (
       SELECT time_bucket_gapfill(interval '1 day', day, ${TZ}, $1::timestamptz, $2::timestamptz) AS day,
              coalesce(sum(money_in_cents), 0)::int AS money_in
         FROM sales_daily
        WHERE day >= $1::timestamptz AND day < $2::timestamptz
        GROUP BY 1
     ),
     margin AS (
       SELECT time_bucket_gapfill(interval '1 day', day, ${TZ}, $1::timestamptz, $2::timestamptz) AS day,
              coalesce(sum(cogs_cents), 0)::int AS cogs
         FROM item_daily
        WHERE day >= $1::timestamptz AND day < $2::timestamptz
        GROUP BY 1
     ),
     spent AS (
       SELECT date AS day,
              sum(amount_cents)::int AS money_out,
              sum(amount_cents) FILTER (WHERE type <> 'inventory')::int AS overhead
         FROM expenses
        WHERE date >= ($1::timestamptz AT TIME ZONE ${TZ})::date
          AND date <  ($2::timestamptz AT TIME ZONE ${TZ})::date
        GROUP BY 1
     )
     SELECT to_char(sold.day AT TIME ZONE ${TZ}, 'YYYY-MM-DD')               AS date,
            sold.money_in                                                     AS "moneyInCents",
            coalesce(spent.money_out, 0)                                      AS "moneyOutCents",
            sold.money_in - coalesce(spent.money_out, 0)                      AS "leftCents",
            sold.money_in - margin.cogs - coalesce(spent.overhead, 0)         AS "profitCents"
       FROM sold
       JOIN margin USING (day)
       LEFT JOIN spent ON spent.day = (sold.day AT TIME ZONE ${TZ})::date
      ORDER BY sold.day DESC`,
    [start.toISOString(), end.toISOString()],
  );
}

/** Sales grouped by hour of the café's day (0-23, Toronto time), over the last `days` days. */
export function queryBusyHours(days: number) {
  return query<BusyHour>(
    `SELECT h AS hour,
            coalesce(sum(s.sale_count), 0)::int      AS "saleCount",
            coalesce(sum(s.money_in_cents), 0)::int  AS "moneyInCents"
       FROM generate_series(0, 23) AS h
       LEFT JOIN sales_hourly s
              ON extract(hour FROM s.hour AT TIME ZONE ${TZ}) = h
             AND s.hour >= now() - make_interval(days => $1::int)
      GROUP BY h
      ORDER BY h`,
    [days],
  );
}

export async function getDaySummaries(days: number, offsetDays = 0): Promise<DaySummary[]> {
  return hasDb()
    ? queryDaySummaries(days, offsetDays)
    : mockSummary(rangeFor(days), offsetDays, days);
}

export async function getBusyHours(days: number): Promise<BusyHour[]> {
  return hasDb() ? queryBusyHours(days) : mockBusyHours;
}

/** Units sold per item per café day (item_daily continuous aggregate). */
export async function getItemSales(days: number): Promise<TrendPoint[]> {
  if (!hasDb()) return mockItemSales(rangeFor(days));
  const [start, end] = window(days, 0);
  return query<TrendPoint>(
    `SELECT to_char(day AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS date,
            menu_item_id AS "menuItemId",
            qty_sold     AS "qtySold"
       FROM item_daily
      WHERE day >= $1::timestamptz AND day < $2::timestamptz`,
    [start.toISOString(), end.toISOString()],
  );
}

export async function getExpenses(days: number): Promise<Expense[]> {
  const [start, end] = window(days, 0);
  const from = cafeDate(start);
  const to = cafeDate(end);
  if (!hasDb()) return mockExpenses.filter((e) => e.date >= from && e.date < to);
  return query<Expense>(
    `SELECT id, type, amount_cents AS "amountCents", to_char(date, 'YYYY-MM-DD') AS date
       FROM expenses
      WHERE date >= $1::date AND date < $2::date`,
    [from, to],
  );
}

/** One café day: what customers paid, and what the things they bought cost to make. */
export interface DayKept {
  date: string; // YYYY-MM-DD
  inCents: number;
  costCents: number;
}

/**
 * Last `days` café days, newest first, zeros for quiet days. Both numbers come from item_daily
 * (revenue and cost of goods per item), so "kept" = in - cost:
 * part of each sale buys the item, the rest is yours. Rent and wages are not in here.
 */
export async function getKeptByDay(days: number): Promise<DayKept[]> {
  const [start, end] = window(days, 0);
  if (!hasDb()) {
    const price = new Map(mockMenu.map((m) => [m.id, m]));
    const byDate = new Map<string, DayKept>();
    for (const p of mockItemSales(rangeFor(days))) {
      const item = price.get(p.menuItemId);
      const row = byDate.get(p.date) ?? { date: p.date, inCents: 0, costCents: 0 };
      row.inCents += (item?.priceCents ?? 0) * p.qtySold;
      row.costCents += (item?.costCents ?? 0) * p.qtySold;
      byDate.set(p.date, row);
    }
    return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  }
  return query<DayKept>(
    `SELECT to_char(day AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS date, in_cents AS "inCents", cost_cents AS "costCents"
       FROM (
         SELECT time_bucket_gapfill(interval '1 day', day, ${TZ}, $1::timestamptz, $2::timestamptz) AS day,
                coalesce(sum(revenue_cents), 0)::int AS in_cents,
                coalesce(sum(cogs_cents), 0)::int    AS cost_cents
           FROM item_daily
          WHERE day >= $1::timestamptz AND day < $2::timestamptz
          GROUP BY 1
       ) d
      ORDER BY day DESC`,
    [start.toISOString(), end.toISOString()],
  );
}

// ---------------------------------------------------------------------------------------------
// Expense tracking: what the café bought (ingredients, supplies, ready-made stock) vs what
// customers paid. CONTRACT shared by the Money screen and /api/supplies/buy. Bodies: TODO.

/** One café day: what customers paid, and what the café spent buying stock. */
export interface DayFlow {
  date: string; // YYYY-MM-DD
  inCents: number;
  boughtCents: number;
}

/** One thing bought in the period, summed: e.g. Coffee beans, 3 bags, $54. */
export interface BoughtLine {
  name: string;
  kind: "supply" | "menu"; // supply = inventory_items (beans, cups...), menu = ready-made items
  qty: number;
  unit: string; // plain counting word: "bags", "cartons", "units"
  costCents: number;
}

// Without a database: realistic fake purchases, so the screen works in development.
const MOCK_BOUGHT: BoughtLine[] = [
  { name: "Coffee beans", kind: "supply", qty: 2, unit: "bags", costCents: 3600 },
  { name: "Milk", kind: "supply", qty: 6, unit: "cartons", costCents: 900 },
  { name: "Paper cups", kind: "supply", qty: 100, unit: "units", costCents: 800 },
];

/** Last `days` café days, newest first, zeros for quiet days. */
export async function getFlowByDay(days: number): Promise<DayFlow[]> {
  const [start, end] = window(days, 0);
  if (!hasDb()) {
    const kept = await getKeptByDay(days);
    const spent = MOCK_BOUGHT.reduce((sum, l) => sum + l.costCents, 0);
    // Stock is bought on two of the days: today and three days ago.
    return kept.map((d, i) => ({
      date: d.date,
      inCents: d.inCents,
      boughtCents: i === 0 ? spent : i === 3 ? 2400 : 0,
    }));
  }
  return query<DayFlow>(
    `WITH days AS (
       SELECT d::date AS day
         FROM generate_series(($1::timestamptz AT TIME ZONE ${TZ})::date,
                              ($2::timestamptz AT TIME ZONE ${TZ})::date - 1,
                              interval '1 day') AS d
     ),
     sold AS (
       SELECT (day AT TIME ZONE ${TZ})::date AS day, sum(revenue_cents)::int AS in_cents
         FROM item_daily
        WHERE day >= $1::timestamptz AND day < $2::timestamptz
        GROUP BY 1
     ),
     bought AS (
       SELECT day, sum(cents)::int AS cents
         FROM (
           SELECT (m.created_at AT TIME ZONE ${TZ})::date AS day,
                  m.change_qty / i.pack_size * i.unit_cost_cents AS cents -- packs x pack price
             FROM stock_movements m
             JOIN inventory_items i ON i.id = m.inventory_item_id
            WHERE m.reason = 'purchase'
              AND m.created_at >= $1::timestamptz AND m.created_at < $2::timestamptz
         ) x
        GROUP BY 1
     )
     SELECT to_char(days.day, 'YYYY-MM-DD')        AS date,
            coalesce(sold.in_cents, 0)::int        AS "inCents",
            coalesce(bought.cents, 0)::int         AS "boughtCents"
       FROM days
       LEFT JOIN sold   USING (day)
       LEFT JOIN bought USING (day)
      ORDER BY days.day DESC`,
    [start.toISOString(), end.toISOString()],
  );
}

/** Everything bought in the last `days` UTC days, grouped by item, biggest cost first. */
export async function getBought(days: number): Promise<BoughtLine[]> {
  const [start, end] = window(days, 0);
  if (!hasDb()) return MOCK_BOUGHT;
  return query<BoughtLine>(
    `SELECT name, kind, qty, unit, cost_cents AS "costCents"
       FROM (
         SELECT i.name,
                'supply'                                      AS kind,
                round(sum(m.change_qty / i.pack_size))::int   AS qty, -- in packs: "2 bags"
                coalesce(nullif(i.pack_name, ''), i.unit)     AS unit,
                round(sum(m.change_qty / i.pack_size * i.unit_cost_cents))::int AS cost_cents
           FROM stock_movements m
           JOIN inventory_items i ON i.id = m.inventory_item_id
          WHERE m.reason = 'purchase'
            AND m.created_at >= $1::timestamptz AND m.created_at < $2::timestamptz
          GROUP BY i.name, i.pack_name, i.unit
       ) b
      ORDER BY cost_cents DESC, name`,
    [start.toISOString(), end.toISOString()],
  );
}

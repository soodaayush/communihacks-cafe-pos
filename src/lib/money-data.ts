// Server-only. Money and sales history from Tiger Data, shared by the Money screen, the Gemini
// insights and the /api/summary + /api/busy-hours routes, so they always agree.
// Each get* falls back to mock data when DATABASE_URL is not set.
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

const DAY_MS = 86_400_000;

/** [start, end) of `days` UTC days, ending after today and shifted back by `offsetDays`. */
function window(days: number, offsetDays: number): [Date, Date] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1 - offsetDays);
  return [new Date(end.getTime() - days * DAY_MS), end];
}

const rangeFor = (days: number): SummaryRange =>
  (Object.entries(RANGE_DAYS).find(([, n]) => n === days)?.[0] as SummaryRange) ?? "week";

/**
 * One row per UTC day, newest first. Days with no sales still appear, as zeros.
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
       SELECT time_bucket_gapfill(interval '1 day', day, $1::timestamptz, $2::timestamptz) AS day,
              coalesce(sum(money_in_cents), 0)::int AS money_in
         FROM sales_daily
        WHERE day >= $1::timestamptz AND day < $2::timestamptz
        GROUP BY 1
     ),
     margin AS (
       SELECT time_bucket_gapfill(interval '1 day', day, $1::timestamptz, $2::timestamptz) AS day,
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
        WHERE date >= ($1::timestamptz AT TIME ZONE 'UTC')::date
          AND date <  ($2::timestamptz AT TIME ZONE 'UTC')::date
        GROUP BY 1
     )
     SELECT to_char(sold.day AT TIME ZONE 'UTC', 'YYYY-MM-DD')               AS date,
            sold.money_in                                                     AS "moneyInCents",
            coalesce(spent.money_out, 0)                                      AS "moneyOutCents",
            sold.money_in - coalesce(spent.money_out, 0)                      AS "leftCents",
            sold.money_in - margin.cogs - coalesce(spent.overhead, 0)         AS "profitCents"
       FROM sold
       JOIN margin USING (day)
       LEFT JOIN spent ON spent.day = (sold.day AT TIME ZONE 'UTC')::date
      ORDER BY sold.day DESC`,
    [start.toISOString(), end.toISOString()],
  );
}

/** Sales grouped by hour of the day (UTC hours, 0-23), over the last `days` days. */
export function queryBusyHours(days: number) {
  return query<BusyHour>(
    `SELECT h AS hour,
            coalesce(sum(s.sale_count), 0)::int      AS "saleCount",
            coalesce(sum(s.money_in_cents), 0)::int  AS "moneyInCents"
       FROM generate_series(0, 23) AS h
       LEFT JOIN sales_hourly s
              ON extract(hour FROM s.hour AT TIME ZONE 'UTC') = h
             AND s.hour >= now() - make_interval(days => $1::int)
      GROUP BY h
      ORDER BY h`,
    [days],
  );
}

export async function getDaySummaries(days: number, offsetDays = 0): Promise<DaySummary[]> {
  return hasDb() ? queryDaySummaries(days, offsetDays) : mockSummary(rangeFor(days), offsetDays);
}

export async function getBusyHours(days: number): Promise<BusyHour[]> {
  return hasDb() ? queryBusyHours(days) : mockBusyHours;
}

/** Units sold per item per UTC day (item_daily continuous aggregate). */
export async function getItemSales(days: number): Promise<TrendPoint[]> {
  if (!hasDb()) return mockItemSales(rangeFor(days));
  const [start, end] = window(days, 0);
  return query<TrendPoint>(
    `SELECT to_char(day AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
            menu_item_id AS "menuItemId",
            qty_sold     AS "qtySold"
       FROM item_daily
      WHERE day >= $1::timestamptz AND day < $2::timestamptz`,
    [start.toISOString(), end.toISOString()],
  );
}

export async function getExpenses(days: number): Promise<Expense[]> {
  const [start, end] = window(days, 0);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  if (!hasDb()) return mockExpenses.filter((e) => e.date >= from && e.date < to);
  return query<Expense>(
    `SELECT id, type, amount_cents AS "amountCents", to_char(date, 'YYYY-MM-DD') AS date
       FROM expenses
      WHERE date >= $1::date AND date < $2::date`,
    [from, to],
  );
}

/** One UTC day: what customers paid, and what the things they bought cost to make. */
export interface DayKept {
  date: string; // YYYY-MM-DD
  inCents: number;
  costCents: number;
}

/**
 * Last `days` UTC days, newest first, zeros for quiet days. Both numbers come from item_daily
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
    `SELECT to_char(day AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, in_cents AS "inCents", cost_cents AS "costCents"
       FROM (
         SELECT time_bucket_gapfill(interval '1 day', day, $1::timestamptz, $2::timestamptz) AS day,
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

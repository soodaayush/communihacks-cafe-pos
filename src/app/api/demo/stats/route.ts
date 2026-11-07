import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import type { Insights } from "@/lib/demo-types";

const mock: Insights = {
  basket: { medianCents: 400, p90Cents: 700, avgCents: 410 },
  daily: { avgCents: 17000, stddevCents: 6000 },
};

// GET /api/demo/stats  ->  statistics computed inside the database with TimescaleDB Toolkit
// hyperfunctions: percentile_agg / approx_percentile for basket size, stats_agg for daily money in.
export function GET() {
  return dbOrMock<Insights>(
    () => mock,
    async () => {
      const rows = await query<{
        median: number;
        p90: number;
        avg: number;
        dayAvg: number;
        dayStddev: number;
      }>(
        `WITH baskets AS (
           SELECT percentile_agg(total_cents) AS pct, stats_agg(total_cents) AS st
             FROM sales WHERE created_at >= now() - interval '30 days'
         ),
         days AS (
           SELECT stats_agg(money_in_cents) AS st
             FROM sales_daily WHERE day >= now() - interval '30 days'
         )
         SELECT approx_percentile(0.5, baskets.pct)::float8 AS median,
                approx_percentile(0.9, baskets.pct)::float8 AS p90,
                average(baskets.st)::float8                 AS avg,
                average(days.st)::float8                    AS "dayAvg",
                stddev(days.st)::float8                     AS "dayStddev"
           FROM baskets, days`,
      );
      const r = rows[0];
      return {
        basket: {
          medianCents: Math.round(r.median),
          p90Cents: Math.round(r.p90),
          avgCents: Math.round(r.avg),
        },
        daily: { avgCents: Math.round(r.dayAvg), stddevCents: Math.round(r.dayStddev) },
      };
    },
  );
}

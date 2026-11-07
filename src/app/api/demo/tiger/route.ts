import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import type { TigerStats } from "@/lib/demo-types";

const mock: TigerStats = {
  hypertables: [
    { name: "sales", chunks: 5, compressedChunks: 3, bytesBefore: 589824, bytesAfter: 327680 },
  ],
  aggregates: [{ name: "sales_daily", realTime: true }],
  totals: { sales: 0, saleLines: 0, stockMovements: 0 },
};

// GET /api/demo/tiger  ->  what Tiger Data is doing under the app: hypertable chunks, columnstore
// compression, continuous aggregates, and row counts. Straight from TimescaleDB's own catalog views.
export function GET() {
  return dbOrMock<TigerStats>(
    () => mock,
    async () => {
      const [hypertables, aggregates, totals] = await Promise.all([
        query<TigerStats["hypertables"][number]>(
          `SELECT name,
                  total_chunks::int                        AS chunks,
                  number_compressed_chunks::int            AS "compressedChunks",
                  before_compression_total_bytes::float8   AS "bytesBefore",
                  after_compression_total_bytes::float8    AS "bytesAfter"
             FROM (
               SELECT 'sales' AS name, * FROM hypertable_columnstore_stats('sales')
               UNION ALL SELECT 'sale_items', * FROM hypertable_columnstore_stats('sale_items')
               UNION ALL SELECT 'stock_movements', * FROM hypertable_columnstore_stats('stock_movements')
             ) s
            ORDER BY name`,
        ),
        query<TigerStats["aggregates"][number]>(
          `SELECT view_name AS name, NOT materialized_only AS "realTime"
             FROM timescaledb_information.continuous_aggregates
            ORDER BY view_name`,
        ),
        query<TigerStats["totals"]>(
          `SELECT (SELECT count(*) FROM sales)::int           AS sales,
                  (SELECT count(*) FROM sale_items)::int      AS "saleLines",
                  (SELECT count(*) FROM stock_movements)::int AS "stockMovements"`,
        ),
      ]);
      return { hypertables, aggregates, totals: totals[0] };
    },
  );
}

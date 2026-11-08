// Checks that the data in Tiger Data adds up. Run: npm run db:check   (repair: npm run db:check -- --fix)
// Exits with code 1 if anything is wrong, so it can run before a demo or in CI.
import { Client } from "pg";

const FIX = process.argv.includes("--fix");

interface Check {
  name: string;
  /** Returns a list of problems (empty = fine). */
  run: (db: Client) => Promise<string[]>;
  /** Optional repair, used with --fix. Returns how many rows it changed. */
  fix?: (db: Client) => Promise<number>;
}

const rows = async <T>(db: Client, sql: string) => (await db.query(sql)).rows as T[];

const CHECKS: Check[] = [
  {
    name: "Every back-room item's stock equals the sum of its stock history",
    run: async (db) =>
      (
        await rows<{ name: string; stock: number; ledger: number }>(
          db,
          `SELECT i.name, i.stock::float8 AS stock,
                  coalesce((SELECT sum(change_qty) FROM stock_movements m WHERE m.inventory_item_id = i.id), 0)::float8 AS ledger
             FROM inventory_items i`,
        )
      )
        .filter((r) => Math.abs(r.stock - r.ledger) > 0.001)
        .map((r) => `${r.name}: stock ${r.stock}, history adds up to ${r.ledger}`),
  },
  {
    name: "Every sale is linked to its items (same id and time)",
    run: async (db) =>
      (
        await rows<{ id: string; created_at: Date }>(
          db,
          `SELECT s.id, s.created_at FROM sales s
            WHERE NOT EXISTS (SELECT 1 FROM sale_items si WHERE si.sale_id = s.id AND si.sale_created_at = s.created_at)`,
        )
      ).map((r) => `sale ${r.id} at ${r.created_at.toISOString()} has no linked items`),
    // Sales recorded before the millisecond fix: their items carry the time cut to milliseconds.
    // TimescaleDB will not rewrite the column a hypertable is ordered by, so each such sale is
    // saved again with the corrected time and the old copy removed, in one transaction.
    fix: async (db) => {
      await db.query("BEGIN");
      try {
        const bad = await rows<{
          id: string;
          created_at: Date;
          ms: Date;
          payment_method: string;
          total_cents: number;
          client_ref: string | null;
        }>(
          db,
          `SELECT s.id, s.created_at, date_trunc('milliseconds', s.created_at) AS ms,
                  s.payment_method, s.total_cents, s.client_ref
             FROM sales s
            WHERE s.created_at <> date_trunc('milliseconds', s.created_at)
              AND EXISTS (SELECT 1 FROM sale_items si
                           WHERE si.sale_id = s.id AND si.sale_created_at = date_trunc('milliseconds', s.created_at))`,
        );
        for (const r of bad) {
          await db.query(
            `INSERT INTO sales (id, created_at, payment_method, total_cents, client_ref) VALUES ($1, $2, $3, $4, $5)`,
            [r.id, r.ms, r.payment_method, r.total_cents, r.client_ref],
          );
          // The old row's exact time, compared at full precision inside the database.
          await db.query(
            `DELETE FROM sales WHERE id = $1 AND created_at <> date_trunc('milliseconds', created_at)`,
            [r.id],
          );
        }
        await db.query("COMMIT");
        return bad.length;
      } catch (err) {
        await db.query("ROLLBACK");
        throw err;
      }
    },
  },
  {
    name: "Every sale's total equals its items",
    run: async (db) =>
      (
        await rows<{ id: string; total: number; items: number }>(
          db,
          `SELECT s.id, s.total_cents AS total, sum(si.qty * si.unit_price_cents)::int AS items
             FROM sales s JOIN sale_items si ON si.sale_id = s.id AND si.sale_created_at = s.created_at
            GROUP BY s.id, s.total_cents HAVING s.total_cents <> sum(si.qty * si.unit_price_cents)`,
        )
      ).map((r) => `sale ${r.id}: total ${r.total}, items ${r.items}`),
  },
  {
    name: "Every drink has a recipe for small, medium and large",
    run: async (db) =>
      (
        await rows<{ name: string; sizes: string }>(
          db,
          `SELECT m.name, coalesce(string_agg(DISTINCT r.size, ''), '') AS sizes
             FROM menu_items m LEFT JOIN recipes r ON r.menu_item_id = m.id
            WHERE m.category = 'drink' GROUP BY m.name`,
        )
      )
        .filter((r) => !["S", "M", "L"].every((s) => r.sizes.includes(s)))
        .map((r) => `${r.name} has recipes for "${r.sizes || "none"}"`),
  },
  {
    name: "No stock below zero",
    run: async (db) =>
      (
        await rows<{ name: string; stock: number }>(
          db,
          `SELECT name, stock::float8 AS stock FROM menu_items WHERE stock < 0
           UNION ALL SELECT name, stock::float8 FROM inventory_items WHERE stock < 0`,
        )
      ).map((r) => `${r.name}: ${r.stock}`),
  },
  {
    name: "The rollups (continuous aggregates) agree with the raw data",
    run: async (db) => {
      // Bring the finished days and hours up to date first (what the 5-minute refresh policy does),
      // e.g. after a sale that waited offline lands in an hour that was already summed up. Today's
      // day and this hour stay open, so new sales keep showing instantly (real-time aggregates).
      const midnight =
        "date_trunc('day', now() AT TIME ZONE 'America/Toronto') AT TIME ZONE 'America/Toronto'";
      for (const [view, end] of [
        ["sales_daily", midnight],
        ["item_daily", midnight],
        ["stock_use_daily", midnight],
        ["sales_hourly", "date_trunc('hour', now())"],
      ]) {
        await db.query(
          `CALL refresh_continuous_aggregate('${view}', now() - interval '35 days', ${end})`,
        );
      }
      const [r] = await rows<Record<string, number>>(
        db,
        `SELECT (SELECT coalesce(sum(total_cents), 0) FROM sales)::bigint                    AS sales,
                (SELECT coalesce(sum(money_in_cents), 0) FROM sales_daily)::bigint           AS sales_daily,
                (SELECT coalesce(sum(money_in_cents), 0) FROM sales_hourly)::bigint          AS sales_hourly,
                (SELECT coalesce(sum(qty * unit_price_cents), 0) FROM sale_items)::bigint    AS items,
                (SELECT coalesce(sum(revenue_cents), 0) FROM item_daily)::bigint             AS item_daily,
                (SELECT coalesce(-sum(change_qty), 0) FROM stock_movements WHERE reason = 'use')::float8 AS used,
                (SELECT coalesce(sum(used), 0) FROM stock_use_daily)::float8                 AS stock_use_daily`,
      );
      const problems: string[] = [];
      const same = (a: string, b: string) =>
        Math.abs(Number(r[a]) - Number(r[b])) > 0.01 &&
        problems.push(`${b} ${r[b]} vs ${a} ${r[a]}`);
      same("sales", "sales_daily");
      same("sales", "sales_hourly");
      same("items", "item_daily");
      same("used", "stock_use_daily");
      return problems;
    },
  },
  {
    name: "Daily rollups use the café's days (America/Toronto)",
    run: async (db) =>
      (
        await rows<{ view_name: string }>(
          db,
          `SELECT view_name FROM timescaledb_information.continuous_aggregates
            WHERE view_name <> 'sales_hourly' AND view_definition NOT LIKE '%America/Toronto%'`,
        )
      ).map((r) => `${r.view_name} still uses UTC days (run npm run db:schema)`),
  },
  {
    name: "Background jobs (refresh and compression) have not failed",
    run: async (db) =>
      (
        await rows<{ application_name: string; last_run_status: string }>(
          db,
          `SELECT j.application_name, s.last_run_status
             FROM timescaledb_information.jobs j JOIN timescaledb_information.job_stats s USING (job_id)
            WHERE s.last_run_status = 'Failed'`,
        )
      ).map((r) => `${r.application_name}: last run failed`),
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (put it in .env.local).");
    process.exit(1);
  }
  const db = new Client({ connectionString: url });
  await db.connect();
  let failed = 0;
  try {
    for (const check of CHECKS) {
      let problems = await check.run(db);
      if (problems.length && FIX && check.fix) {
        const changed = await check.fix(db);
        console.log(`  … repaired ${changed} row(s)`);
        problems = await check.run(db);
      }
      if (problems.length) {
        failed++;
        console.log(`✗ ${check.name}`);
        for (const p of problems.slice(0, 10)) console.log(`    ${p}`);
        if (problems.length > 10) console.log(`    … and ${problems.length - 10} more`);
        if (check.fix && !FIX) console.log("    (npm run db:check -- --fix can repair this)");
      } else {
        console.log(`✓ ${check.name}`);
      }
    }
  } finally {
    await db.end();
  }
  console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

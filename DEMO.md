# Demo guide: Tiger Data track

Open **http://localhost:3000/demo** ("Under the hood"). It re-reads the database after every action.

## 3-minute script

1. **The problem.** A café register produces a steady stream of time-stamped events (sales, stock changes). That is time-series data, which is what Tiger Data is for.
2. **Click "Simulate a rush".** 20 real sales go through the normal sale path: hypertable inserts, stock decrement, all in one transaction.
3. **Watch the panels change, with no refresh button anywhere:**
   - _Today_: money in and profit move immediately. These come from **real-time continuous aggregates** (`sales_daily`, `item_daily`): stored rollups plus the newest rows.
   - _Busiest hours_: from the `sales_hourly` aggregate.
   - _Restock forecast_: weekday-aware forecast, built on `item_daily`; items run out sooner after a rush.
4. **Under the hood panels.**
   - _Columnstore compression_: chunks older than a week are compressed automatically (`sales`, `sale_items`, `stock_movements`).
   - _Statistics in SQL_: TimescaleDB Toolkit (`percentile_agg`, `stats_agg`): median and 90th-percentile sale, daily average and spread, computed in the database.
5. **Money screen.** `/api/summary` uses `time_bucket_gapfill`, so a quiet day shows as zero instead of vanishing from the chart.
6. **Ask Claude about the data** (needs the Tiger MCP, see below): "Which item is most likely to run out this week?" Claude queries the live service.

Reset to clean data before presenting: `npm run db:seed` (wipes and refills fake data).

## Tiger's agent features

**MCP (already set up).** `tiger mcp install` registers Tiger with Claude Code. In a fresh session, ask: _"List my Tiger services"_, then _"What is the average sale size this week?"_. Claude runs SQL against the service and can read logs and metrics.

**Forks: one database per person, or a what-if sandbox.** A fork is an independent copy of the service, so nobody's test sales or `db:seed` touches anyone else.

```bash
tiger service fork dr25ilymdk --name cafe-whatif --no-set-default
```

Then point a `.env.local` at the fork's connection string. Forking creates a new billable service (covered by trial credits), so create forks deliberately and delete them afterwards (`tiger service delete <id>`).

Useful options: `--last-snapshot` (faster), `--to-timestamp 2026-11-07T15:00:00Z` (point-in-time copy: "the café as it was at 3pm").

## Env flags

- `DEMO_MODE=off` disables `POST /api/demo/rush` (set it on any real deployment).

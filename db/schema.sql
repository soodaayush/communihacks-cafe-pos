-- Tiger Data (PostgreSQL + TimescaleDB). Money columns are whole cents.
-- Run: npm run db:schema   (safe to re-run: everything is IF NOT EXISTS)
--
-- Layout
--   Regular tables : menu_items, inventory_items, recipes, purchases, expenses
--   Hypertables    : sales, sale_items, stock_movements   (time-series, append-mostly history)
--   Aggregates     : sales_daily, sales_hourly, item_daily (continuous aggregates)

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- What the cafe sells (one tile on the register).
CREATE TABLE IF NOT EXISTS menu_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text    NOT NULL,
  image_public_id text    NOT NULL DEFAULT '',
  category        text    NOT NULL,
  price_cents     integer NOT NULL CHECK (price_cents >= 0),
  cost_cents      integer NOT NULL CHECK (cost_cents >= 0),
  stock           integer NOT NULL DEFAULT 0,
  reorder_level   integer NOT NULL DEFAULT 0
);

-- Everything the cafe keeps in the back: ingredients and supplies (beans, milk, cups...).
-- Separate from menu_items because you buy "2 bags of beans", but you sell "1 coffee".
-- Drink ingredients are measured (grams, ml, oranges) so each cup size can use its own amount.
CREATE TABLE IF NOT EXISTS inventory_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text    NOT NULL UNIQUE,
  category            text    NOT NULL CHECK (category IN ('ingredient', 'packaging', 'supply')),
  unit                text    NOT NULL,                        -- what `stock` counts: 'g', 'ml', 'oranges', 'bags', 'cartons', 'units'
  stock               numeric(12, 2) NOT NULL DEFAULT 0,       -- current amount, in `unit`
  reorder_level       numeric(12, 2) NOT NULL DEFAULT 0,       -- in `unit`
  unit_cost_cents     integer NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0), -- price of ONE PACK
  image_public_id     text    NOT NULL DEFAULT '',
  pack_name           text    NOT NULL DEFAULT '',             -- what you buy: 'bags', 'bottles', 'crates' ('' = same as unit)
  pack_size           numeric(12, 2) NOT NULL DEFAULT 1 CHECK (pack_size > 0), -- `unit`s in one pack (1 bag = 1000 g)
  full_qty            numeric(12, 2) CHECK (full_qty > 0)      -- a full container, for "% full" (NULL = just a count)
);
-- Databases created before drinks were made from ingredients: add the new columns.
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS pack_name text NOT NULL DEFAULT '';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS pack_size numeric(12, 2) NOT NULL DEFAULT 1 CHECK (pack_size > 0);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS full_qty numeric(12, 2) CHECK (full_qty > 0);

-- What one drink of each size uses from the back room, e.g. a large coffee = 22 g of beans + 1 cup
-- + 1 lid. Selling a drink subtracts these amounts (see src/lib/sales.ts). Drinks have no shelf stock:
-- how many can still be made is worked out from these and the back-room amounts.
CREATE TABLE IF NOT EXISTS recipes (
  menu_item_id      uuid           NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
  size              text           NOT NULL CHECK (size IN ('S', 'M', 'L')),
  inventory_item_id uuid           NOT NULL REFERENCES inventory_items (id) ON DELETE CASCADE,
  qty               numeric(12, 2) NOT NULL CHECK (qty > 0), -- in the inventory item's `unit`
  PRIMARY KEY (menu_item_id, size, inventory_item_id)
);

-- Time-series table. A hypertable needs its time column in every unique key.
-- Syntax from the Tiger Data quickstart: WITH (tsdb.hypertable, ...).
CREATE TABLE IF NOT EXISTS sales (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  payment_method text        NOT NULL CHECK (payment_method IN ('cash', 'debit')),
  total_cents    integer     NOT NULL CHECK (total_cents >= 0),
  PRIMARY KEY (id, created_at)
) WITH (
  tsdb.hypertable,
  tsdb.orderby = 'created_at DESC'
);

-- Hypertable too (time column = sale_created_at): the biggest table, so it gets columnstore
-- compression segmented by menu item, and it can feed continuous aggregates (item_daily below).
-- No FK to sales on purpose: (sale_id, sale_created_at) points at the hypertable row.
CREATE TABLE IF NOT EXISTS sale_items (
  sale_id          uuid        NOT NULL,
  sale_created_at  timestamptz NOT NULL,
  menu_item_id     uuid        NOT NULL REFERENCES menu_items (id),
  qty              integer     NOT NULL CHECK (qty > 0),
  unit_price_cents integer     NOT NULL CHECK (unit_price_cents >= 0),
  unit_cost_cents  integer     NOT NULL CHECK (unit_cost_cents >= 0),
  size             text        -- 'S' / 'M' / 'L' for drinks (checked in the API), NULL otherwise
) WITH (
  tsdb.hypertable,
  tsdb.partition_column = 'sale_created_at',
  tsdb.segmentby = 'menu_item_id',
  tsdb.orderby = 'sale_created_at DESC'
);
-- Chunks older than a week move to compressed columnstore automatically (sale_items needs it spelled
-- out when the table was converted in place; if_not_exists makes this a no-op otherwise).
CALL add_columnstore_policy('sale_items', after => INTERVAL '7 days', if_not_exists => TRUE);
-- Databases created before drink sizes existed: add the column (old rows stay NULL = small).
-- VERIFY against docs: adding a nullable column works on a hypertable with columnstore enabled.
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS size text;
CREATE INDEX IF NOT EXISTS sale_items_sale_idx ON sale_items (sale_id, sale_created_at);
CREATE INDEX IF NOT EXISTS sale_items_item_time_idx ON sale_items (menu_item_id, sale_created_at DESC);

-- Ledger of every stock change for back-room inventory. Current stock on
-- inventory_items should always equal the sum of its movements.
-- reason: purchase (+), use (-), waste (-), adjustment (+/-)
CREATE TABLE IF NOT EXISTS stock_movements (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  inventory_item_id  uuid        NOT NULL REFERENCES inventory_items (id),
  change_qty         numeric(12, 2) NOT NULL CHECK (change_qty <> 0),
  reason             text        NOT NULL CHECK (reason IN ('purchase', 'use', 'waste', 'adjustment')),
  PRIMARY KEY (id, created_at)
) WITH (
  tsdb.hypertable,
  tsdb.orderby = 'created_at DESC'
);
CREATE INDEX IF NOT EXISTS stock_movements_item_time_idx
  ON stock_movements (inventory_item_id, created_at DESC);

-- Restocks of menu items (money out + stock in).
CREATE TABLE IF NOT EXISTS purchases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id     uuid        NOT NULL REFERENCES menu_items (id),
  qty              integer     NOT NULL CHECK (qty > 0),
  total_cost_cents integer     NOT NULL CHECK (total_cost_cents >= 0),
  payment_method   text        NOT NULL CHECK (payment_method IN ('cash', 'debit')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text    NOT NULL CHECK (type IN ('rent', 'salary', 'inventory', 'other')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  date         date    NOT NULL
);

-- Continuous aggregates: TimescaleDB keeps these rollups up to date for us.
-- All are real-time (materialized_only = false): a query also includes the newest rows that
-- are not materialized yet, so a sale rung up one second ago shows up. The policy refreshes
-- the stored part every few minutes. Buckets are UTC days/hours.

-- Money in per day. Money out and profit come from expenses + item_daily in the summary query.
CREATE MATERIALIZED VIEW IF NOT EXISTS sales_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket(INTERVAL '1 day', created_at) AS day,
  count(*)::int                             AS sale_count,
  sum(total_cents)::bigint                  AS money_in_cents
FROM sales
GROUP BY 1
WITH NO DATA;

-- Sales per hour: powers the "busiest hours" chart.
CREATE MATERIALIZED VIEW IF NOT EXISTS sales_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket(INTERVAL '1 hour', created_at) AS hour,
  count(*)::int                              AS sale_count,
  sum(total_cents)::bigint                   AS money_in_cents
FROM sales
GROUP BY 1
WITH NO DATA;

-- Units, revenue and cost of goods per menu item per day: powers trends, profit and restock forecasts.
CREATE MATERIALIZED VIEW IF NOT EXISTS item_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket(INTERVAL '1 day', sale_created_at) AS day,
  menu_item_id,
  sum(qty)::int                                  AS qty_sold,
  sum(qty * unit_price_cents)::bigint            AS revenue_cents,
  sum(qty * unit_cost_cents)::bigint             AS cogs_cents
FROM sale_items
GROUP BY 1, 2
WITH NO DATA;

ALTER MATERIALIZED VIEW sales_daily  SET (timescaledb.materialized_only = false);
ALTER MATERIALIZED VIEW sales_hourly SET (timescaledb.materialized_only = false);
ALTER MATERIALIZED VIEW item_daily   SET (timescaledb.materialized_only = false);

SELECT add_continuous_aggregate_policy('sales_daily',
  start_offset => NULL, end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '5 minutes', if_not_exists => TRUE);
SELECT add_continuous_aggregate_policy('sales_hourly',
  start_offset => NULL, end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '5 minutes', if_not_exists => TRUE);
SELECT add_continuous_aggregate_policy('item_daily',
  start_offset => NULL, end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '5 minutes', if_not_exists => TRUE);

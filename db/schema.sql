-- Tiger Data (PostgreSQL + TimescaleDB). Money columns are whole cents.
-- Run: npm run db:schema   (safe to re-run: everything is IF NOT EXISTS)
--
-- Layout
--   Regular tables : menu_items, inventory_items, purchases, expenses
--   Hypertables    : sales, stock_movements   (time-series, append-mostly history)
--   Aggregate      : sales_daily              (continuous aggregate over sales)

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
-- Separate from menu_items because you buy "2 kg of beans", but you sell "1 coffee".
CREATE TABLE IF NOT EXISTS inventory_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text    NOT NULL UNIQUE,
  category            text    NOT NULL CHECK (category IN ('ingredient', 'packaging', 'supply')),
  unit                text    NOT NULL,                        -- 'kg', 'L', 'pcs' ...
  stock               numeric(12, 2) NOT NULL DEFAULT 0,       -- current amount, in `unit`
  reorder_level       numeric(12, 2) NOT NULL DEFAULT 0,
  unit_cost_cents     integer NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  image_public_id     text    NOT NULL DEFAULT ''
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

-- No FK to sales on purpose: (sale_id, sale_created_at) points at the hypertable row.
CREATE TABLE IF NOT EXISTS sale_items (
  sale_id          uuid        NOT NULL,
  sale_created_at  timestamptz NOT NULL,
  menu_item_id     uuid        NOT NULL REFERENCES menu_items (id),
  qty              integer     NOT NULL CHECK (qty > 0),
  unit_price_cents integer     NOT NULL CHECK (unit_price_cents >= 0),
  unit_cost_cents  integer     NOT NULL CHECK (unit_cost_cents >= 0)
);
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

-- Money in per day, kept up to date by TimescaleDB. Cheap to read for the day/week/month views.
-- Money out (expenses + purchases) is added in the API query; profit needs sale_items,
-- which cannot be joined inside a continuous aggregate.
CREATE MATERIALIZED VIEW IF NOT EXISTS sales_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket(INTERVAL '1 day', created_at) AS day,
  count(*)                                  AS sale_count,
  sum(total_cents)                          AS money_in_cents
FROM sales
GROUP BY 1
WITH NO DATA;

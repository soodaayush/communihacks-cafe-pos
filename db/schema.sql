-- Tiger Data (PostgreSQL + TimescaleDB). Money columns are whole cents.
-- Run: npm run db:schema

CREATE EXTENSION IF NOT EXISTS timescaledb;

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

-- Time-series table. A hypertable needs its time column in every unique key.
CREATE TABLE IF NOT EXISTS sales (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  payment_method text        NOT NULL CHECK (payment_method IN ('cash', 'debit')),
  total_cents    integer     NOT NULL CHECK (total_cents >= 0),
  PRIMARY KEY (id, created_at)
);
-- VERIFY against docs: by_range() form needs TimescaleDB 2.13+.
SELECT create_hypertable('sales', by_range('created_at'), if_not_exists => TRUE);

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

-- TODO(dev1): DaySummary is computed, not stored. Decide what "money out" includes
-- (expenses + purchases?) and consider a continuous aggregate on sales for day/week/month.

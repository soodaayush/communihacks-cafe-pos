// Fills the database with ~30 days of fake cafe history. All data is fake.
// Run: npm run db:seed        (DESTRUCTIVE: wipes these tables first, then re-fills them)
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const DAYS = 30;

// Deterministic random numbers so every seed run produces the same cafe.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(42);
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

// Things customers buy. `popularity` is a weight for how often it lands in an order.
const MENU = [
  {
    name: "Coffee",
    category: "drink",
    price: 200,
    cost: 60,
    popularity: 10,
    finalStock: 100,
    reorder: 10,
  },
  {
    name: "Tea",
    category: "drink",
    price: 150,
    cost: 30,
    popularity: 5,
    finalStock: 8,
    reorder: 10,
  },
  {
    name: "Hot Chocolate",
    category: "drink",
    price: 250,
    cost: 80,
    popularity: 4,
    finalStock: 55,
    reorder: 8,
  },
  {
    name: "Juice",
    category: "drink",
    price: 200,
    cost: 70,
    popularity: 4,
    finalStock: 50,
    reorder: 8,
  },
  {
    name: "Muffin",
    category: "food",
    price: 250,
    cost: 90,
    popularity: 6,
    finalStock: 80,
    reorder: 6,
  },
  {
    name: "Cookie",
    category: "food",
    price: 100,
    cost: 25,
    popularity: 8,
    finalStock: 3,
    reorder: 8,
  },
  {
    name: "Sandwich",
    category: "food",
    price: 450,
    cost: 180,
    popularity: 3,
    finalStock: 40,
    reorder: 5,
  },
  {
    name: "Toast",
    category: "food",
    price: 175,
    cost: 45,
    popularity: 4,
    finalStock: 60,
    reorder: 8,
  },
];

// Back-room stock, counted in whole bags / cartons / units. `daily` = typical use per day (can be
// under 1), `finalStock` = what is left today.
const INVENTORY = [
  {
    name: "Coffee beans",
    category: "ingredient",
    unit: "bags",
    unitCost: 1800,
    daily: 0.7,
    finalStock: 6,
    reorder: 3,
  },
  {
    name: "Milk",
    category: "ingredient",
    unit: "cartons",
    unitCost: 150,
    daily: 4,
    finalStock: 14,
    reorder: 8,
  },
  {
    name: "Tea bags",
    category: "ingredient",
    unit: "cartons",
    unitCost: 400,
    daily: 0.2,
    finalStock: 1,
    reorder: 2,
  },
  {
    name: "Cocoa powder",
    category: "ingredient",
    unit: "bags",
    unitCost: 900,
    daily: 0.15,
    finalStock: 3,
    reorder: 1,
  },
  {
    name: "Flour",
    category: "ingredient",
    unit: "bags",
    unitCost: 120,
    daily: 0.8,
    finalStock: 8,
    reorder: 4,
  },
  {
    name: "Sugar",
    category: "ingredient",
    unit: "bags",
    unitCost: 110,
    daily: 0.4,
    finalStock: 6,
    reorder: 3,
  },
  {
    name: "Eggs",
    category: "ingredient",
    unit: "cartons",
    unitCost: 450,
    daily: 1.2,
    finalStock: 2,
    reorder: 4,
  },
  {
    name: "Bread",
    category: "ingredient",
    unit: "units",
    unitCost: 300,
    daily: 3,
    finalStock: 10,
    reorder: 6,
  },
  {
    name: "Paper cups",
    category: "packaging",
    unit: "units",
    unitCost: 8,
    daily: 28,
    finalStock: 150,
    reorder: 100,
  },
  {
    name: "Cup lids",
    category: "packaging",
    unit: "units",
    unitCost: 4,
    daily: 28,
    finalStock: 90,
    reorder: 100,
  },
  {
    name: "Napkins",
    category: "supply",
    unit: "cartons",
    unitCost: 250,
    daily: 0.4,
    finalStock: 5,
    reorder: 3,
  },
  {
    name: "Cleaning spray",
    category: "supply",
    unit: "units",
    unitCost: 500,
    daily: 0.05,
    finalStock: 2,
    reorder: 1,
  },
];

const iso = (d: Date) => d.toISOString();
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL not set. Nothing to seed.");
    return;
  }
  const client = new Client({ connectionString: url });
  await client.connect();

  // Day 0 = DAYS-1 days ago, last day = today.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayStart = (i: number) => new Date(today.getTime() - (DAYS - 1 - i) * 86_400_000);

  try {
    // Wipe first, in its own transaction. TRUNCATE does not clear the continuous aggregates, so refresh
    // them while the source tables are empty: that deletes any stale rollups (and resets their watermark,
    // otherwise a leftover "today" bucket would hide new sales from the real-time aggregates).
    await client.query(
      "TRUNCATE sale_items, sales, stock_movements, purchases, expenses, inventory_items, menu_items RESTART IDENTITY CASCADE",
    );
    for (const view of ["sales_daily", "sales_hourly", "item_daily"]) {
      await client.query(`CALL refresh_continuous_aggregate('${view}', NULL, NULL)`);
    }

    await client.query("BEGIN");

    // --- Menu items ---------------------------------------------------------
    const menuIds: string[] = [];
    for (const m of MENU) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO menu_items (name, image_public_id, category, price_cents, cost_cents, stock, reorder_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          m.name,
          `kwhab/menu/${m.name.toLowerCase().replace(/\s+/g, "-")}`,
          m.category,
          m.price,
          m.cost,
          m.finalStock,
          m.reorder,
        ],
      );
      menuIds.push(rows[0].id);
    }

    // --- Sales + sale_items -------------------------------------------------
    const totalWeight = MENU.reduce((s, m) => s + m.popularity, 0);
    const pickItem = () => {
      let r = rand() * totalWeight;
      for (let i = 0; i < MENU.length; i++) {
        r -= MENU[i].popularity;
        if (r <= 0) return i;
      }
      return 0;
    };

    const sales = {
      id: [] as string[],
      at: [] as string[],
      pay: [] as string[],
      total: [] as number[],
    };
    const lines = {
      saleId: [] as string[],
      at: [] as string[],
      item: [] as string[],
      qty: [] as number[],
      price: [] as number[],
      cost: [] as number[],
    };
    const soldPerDay: number[][] = Array.from({ length: DAYS }, () => MENU.map(() => 0));
    const now = Date.now();

    for (let d = 0; d < DAYS; d++) {
      const weekend = [0, 6].includes(dayStart(d).getUTCDay());
      const orders = randInt(weekend ? 45 : 28, weekend ? 70 : 50);
      for (let o = 0; o < orders; o++) {
        const at = new Date(dayStart(d).getTime() + (8 * 60 + randInt(0, 9 * 60)) * 60_000);
        if (at.getTime() > now) continue; // nothing in the future
        const id = randomUUID();
        const basket = new Map<number, number>();
        for (let k = randInt(1, 3); k > 0; k--) {
          const i = pickItem();
          basket.set(i, (basket.get(i) ?? 0) + 1);
        }
        let total = 0;
        for (const [i, qty] of basket) {
          total += MENU[i].price * qty;
          soldPerDay[d][i] += qty;
          lines.saleId.push(id);
          lines.at.push(iso(at));
          lines.item.push(menuIds[i]);
          lines.qty.push(qty);
          lines.price.push(MENU[i].price);
          lines.cost.push(MENU[i].cost);
        }
        sales.id.push(id);
        sales.at.push(iso(at));
        sales.pay.push(rand() < 0.55 ? "cash" : "debit");
        sales.total.push(total);
      }
    }

    await client.query(
      `INSERT INTO sales (id, created_at, payment_method, total_cents)
       SELECT * FROM unnest($1::uuid[], $2::timestamptz[], $3::text[], $4::int[])`,
      [sales.id, sales.at, sales.pay, sales.total],
    );
    await client.query(
      `INSERT INTO sale_items (sale_id, sale_created_at, menu_item_id, qty, unit_price_cents, unit_cost_cents)
       SELECT * FROM unnest($1::uuid[], $2::timestamptz[], $3::uuid[], $4::int[], $5::int[], $6::int[])`,
      [lines.saleId, lines.at, lines.item, lines.qty, lines.price, lines.cost],
    );

    // --- Purchases (weekly menu-item restocks) + matching "inventory" expenses --
    let purchaseCount = 0;
    for (let d = 3; d < DAYS; d += 7) {
      const weekSold = MENU.map((_, i) =>
        soldPerDay.slice(Math.max(0, d - 6), d + 1).reduce((s, day) => s + day[i], 0),
      );
      for (let i = 0; i < MENU.length; i++) {
        const qty = Math.max(6, Math.round(weekSold[i] * 1.1));
        const totalCost = qty * MENU[i].cost;
        const at = new Date(dayStart(d).getTime() + 7 * 3_600_000);
        if (at.getTime() > now) continue;
        await client.query(
          `INSERT INTO purchases (menu_item_id, qty, total_cost_cents, payment_method, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [menuIds[i], qty, totalCost, i % 2 === 0 ? "debit" : "cash", iso(at)],
        );
        await client.query(
          `INSERT INTO expenses (type, amount_cents, date) VALUES ('inventory', $1, $2)`,
          [totalCost, dateOnly(at)],
        );
        purchaseCount++;
      }
    }

    // --- Rent + salary on the 1st of each month in range -------------------
    for (let d = 0; d < DAYS; d++) {
      if (dayStart(d).getUTCDate() === 1) {
        await client.query(
          `INSERT INTO expenses (type, amount_cents, date) VALUES ('rent', 50000, $1), ('salary', 30000, $1)`,
          [dateOnly(dayStart(d))],
        );
      }
    }
    await client.query(
      `INSERT INTO expenses (type, amount_cents, date) VALUES ('other', 1800, $1), ('other', 3500, $2)`,
      [dateOnly(dayStart(9)), dateOnly(dayStart(21))],
    );

    // --- Back-room inventory + stock ledger ---------------------------------
    // Ledger = opening stock + weekly purchases - daily use - occasional waste.
    // The opening amount is solved so the ledger sums exactly to `finalStock`.
    let movementCount = 0;
    for (const item of INVENTORY) {
      const mv = { at: [] as string[], qty: [] as number[], reason: [] as string[] };
      const add = (at: Date, qty: number, reason: string) => {
        const q = Math.round(qty * 100) / 100;
        if (q === 0 || at.getTime() > now) return;
        mv.at.push(iso(at));
        mv.qty.push(q);
        mv.reason.push(reason);
      };

      let net = 0; // everything after opening
      for (let d = 0; d < DAYS; d++) {
        const weekend = [0, 6].includes(dayStart(d).getUTCDay());
        // Whole units only (bags, cartons...): round the daily average up or down at random.
        const use = Math.floor(item.daily * (weekend ? 1.3 : 1) * (0.8 + rand() * 0.4) + rand());
        const at = new Date(dayStart(d).getTime() + 18 * 3_600_000);
        add(at, -use, "use");
        net -= use;
        if (rand() < 0.04) {
          const waste = Math.max(1, Math.round(item.daily * 0.5));
          add(new Date(at.getTime() + 600_000), -waste, "waste");
          net -= waste;
        }
        if (d % 7 === 2) {
          const buy = Math.max(1, Math.ceil(item.daily * 7));
          add(new Date(dayStart(d).getTime() + 7 * 3_600_000), buy, "purchase");
          net += buy;
        }
      }
      const opening = item.finalStock - net;
      // Opening stock (a zero opening needs no ledger row; a negative one is an adjustment).
      const openingAt = iso(new Date(dayStart(0).getTime() + 6 * 3_600_000));
      const opening_ =
        opening === 0 ? null : { qty: opening, reason: opening > 0 ? "purchase" : "adjustment" };

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO inventory_items (name, category, unit, stock, reorder_level, unit_cost_cents, image_public_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          item.name,
          item.category,
          item.unit,
          item.finalStock,
          item.reorder,
          item.unitCost,
          `kwhab/inventory/${item.name.toLowerCase().replace(/\s+/g, "-")}`,
        ],
      );
      const itemId = rows[0].id;
      await client.query(
        `INSERT INTO stock_movements (inventory_item_id, created_at, change_qty, reason)
         SELECT $1, * FROM unnest($2::timestamptz[], $3::numeric[], $4::text[])`,
        [
          itemId,
          [...(opening_ ? [openingAt] : []), ...mv.at],
          [...(opening_ ? [opening_.qty] : []), ...mv.qty],
          [...(opening_ ? [opening_.reason] : []), ...mv.reason],
        ],
      );
      movementCount += mv.at.length + (opening_ ? 1 : 0);
    }

    // Commit first: refresh_continuous_aggregate cannot run inside a transaction.
    await client.query("COMMIT");
    // Materialize only COMPLETED buckets. The current day/hour stays un-materialized, which is what
    // lets the real-time aggregates add today's new sales on top automatically.
    const bucketEnd = {
      sales_daily: "date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
      item_daily: "date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
      sales_hourly: "date_trunc('hour', now())",
    };
    for (const [view, end] of Object.entries(bucketEnd)) {
      await client.query(`CALL refresh_continuous_aggregate('${view}', NULL, ${end})`);
    }

    // Compress chunks older than a week now (the policy would do it within the hour) so the
    // compression numbers are real straight after seeding.
    const { rows: oldChunks } = await client.query<{ chunk: string }>(
      `SELECT format('%I.%I', chunk_schema, chunk_name) AS chunk
         FROM timescaledb_information.chunks
        WHERE hypertable_name IN ('sales', 'sale_items', 'stock_movements')
          AND range_end < now() - interval '7 days' AND NOT is_compressed`,
    );
    for (const { chunk } of oldChunks) {
      await client.query(`CALL convert_to_columnstore('${chunk}', if_not_columnstore => true)`);
    }

    console.log(
      `Seeded ${MENU.length} menu items, ${INVENTORY.length} inventory items, ${sales.id.length} sales ` +
        `(${lines.qty.length} lines), ${purchaseCount} purchases, ${movementCount} stock movements.`,
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

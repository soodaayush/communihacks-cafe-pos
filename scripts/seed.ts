// Fills the database with ~30 days of fake cafe history. All data is fake.
// Run: npm run db:seed        (DESTRUCTIVE: wipes these tables first, then re-fills them)
//
// Drinks are made to order from back-room ingredients (the recipes table): every seeded drink sale
// takes its ingredients out of the back room, exactly like a real sale does (src/lib/sales.ts).
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { sizePriceCents } from "../src/lib/sizes";

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

type Size = "S" | "M" | "L";
const SIZES: Size[] = ["S", "M", "L"];
const pickSize = (): Size => {
  const r = rand();
  return r < 0.4 ? "S" : r < 0.8 ? "M" : "L";
};

// Things customers buy. `popularity` is a weight for how often it lands in an order.
// Food sits on the shelf (finalStock = how many are left today). Drinks have no shelf stock: they
// are made from ingredients, and `reorder` is "running low" in small drinks we can still make.
const MENU = [
  {
    name: "Coffee",
    category: "drink",
    price: 200,
    cost: 0,
    popularity: 10,
    finalStock: 0,
    reorder: 15,
  },
  {
    name: "Tea",
    category: "drink",
    price: 150,
    cost: 0,
    popularity: 5,
    finalStock: 0,
    reorder: 15,
  },
  {
    name: "Hot Chocolate",
    category: "drink",
    price: 250,
    cost: 0,
    popularity: 4,
    finalStock: 0,
    reorder: 15,
  },
  {
    name: "Juice",
    category: "drink",
    price: 200,
    cost: 0,
    popularity: 4,
    finalStock: 0,
    reorder: 15,
  },
  {
    name: "Lemonade",
    category: "drink",
    price: 200,
    cost: 0,
    popularity: 4,
    finalStock: 0,
    reorder: 15,
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
    finalStock: 0, // sold out on purpose: shows the red "Need to buy" state
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

// The back room. `unit` is what stock counts; you buy it in packs (`pack`, `packSize` units, `cost`
// cents each). Drink ingredients are measured (g, ml, oranges) and have a `full` container for "% full".
//   fromSales: used by drinks (recipes below), restocked every week back up to `refillTo`
//   daily:     not tied to a menu item, so its use is estimated per day
interface Supply {
  name: string;
  category: "ingredient" | "packaging" | "supply";
  unit: string;
  pack: string;
  packSize: number;
  cost: number;
  reorder: number;
  full?: number;
  refillTo?: number;
  daily?: number;
  finalStock?: number;
}
const INVENTORY: Supply[] = [
  // Drink ingredients: measured, with a full container.
  {
    name: "Coffee beans",
    category: "ingredient",
    unit: "g",
    pack: "bags",
    packSize: 1000,
    cost: 1800,
    full: 4000,
    reorder: 700,
  },
  {
    name: "Tea leaves",
    category: "ingredient",
    unit: "g",
    pack: "tins",
    packSize: 250,
    cost: 700,
    full: 750,
    reorder: 100,
  },
  {
    name: "Cocoa powder",
    category: "ingredient",
    unit: "g",
    pack: "bags",
    packSize: 1000,
    cost: 900,
    full: 3000,
    reorder: 400,
  },
  {
    name: "Milk",
    category: "ingredient",
    unit: "ml",
    pack: "cartons",
    packSize: 2000,
    cost: 450,
    full: 24000,
    reorder: 4000,
  },
  {
    name: "Lemonade",
    category: "ingredient",
    unit: "ml",
    pack: "bottles",
    packSize: 5000,
    cost: 900,
    full: 28000,
    reorder: 4000,
  },
  {
    name: "Oranges",
    category: "ingredient",
    unit: "oranges",
    pack: "crates",
    packSize: 40,
    cost: 2000,
    full: 200,
    reorder: 60,
  },
  // Sugar comes in single pouches, so it is counted in pouches. Coffee and hot chocolate take more
  // pouches in bigger cups. Bought in boxes of 500.
  {
    name: "Sugar",
    category: "ingredient",
    unit: "pouches",
    pack: "boxes",
    packSize: 500,
    cost: 600,
    full: 1000,
    reorder: 150,
  },
  // Every drink goes in a cup with a lid: counted, used by sales too. "Low" is about one busy day's
  // worth (about 50 a day), not a week's.
  {
    name: "Paper cups",
    category: "packaging",
    unit: "units",
    pack: "sleeves",
    packSize: 50,
    cost: 400,
    refillTo: 600,
    reorder: 60,
  },
  {
    name: "Cup lids",
    category: "packaging",
    unit: "units",
    pack: "sleeves",
    packSize: 50,
    cost: 200,
    refillTo: 500,
    reorder: 60,
  },
  // Kitchen and supplies: counted, use estimated per day.
  // Out of stock on purpose, so the red "Need to buy" state is visible in the data.
  {
    name: "Eggs",
    category: "ingredient",
    unit: "cartons",
    pack: "cartons",
    packSize: 1,
    cost: 450,
    daily: 1.2,
    finalStock: 0,
    reorder: 4,
  },
  {
    name: "Bread",
    category: "ingredient",
    unit: "units",
    pack: "units",
    packSize: 1,
    cost: 300,
    daily: 3,
    finalStock: 10,
    reorder: 6,
  },
];

// What one drink of each size uses, in the ingredient's unit: [small, medium, large].
const CUP_AND_LID: [string, number[]][] = [
  ["Paper cups", [1, 1, 1]],
  ["Cup lids", [1, 1, 1]],
];
const RECIPES: Record<string, [string, number[]][]> = {
  Coffee: [["Coffee beans", [14, 18, 22]], ["Sugar", [1, 2, 3]], ...CUP_AND_LID],
  Tea: [["Tea leaves", [2, 3, 4]], ...CUP_AND_LID],
  "Hot Chocolate": [
    ["Cocoa powder", [15, 20, 25]],
    ["Milk", [200, 300, 400]],
    ["Sugar", [1, 2, 3]],
    ...CUP_AND_LID,
  ],
  Juice: [["Oranges", [2, 3, 4]], ...CUP_AND_LID], // freshly squeezed
  Lemonade: [["Lemonade", [250, 350, 500]], ...CUP_AND_LID],
};

const supplyByName = new Map(INVENTORY.map((s) => [s.name, s]));
const recipeFor = (drink: string, size: Size) =>
  (RECIPES[drink] ?? []).map(([name, amounts]) => ({ name, qty: amounts[SIZES.indexOf(size)] }));
/** What the ingredients of one drink cost, in cents (pack price / pack size x amount). */
const drinkCost = (drink: string, size: Size) =>
  Math.round(
    recipeFor(drink, size).reduce((sum, r) => {
      const s = supplyByName.get(r.name)!;
      return sum + (r.qty * s.cost) / s.packSize;
    }, 0),
  );

const iso = (d: Date) => d.toISOString();
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

// The café is in Kitchener-Waterloo (Eastern time). Sales are stored in UTC and the app shows hours on
// the tablet's own clock, converted with standard time (UTC-5) all year, so the seed does the same:
// "open 8am to 5pm" is 13:00-22:00 UTC and reads as 8am-5pm on a tablet there.
const TORONTO_STANDARD_OFFSET_HOURS = -5;
const torontoTime = (day: Date, minutes: number) =>
  new Date(day.getTime() + minutes * 60_000 - TORONTO_STANDARD_OFFSET_HOURS * 3_600_000);

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
  const now = Date.now();

  try {
    // Wipe first, in its own transaction. TRUNCATE does not clear the continuous aggregates, so refresh
    // them while the source tables are empty: that deletes any stale rollups (and resets their watermark,
    // otherwise a leftover "today" bucket would hide new sales from the real-time aggregates).
    await client.query(
      "TRUNCATE recipes, sale_items, sales, stock_movements, purchases, expenses, inventory_items, menu_items RESTART IDENTITY CASCADE",
    );
    for (const view of ["sales_daily", "sales_hourly", "item_daily"]) {
      await client.query(`CALL refresh_continuous_aggregate('${view}', NULL, NULL)`);
    }

    await client.query("BEGIN");

    // --- Sales + sale_items (generated first: drink sales decide how much of each ingredient was used)
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
      item: [] as number[], // index into MENU, swapped for the id after insert
      qty: [] as number[],
      price: [] as number[],
      cost: [] as number[],
      size: [] as (Size | null)[],
    };
    const soldPerDay: number[][] = Array.from({ length: DAYS }, () => MENU.map(() => 0));
    // How much of each ingredient the day's drinks used.
    const usedPerDay: Map<string, number>[] = Array.from({ length: DAYS }, () => new Map());
    const lastSaleAt: (Date | null)[] = Array.from({ length: DAYS }, () => null);

    for (let d = 0; d < DAYS; d++) {
      const weekend = [0, 6].includes(dayStart(d).getUTCDay());
      const orders = randInt(weekend ? 45 : 28, weekend ? 70 : 50);
      for (let o = 0; o < orders; o++) {
        const at = torontoTime(dayStart(d), 8 * 60 + randInt(0, 9 * 60));
        if (at.getTime() > now) continue; // nothing in the future
        if (!lastSaleAt[d] || at > lastSaleAt[d]!) lastSaleAt[d] = at;
        const id = randomUUID();
        // item index + size -> qty
        const basket = new Map<string, { i: number; size: Size | null; qty: number }>();
        for (let k = randInt(1, 3); k > 0; k--) {
          const i = pickItem();
          const size = MENU[i].category === "drink" ? pickSize() : null;
          const key = `${i}|${size}`;
          basket.set(key, { i, size, qty: (basket.get(key)?.qty ?? 0) + 1 });
        }
        let total = 0;
        for (const { i, size, qty } of basket.values()) {
          const m = MENU[i];
          const price = sizePriceCents(m.price, size ?? undefined);
          total += price * qty;
          soldPerDay[d][i] += qty;
          lines.saleId.push(id);
          lines.at.push(iso(at));
          lines.item.push(i);
          lines.qty.push(qty);
          lines.price.push(price);
          lines.cost.push(size ? drinkCost(m.name, size) : m.cost);
          lines.size.push(size);
          if (size) {
            for (const r of recipeFor(m.name, size)) {
              usedPerDay[d].set(r.name, (usedPerDay[d].get(r.name) ?? 0) + r.qty * qty);
            }
          }
        }
        sales.id.push(id);
        sales.at.push(iso(at));
        sales.pay.push(rand() < 0.55 ? "cash" : "debit");
        sales.total.push(total);
      }
    }

    // --- Menu items -----------------------------------------------------------
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
          m.category === "drink" ? drinkCost(m.name, "S") : m.cost,
          m.finalStock,
          m.reorder,
        ],
      );
      menuIds.push(rows[0].id);
    }

    await client.query(
      `INSERT INTO sales (id, created_at, payment_method, total_cents)
       SELECT * FROM unnest($1::uuid[], $2::timestamptz[], $3::text[], $4::int[])`,
      [sales.id, sales.at, sales.pay, sales.total],
    );
    await client.query(
      `INSERT INTO sale_items (sale_id, sale_created_at, menu_item_id, qty, unit_price_cents, unit_cost_cents, size)
       SELECT * FROM unnest($1::uuid[], $2::timestamptz[], $3::uuid[], $4::int[], $5::int[], $6::int[], $7::text[])`,
      [
        lines.saleId,
        lines.at,
        lines.item.map((i) => menuIds[i]),
        lines.qty,
        lines.price,
        lines.cost,
        lines.size,
      ],
    );

    // --- Food restocks (weekly) + matching "inventory" expenses ---------------
    let purchaseCount = 0;
    for (let d = 3; d < DAYS; d += 7) {
      for (let i = 0; i < MENU.length; i++) {
        if (MENU[i].category === "drink") continue; // drinks are made, not bought ready
        const weekSold = soldPerDay
          .slice(Math.max(0, d - 6), d + 1)
          .reduce((s, day) => s + day[i], 0);
        const qty = Math.max(6, Math.round(weekSold * 1.1));
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

    // --- Rent + salary on the 1st of each month in range ----------------------
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

    // --- Back room + stock ledger -------------------------------------------
    // Every change is a stock_movements row, so each item's stock is exactly the sum of its ledger:
    // opening amount, weekly deliveries ("purchase", also an expense), and what was used ("use").
    let movementCount = 0;
    const supplyIds = new Map<string, string>();
    for (const item of INVENTORY) {
      const mv = { at: [] as string[], qty: [] as number[], reason: [] as string[] };
      const add = (at: Date, qty: number, reason: string) => {
        const q = Math.round(qty * 100) / 100;
        if (q === 0 || at.getTime() > now) return;
        mv.at.push(iso(at));
        mv.qty.push(q);
        mv.reason.push(reason);
      };
      const buy = async (at: Date, packs: number) => {
        if (packs <= 0 || at.getTime() > now) return 0;
        add(at, packs * item.packSize, "purchase");
        await client.query(
          `INSERT INTO expenses (type, amount_cents, date) VALUES ('inventory', $1, $2)`,
          [packs * item.cost, dateOnly(at)],
        );
        return packs * item.packSize;
      };
      const openingAt = new Date(dayStart(0).getTime() + 6 * 3_600_000);
      let stock: number;

      if (item.daily === undefined) {
        // Used by drinks: what the seeded sales took, restocked weekly up to the top in whole packs.
        const top = item.full ?? item.refillTo!;
        stock = Math.round(top * 0.8);
        add(openingAt, stock, "adjustment");
        for (let d = 0; d < DAYS; d++) {
          if (d % 7 === 2) {
            const packs = Math.floor((top - stock) / item.packSize);
            stock += await buy(new Date(dayStart(d).getTime() + 7 * 3_600_000), packs);
          }
          const used = Math.min(stock, usedPerDay[d].get(item.name) ?? 0);
          // Logged once a day, after the last sale of the day.
          const at = lastSaleAt[d] ? new Date(lastSaleAt[d]!.getTime() + 60_000) : null;
          if (at && used > 0) {
            add(at, -used, "use");
            stock -= used;
          }
        }
      } else {
        // Not tied to a menu item: estimated daily use, opening solved so today's count is finalStock.
        let net = 0;
        for (let d = 0; d < DAYS; d++) {
          const weekend = [0, 6].includes(dayStart(d).getUTCDay());
          const use = Math.floor(item.daily * (weekend ? 1.3 : 1) * (0.8 + rand() * 0.4) + rand());
          const at = new Date(dayStart(d).getTime() + 18 * 3_600_000);
          add(at, -use, "use");
          if (at.getTime() <= now) net -= use;
          if (rand() < 0.04) {
            const waste = Math.max(1, Math.round(item.daily * 0.5));
            const wasteAt = new Date(at.getTime() + 600_000);
            add(wasteAt, -waste, "waste");
            if (wasteAt.getTime() <= now) net -= waste;
          }
          if (d % 7 === 2) {
            net += await buy(
              new Date(dayStart(d).getTime() + 7 * 3_600_000),
              Math.max(1, Math.ceil(item.daily * 7)),
            );
          }
        }
        const opening = item.finalStock! - net;
        if (opening !== 0) {
          mv.at.unshift(iso(openingAt));
          mv.qty.unshift(opening);
          mv.reason.unshift("adjustment");
        }
        stock = item.finalStock!;
      }

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO inventory_items
           (name, category, unit, stock, reorder_level, unit_cost_cents, image_public_id, pack_name, pack_size, full_qty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          item.name,
          item.category,
          item.unit,
          stock,
          item.reorder,
          item.cost,
          `kwhab/inventory/${item.name.toLowerCase().replace(/\s+/g, "-")}`,
          item.pack,
          item.packSize,
          item.full ?? null,
        ],
      );
      supplyIds.set(item.name, rows[0].id);
      await client.query(
        `INSERT INTO stock_movements (inventory_item_id, created_at, change_qty, reason)
         SELECT $1, * FROM unnest($2::timestamptz[], $3::numeric[], $4::text[])`,
        [rows[0].id, mv.at, mv.qty, mv.reason],
      );
      movementCount += mv.at.length;
    }

    // --- Recipes ---------------------------------------------------------------
    let recipeCount = 0;
    for (const [drink, parts] of Object.entries(RECIPES)) {
      const menuId = menuIds[MENU.findIndex((m) => m.name === drink)];
      for (const [name, amounts] of parts) {
        for (const [k, size] of SIZES.entries()) {
          await client.query(
            `INSERT INTO recipes (menu_item_id, size, inventory_item_id, qty) VALUES ($1, $2, $3, $4)`,
            [menuId, size, supplyIds.get(name), amounts[k]],
          );
          recipeCount++;
        }
      }
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
      `Seeded ${MENU.length} menu items, ${INVENTORY.length} back-room items, ${recipeCount} recipe lines, ` +
        `${sales.id.length} sales (${lines.qty.length} lines), ${purchaseCount} food restocks, ` +
        `${movementCount} stock movements.`,
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

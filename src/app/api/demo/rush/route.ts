import { HttpError, dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import type { RushResult } from "@/lib/demo-types";
import { createSale } from "@/lib/sales";
import type { PaymentMethod } from "@/lib/types";

// POST /api/demo/rush  { count?: 1-100 (default 20) }
// Rings up a burst of random sales through the real sale path (hypertable inserts, stock decrement),
// so the dashboards, aggregates and restock forecast visibly move during a live demo.
// Disabled when DEMO_MODE=off.
export function POST(request: Request) {
  return dbOrMock<RushResult>(
    () => ({ created: 0, moneyInCents: 0 }),
    async () => {
      if (process.env.DEMO_MODE === "off") throw new HttpError("Demo mode is off", 403);
      const body = await request.json().catch(() => ({}));
      const count = Number.isInteger(body?.count) ? Math.min(Math.max(body.count, 1), 100) : 20;

      const menu = await query<{ id: string }>(`SELECT id FROM menu_items`);
      if (menu.length === 0) throw new HttpError("No menu items. Run npm run db:seed.", 409);

      const orders = Array.from({ length: count }, () => {
        const basket = new Map<string, number>();
        for (let k = 1 + Math.floor(Math.random() * 3); k > 0; k--) {
          const id = menu[Math.floor(Math.random() * menu.length)].id;
          basket.set(id, (basket.get(id) ?? 0) + 1);
        }
        const pay: PaymentMethod = Math.random() < 0.55 ? "cash" : "debit";
        return { pay, basket };
      });

      // 4 at a time: the connection pool holds 5.
      let moneyInCents = 0;
      for (let i = 0; i < orders.length; i += 4) {
        const sales = await Promise.all(
          orders.slice(i, i + 4).map((o) => createSale(o.pay, o.basket)),
        );
        moneyInCents += sales.reduce((sum, s) => sum + s.totalCents, 0);
      }
      return { created: count, moneyInCents };
    },
    201,
  );
}

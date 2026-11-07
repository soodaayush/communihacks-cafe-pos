// Server-only. Menu + how many of each item sell per day (average of the last 7 days).
import { hasDb, query } from "./db";
import { mockItemSales, mockMenu } from "./mock-data";
import { listMenu } from "./queries";
import type { MenuItem } from "./types";

export interface WhatIfData {
  menu: MenuItem[];
  soldPerDay: Record<string, number>;
}

const DAYS = 7;

export async function getWhatIfData(): Promise<WhatIfData> {
  if (!hasDb()) {
    const soldPerDay: Record<string, number> = {};
    for (const p of mockItemSales("week")) {
      soldPerDay[p.menuItemId] = (soldPerDay[p.menuItemId] ?? 0) + p.qtySold / DAYS;
    }
    return { menu: mockMenu, soldPerDay };
  }

  const [menu, rows] = await Promise.all([
    listMenu(),
    query<{ menuItemId: string; sold: number }>(
      `SELECT menu_item_id AS "menuItemId", sum(qty)::int AS sold
         FROM sale_items
        WHERE sale_created_at >= now() - $1 * interval '1 day'
        GROUP BY 1`,
      [DAYS],
    ),
  ]);
  return {
    menu,
    soldPerDay: Object.fromEntries(rows.map((r) => [r.menuItemId, r.sold / DAYS])),
  };
}

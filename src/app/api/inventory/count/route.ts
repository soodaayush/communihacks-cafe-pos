import { HttpError, dbOrMock, isCount, isUuid, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { mockMenu } from "@/lib/mock-data";
import type { MenuItem } from "@/lib/types";

// POST /api/inventory/count  { menuItemId, stock }  ->  the updated MenuItem
// Records how many of a shelf item there really are right now (a stock count).
export function POST(request: Request) {
  return dbOrMock<MenuItem>(
    () => mockMenu[0],
    async () => {
      const { menuItemId, stock } = await readJson(request);
      if (!isUuid(menuItemId)) throw new HttpError("menuItemId must be a uuid");
      if (!isCount(stock)) throw new HttpError("stock must be a whole number from 0 to 99999");

      return withTransaction(async (client) => {
        const { rows } = await client.query<MenuItem>(
          `UPDATE menu_items SET stock = $2 WHERE id = $1
       RETURNING id, name, image_public_id AS "imagePublicId", category,
                 price_cents AS "priceCents", cost_cents AS "costCents",
                 stock, reorder_level AS "reorderLevel"`,
          [menuItemId, stock],
        );
        if (!rows[0]) throw new HttpError("No such menu item", 404);
        return rows[0];
      });
    },
  );
}

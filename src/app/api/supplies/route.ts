import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockSupplies } from "@/lib/mock-data";
import type { InventoryItem } from "@/lib/types";

// Back-room inventory: ingredients, packaging and supplies. Low stock sorts first.
export function GET() {
  return dbOrMock(
    () => mockSupplies,
    () =>
      query<InventoryItem>(
        `SELECT id,
                name,
                image_public_id AS "imagePublicId",
                category,
                unit,
                stock::float8         AS stock,
                reorder_level::float8 AS "reorderLevel",
                unit_cost_cents       AS "unitCostCents"
           FROM inventory_items
          ORDER BY (stock <= reorder_level) DESC, category, name`,
      ),
  );
}

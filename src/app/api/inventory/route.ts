import { mockMenu } from "@/lib/mock-data";
import type { MenuItem } from "@/lib/types";

// TODO(dev1): SELECT menu_items with current stock and reorder_level.
export function GET() {
  return Response.json(mockMenu satisfies MenuItem[]);
}

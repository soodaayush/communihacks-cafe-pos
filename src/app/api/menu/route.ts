import { mockMenu } from "@/lib/mock-data";
import type { MenuItem } from "@/lib/types";

// TODO(dev1): SELECT from menu_items.
export function GET() {
  return Response.json(mockMenu satisfies MenuItem[]);
}

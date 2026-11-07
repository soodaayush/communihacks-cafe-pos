import { dbOrMock } from "@/lib/api";
import { mockMenu } from "@/lib/mock-data";
import { listMenu } from "@/lib/queries";

// Menu items with current stock and reorder level. Back-room stock lives at /api/supplies.
export function GET() {
  return dbOrMock(() => mockMenu, listMenu);
}

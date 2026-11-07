import { dbOrMock } from "@/lib/api";
import { mockSupplies } from "@/lib/mock-data";
import { listSupplies } from "@/lib/queries";

// Back-room inventory: drink ingredients (measured), plus packaging and supplies. Low ones first.
export function GET() {
  return dbOrMock(() => mockSupplies, listSupplies);
}

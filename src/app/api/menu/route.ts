import { dbOrMock } from "@/lib/api";
import { mockMenu } from "@/lib/mock-data";
import { listMenu } from "@/lib/queries";

export function GET() {
  return dbOrMock(() => mockMenu, listMenu);
}

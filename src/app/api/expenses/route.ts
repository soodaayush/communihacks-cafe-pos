import { mockExpenses } from "@/lib/mock-data";
import type { Expense } from "@/lib/types";

// TODO(dev1): SELECT from expenses.
export function GET() {
  return Response.json(mockExpenses satisfies Expense[]);
}

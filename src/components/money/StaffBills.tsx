import { SpeakButton } from "@/components/voice/SpeakButton";
import { formatCents } from "@/lib/money";
import type { Expense, ExpenseType } from "@/lib/types";

const BILL: Record<ExpenseType, string> = {
  inventory: "Buying stock",
  rent: "Rent",
  salary: "Wages",
  other: "Other",
};

/**
 * Rent, wages and stock orders: a staff topic, folded away so the cashier's screen stays about
 * one idea. A support worker can open it to talk it through.
 */
export function StaffBills({ label, expenses }: { label: string; expenses: Expense[] }) {
  const byType = new Map<ExpenseType, number>();
  for (const e of expenses) byType.set(e.type, (byType.get(e.type) ?? 0) + e.amountCents);
  const total = [...byType.values()].reduce((a, b) => a + b, 0);

  const speechText =
    byType.size === 0
      ? `No bills paid ${label.toLowerCase()}.`
      : `Bills paid ${label.toLowerCase()}: ` +
        [...byType].map(([type, cents]) => `${BILL[type]}: ${formatCents(cents)}`).join(". ") +
        `. Total bills: ${formatCents(total)}.`;

  return (
    <details className="rounded-tile bg-white/60 px-5 py-3 ring-1 ring-ink/10">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between text-lg font-semibold text-ink-soft">
        <span>For staff: bills paid {label.toLowerCase()}</span>
        <SpeakButton text={speechText} size="sm" label="Read staff bills" />
      </summary>
      {byType.size === 0 ? (
        <p className="pb-2 text-lg">No bills paid.</p>
      ) : (
        <ul className="flex flex-col gap-1 pb-2 text-lg">
          {[...byType].map(([type, cents]) => (
            <li key={type} className="flex justify-between tabular-nums">
              <span>{BILL[type]}</span>
              <span>{formatCents(cents)}</span>
            </li>
          ))}
          <li className="mt-1 flex justify-between border-t border-ink/10 pt-1 font-bold tabular-nums">
            <span>Total</span>
            <span>{formatCents(total)}</span>
          </li>
        </ul>
      )}
    </details>
  );
}

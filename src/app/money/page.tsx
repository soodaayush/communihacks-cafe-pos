import { connection } from "next/server";
import { Suspense } from "react";
import { InsightList } from "@/components/insights/InsightList";
import { BoughtList } from "@/components/money/BoughtList";
import { MoneyInHand } from "@/components/money/MoneyInHand";
import { PaidVsBought } from "@/components/money/PaidVsBought";
import { RANGE_LABEL, RangeTabs, type MoneyRange } from "@/components/money/RangeTabs";
import { StaffBills } from "@/components/money/StaffBills";
import { getBought, getExpenses, getFlowByDay } from "@/lib/money-data";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// Customers paid − we bought = in hand. Then each day side by side, and what we bought.
// Loaded on the server (no loading flash); the tip streams in.
export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: raw } = await searchParams;
  const range: MoneyRange = raw === "week" ? "week" : "day";
  const days = range === "day" ? 1 : 7;
  await connection();
  const [week, bought, expenses] = await Promise.all([
    getFlowByDay(7),
    getBought(days),
    getExpenses(days),
  ]);
  const period = week.slice(0, days); // newest first: today is the first row

  // Two rows of two cards; cards in a row start together and share a height. One column on phones.
  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <RangeTabs range={range} />
      <div className="grid gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:content-start lg:gap-6 lg:overflow-y-auto lg:p-1">
        <MoneyInHand
          label={RANGE_LABEL[range]}
          inCents={sum(period.map((d) => d.inCents))}
          boughtCents={sum(period.map((d) => d.boughtCents))}
        />
        <PaidVsBought days={week} />
        <BoughtList label={RANGE_LABEL[range]} lines={bought} />
        <div className="flex flex-col gap-4 self-start">
          <section className="flex flex-col gap-3 rounded-tile bg-white p-5 ring-1 ring-ink/10">
            <h2 className="text-2xl font-bold">Tip</h2>
            <Suspense fallback={<p className="h-20 text-lg text-ink-soft">Thinking…</p>}>
              <InsightList range={range} limit={1} />
            </Suspense>
          </section>
          <StaffBills label={RANGE_LABEL[range]} expenses={expenses} />
        </div>
      </div>
    </div>
  );
}

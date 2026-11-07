import { connection } from "next/server";
import { Suspense } from "react";
import { InsightList } from "@/components/insights/InsightList";
import { DayBars } from "@/components/money/DayBars";
import { MoneyInOutLeft } from "@/components/money/MoneyInOutLeft";
import { RANGE_LABEL, RangeTabs, type MoneyRange } from "@/components/money/RangeTabs";
import { StaffBills } from "@/components/money/StaffBills";
import { getExpenses, getKeptByDay } from "@/lib/money-data";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// One idea, the same one as What-if: customers pay you; part of it pays for making what they
// bought; the rest you keep. Today first. Loaded on the server (no loading flash); the tip streams in.
export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: raw } = await searchParams;
  const range: MoneyRange = raw === "week" ? "week" : "day";
  await connection();
  const [week, expenses] = await Promise.all([
    getKeptByDay(7),
    getExpenses(range === "day" ? 1 : 7),
  ]);
  const period = range === "day" ? week.slice(0, 1) : week;

  // Tabs on their own row, then a 2-column grid: the two main cards share a row, so they start
  // on the same line and stretch to the same height. On a phone it is one column, same order.
  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <RangeTabs range={range} />
      <div className="grid gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:content-start lg:gap-6 lg:overflow-y-auto lg:p-1">
        <MoneyInOutLeft
          label={RANGE_LABEL[range]}
          inCents={sum(period.map((d) => d.inCents))}
          costCents={sum(period.map((d) => d.costCents))}
        />
        <DayBars days={week} />
        <div className="self-start">
          <StaffBills label={RANGE_LABEL[range]} expenses={expenses} />
        </div>
        <section className="flex flex-col gap-3 rounded-tile bg-white p-5 ring-1 ring-ink/10">
          <h2 className="text-2xl font-bold">Tip</h2>
          <Suspense fallback={<p className="h-20 text-lg text-ink-soft">Thinking…</p>}>
            <InsightList range={range} limit={1} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

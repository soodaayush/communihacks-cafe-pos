import { connection } from "next/server";
import { Suspense } from "react";
import { InsightList } from "@/components/insights/InsightList";
import { BillsCover } from "@/components/money/BillsCover";
import { BillsDonut } from "@/components/money/BillsDonut";
import { BoughtList } from "@/components/money/BoughtList";
import { MoneyInHand } from "@/components/money/MoneyInHand";
import { MonthLeftover } from "@/components/money/MonthLeftover";
import { PaidVsBought } from "@/components/money/PaidVsBought";
import { RANGE_LABEL, RangeTabs, type MoneyRange } from "@/components/money/RangeTabs";
import { StaffBills } from "@/components/money/StaffBills";
import { getBudgetMonths } from "@/lib/budget";
import { getBought, getExpenses, getFlowByDay } from "@/lib/money-data";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const GRID =
  "grid gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:content-start lg:gap-6 lg:overflow-y-auto lg:p-1";

// Today / This week: customers paid − we bought = in hand, each day side by side, what we bought.
// This month: the monthly picture as charts (leftover carried in, where the money went, covering
// the bills). Loaded on the server (no loading flash); the tip streams in.
export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: raw } = await searchParams;
  const range: MoneyRange = raw === "week" || raw === "month" ? raw : "day";
  await connection();

  if (range === "month") {
    const months = await getBudgetMonths();
    return (
      <div className="flex flex-col gap-4 lg:h-full">
        <RangeTabs range={range} />
        <div className={GRID}>
          <MonthLeftover months={months} />
          <BillsDonut month={months.at(-1)} />
          <BillsCover month={months.at(-1)} />
        </div>
      </div>
    );
  }

  const days = range === "day" ? 1 : 7;
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
      <div className={GRID}>
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

"use client";

import Image from "next/image";
import { BusyDays } from "@/components/stock/BusyDays";
import { BusyHours } from "@/components/stock/BusyHours";
import { imageUrl } from "@/lib/integrations/cloudinary";
import type { MenuItem, TrendPoint } from "@/lib/types";

// Everything about what sells and when, in three simple pictures:
// best sellers, busy hours, busy days. All of it comes from Tiger Data.

function BestSellers({ menu, trends }: { menu: MenuItem[]; trends: TrendPoint[] }) {
  const dates = [...new Set(trends.map((t) => t.date))].sort();
  const last4Weeks = new Set(dates.slice(-28));
  const sold = menu
    .map((m) => ({
      item: m,
      qty: trends
        .filter((t) => t.menuItemId === m.id && last4Weeks.has(t.date))
        .reduce((s, t) => s + t.qtySold, 0),
    }))
    .sort((a, b) => b.qty - a.qty);
  const maxSold = Math.max(1, ...sold.map((s) => s.qty));

  return (
    <section
      aria-labelledby="best-sellers"
      className="flex flex-col rounded-tile bg-white p-5 ring-1 ring-ink/10 lg:p-6"
    >
      <h2 id="best-sellers" className="text-2xl font-bold">
        Best sellers
      </h2>
      <p className="mb-4 text-lg text-ink-soft">How many sold in the last 4 weeks</p>
      {/* On big screens the rows spread out to use the whole card. */}
      <ol className="flex flex-1 flex-col justify-between gap-2">
        {sold.map(({ item, qty }) => (
          <li
            key={item.id}
            className="grid grid-cols-[2.5rem_8.5rem_1fr_3rem] items-center gap-2 lg:grid-cols-[3.5rem_10rem_1fr_4rem] lg:gap-3"
            title={`${item.name}: ${qty} sold`}
          >
            <Image
              src={imageUrl(item.imagePublicId, 96)}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-10 lg:size-14"
            />
            <span className="truncate text-lg lg:text-xl">{item.name}</span>
            <span className="h-5 rounded-r bg-ink/5 lg:h-7" aria-hidden>
              <span
                className="block h-full rounded-r bg-sky"
                style={{ width: `${(qty / maxSold) * 100}%` }}
              />
            </span>
            <span className="text-right text-lg font-bold tabular-nums lg:text-2xl">{qty}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Trends({ menu, trends }: { menu: MenuItem[]; trends: TrendPoint[] }) {
  return (
    <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:overflow-y-auto">
      <BestSellers menu={menu} trends={trends} />
      <div className="flex flex-col gap-6">
        <BusyHours />
        <BusyDays />
      </div>
    </div>
  );
}

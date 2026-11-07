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
      className="rounded-tile bg-white p-5 ring-1 ring-ink/10"
    >
      <h2 id="best-sellers" className="text-2xl font-bold">
        Best sellers
      </h2>
      <p className="mb-4 text-lg text-ink-soft">How many sold in the last 4 weeks</p>
      <ol className="flex flex-col gap-2">
        {sold.map(({ item, qty }) => (
          <li
            key={item.id}
            className="grid grid-cols-[2.5rem_8.5rem_1fr_3rem] items-center gap-2"
            title={`${item.name}: ${qty} sold`}
          >
            <Image
              src={imageUrl(item.imagePublicId, 96)}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-10"
            />
            <span className="truncate text-lg">{item.name}</span>
            <span className="h-5 rounded-r bg-ink/5" aria-hidden>
              <span
                className="block h-full rounded-r bg-sky"
                style={{ width: `${(qty / maxSold) * 100}%` }}
              />
            </span>
            <span className="text-right text-lg font-bold tabular-nums">{qty}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Trends({ menu, trends }: { menu: MenuItem[]; trends: TrendPoint[] }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <BestSellers menu={menu} trends={trends} />
      <div className="flex flex-col gap-6">
        <BusyHours />
        <BusyDays />
      </div>
    </div>
  );
}

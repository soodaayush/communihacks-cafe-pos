"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BackRoom } from "@/components/stock/BackRoom";
import { BusyHours } from "@/components/stock/BusyHours";
import { StockLevel } from "@/components/stock/StockLevel";
import { TigerCard } from "@/components/stock/TigerCard";
import { imageUrl } from "@/lib/integrations/cloudinary";
import type { MenuItem, RestockSuggestion, TrendPoint } from "@/lib/types";

// View only: this screen shows what is on the shelf. Buying happens outside the register.

const getJson = <T,>(url: string): Promise<T> =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));

export default function StockPage() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [restock, setRestock] = useState<RestockSuggestion[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  function load() {
    Promise.all([
      getJson<MenuItem[]>("/api/inventory"),
      getJson<RestockSuggestion[]>("/api/restock-suggestions"),
      getJson<TrendPoint[]>("/api/trends?days=28"),
    ])
      .then(([m, r, t]) => {
        setMenu(m);
        setRestock(r);
        setTrends(t);
      })
      .catch(() => setLoadFailed(true));
  }
  useEffect(load, []);

  if (!menu) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-xl">
        {loadFailed ? (
          <>
            <p>Stock did not load.</p>
            <button
              type="button"
              onClick={() => {
                setLoadFailed(false);
                load();
              }}
              className="min-h-touch rounded-tile bg-sage px-8 text-2xl font-bold"
            >
              Try again
            </button>
          </>
        ) : (
          <p className="text-ink-soft">Loading…</p>
        )}
      </div>
    );
  }

  // Selling pace = sold in the last 7 days of the trend, per day.
  const dates = [...new Set(trends.map((t) => t.date))].sort();
  const lastWeek = new Set(dates.slice(-7));
  const last4Weeks = new Set(dates.slice(-28));
  const perDay = (id: string) =>
    trends
      .filter((t) => t.menuItemId === id && lastWeek.has(t.date))
      .reduce((s, t) => s + t.qtySold, 0) / 7;

  // Items the server says to reorder (at the reorder level or running out within 3 days).
  const runningLow = new Set(restock.map((s) => s.menuItemId));
  const daysLeft = new Map(restock.map((s) => [s.menuItemId, s.daysLeft]));

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
    <div className="flex flex-col gap-6 lg:grid lg:h-full lg:grid-cols-[1fr_minmax(22rem,26rem)]">
      <div className="flex flex-col gap-6 lg:overflow-y-auto lg:pr-1">
        <section
          aria-label="Shelf"
          className="grid auto-rows-max gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          {menu.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-tile bg-white p-4 ring-1 ring-ink/10"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={imageUrl(item.imagePublicId, 96)}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="size-14"
                />
                <p className="flex-1 text-xl font-semibold">{item.name}</p>
                <p className="text-right">
                  <span className="block text-number leading-none font-bold tabular-nums">
                    {item.stock}
                  </span>
                  <span className="text-base text-ink-soft">left</span>
                </p>
              </div>
              <StockLevel
                stock={item.stock}
                reorderLevel={item.reorderLevel}
                low={runningLow.has(item.id)}
                capacity={Math.ceil(perDay(item.id) * 7)}
              />
              {daysLeft.get(item.id) !== undefined && (
                <p className="text-lg text-ink-soft">
                  ⏳{" "}
                  {daysLeft.get(item.id) === 0
                    ? "Runs out today"
                    : `About ${daysLeft.get(item.id)} ${daysLeft.get(item.id) === 1 ? "day" : "days"} left`}
                </p>
              )}
            </div>
          ))}
        </section>
        <BackRoom />
        <BusyHours />
      </div>

      <div className="flex flex-col gap-6 lg:min-h-0 lg:overflow-y-auto">
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
        <TigerCard />
      </div>
    </div>
  );
}

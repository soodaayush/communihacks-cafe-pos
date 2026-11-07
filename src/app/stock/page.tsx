"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BackRoom } from "@/components/stock/BackRoom";
import { BusyHours } from "@/components/stock/BusyHours";
import { StockLevel } from "@/components/stock/StockLevel";
import { imageUrl } from "@/lib/integrations/cloudinary";
import type { MenuItem, RestockSuggestion, TrendPoint } from "@/lib/types";

// View only: this screen shows what is on the shelf. Buying happens outside the register.

const getJson = <T,>(url: string): Promise<T> =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));

type View = "shelf" | "back" | "busy";

// One idea per view, so the screen never gets crowded.
const VIEWS: { id: View; icon: string; label: string }[] = [
  { id: "shelf", icon: "🧁", label: "Shelf" },
  { id: "back", icon: "📦", label: "In the back" },
  { id: "busy", icon: "⏰", label: "Busy times" },
];

export default function StockPage() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [restock, setRestock] = useState<RestockSuggestion[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState<View>("shelf");

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
    <div className="flex flex-col gap-6 lg:h-full">
      <div role="tablist" aria-label="Stock views" className="grid grid-cols-3 gap-3">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`flex min-h-touch items-center justify-center gap-3 rounded-tile text-xl font-semibold ring-1 ${view === v.id ? "bg-white ring-ink/15" : "bg-white/40 text-ink-soft ring-transparent"}`}
          >
            <span aria-hidden className="text-3xl">
              {v.icon}
            </span>
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {view === "shelf" && (
        <div className="flex flex-col gap-6 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_minmax(22rem,26rem)]">
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
                </div>
              ))}
            </section>
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
          </div>
        </div>
      )}
      {view === "back" && (
        <div className="w-full max-w-4xl">
          <BackRoom />
        </div>
      )}
      {view === "busy" && (
        <div className="w-full max-w-4xl">
          <BusyHours />
        </div>
      )}
    </div>
  );
}

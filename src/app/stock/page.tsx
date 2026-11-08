"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { BackRoom } from "@/components/stock/BackRoom";
import { CountButton } from "@/components/stock/CountButton";
import { CountSheet } from "@/components/stock/CountSheet";
import { StockLevel } from "@/components/stock/StockLevel";
import { Trends } from "@/components/stock/Trends";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { imageUrl } from "@/lib/images";
import type { MenuItem, RestockSuggestion, TrendPoint } from "@/lib/types";
import { playSound } from "@/lib/sounds";
import { staffFetch } from "@/lib/staff-client";

// View only: this screen shows what is on the shelf. Buying happens outside the register.

const getJson = <T,>(url: string): Promise<T> =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));

type View = "shelf" | "back" | "trends";

// One idea per view, so the screen never gets crowded.
const VIEWS: { id: View; icon: IconName; label: string }[] = [
  { id: "shelf", icon: "shelf", label: "Shelf" },
  { id: "back", icon: "crate", label: "In the back" },
  { id: "trends", icon: "chart", label: "Trends" },
];

export default function StockPage() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [restock, setRestock] = useState<RestockSuggestion[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState<View>("shelf");
  const [counting, setCounting] = useState<MenuItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function saveCount(item: MenuItem, count: number) {
    const res = await staffFetch("/api/inventory/count", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ menuItemId: item.id, stock: count }),
    });
    if (!res.ok) throw new Error("save failed");
    setCounting(null);
    playSound("success");
    setNotice(`Saved: ${item.name} ${count} left`);
    setTimeout(() => setNotice(null), 4000);
    load();
  }

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
  const perDay = (id: string) =>
    trends
      .filter((t) => t.menuItemId === id && lastWeek.has(t.date))
      .reduce((s, t) => s + t.qtySold, 0) / 7;

  // Items the server says to reorder (at the reorder level or running out within 3 days).
  const runningLow = new Set(restock.map((s) => s.menuItemId));

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
            <Icon name={v.icon} className="size-9" />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 rounded-tile bg-sage/60 p-3 text-xl font-semibold"
        >
          <Icon name="check" className="size-6" />
          {notice}
        </p>
      )}

      {view === "shelf" && (
        <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
          {/* Drinks are made to order, so the shelf only has food you can count. */}
          <div className="flex items-center justify-between text-lg text-ink-soft">
            <p className="flex items-center gap-2">
              <Icon name="crate" className="size-6" />
              Drinks are made fresh. Their ingredients are in &ldquo;In the back&rdquo;.
            </p>
            <SpeakButton
              text="Shelf stock. Drinks are made fresh, so their ingredients are kept in the back. Here you can count food on the shelf."
              size="sm"
              label="Read shelf view info"
            />
          </div>
          {/* On big screens the tiles share the whole height (never shorter than 11.5rem). */}
          <section
            aria-label="Shelf"
            className="grid auto-rows-max content-start gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1"
          >
            {menu
              .filter((item) => item.category !== "drink")
              .map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-tile bg-white p-4 ring-1 ring-ink/10 lg:p-5 2xl:p-6"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={imageUrl(item.imagePublicId)}
                      alt=""
                      width={56}
                      height={56}
                      unoptimized
                      className="size-14 lg:size-16 2xl:size-20"
                    />
                    <p className="min-w-0 flex-1 text-xl font-semibold lg:text-xl 2xl:text-2xl">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-right">
                        <span className="block text-number leading-none font-bold tabular-nums lg:text-4xl 2xl:text-[3.25rem]">
                          {item.stock}
                        </span>
                        <span className="text-base text-ink-soft lg:text-lg">left</span>
                      </p>
                      <SpeakButton
                        text={`${item.name}, ${item.stock} left on the shelf.${runningLow.has(item.id) ? " Running low!" : ""}`}
                        size="sm"
                        label={`Read stock for ${item.name}`}
                      />
                    </div>
                  </div>
                  {/* The level fills the row; the small pencil sits at the bottom-right. */}
                  <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <StockLevel
                        stock={item.stock}
                        reorderLevel={item.reorderLevel}
                        low={runningLow.has(item.id)}
                        capacity={Math.ceil(perDay(item.id) * 7)}
                      />
                    </div>
                    <CountButton name={item.name} onClick={() => setCounting(item)} />
                  </div>
                </div>
              ))}
          </section>
        </div>
      )}
      {counting && (
        <CountSheet
          key={counting.id}
          name={counting.name}
          picture={
            <Image
              src={imageUrl(counting.imagePublicId)}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="size-14"
            />
          }
          unit="left"
          current={counting.stock}
          onSave={(n) => saveCount(counting, n)}
          onClose={() => setCounting(null)}
        />
      )}
      {view === "back" && <BackRoom />}
      {view === "trends" && <Trends menu={menu} trends={trends} />}
    </div>
  );
}

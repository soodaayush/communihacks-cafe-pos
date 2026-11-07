"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { pictureOf } from "@/components/icons/supplyPicture";
import { CountSheet } from "@/components/stock/CountSheet";
import { StockLevel } from "@/components/stock/StockLevel";
import type { InventoryItem } from "@/lib/types";

// "In the back": ingredients and supplies (Tiger Data: inventory_items + the stock_movements ledger).
// Same look as the shelf: a picture, how many, and a Count button.

const getJson = <T,>(url: string): Promise<T> =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));

const amount = (n: number) => String(Math.round(n));
// Units are plain words ("bags", "cartons", "units"): "1 bag", "3 bags".
const unitOf = (n: number, unit: string) => (Math.round(n) === 1 ? unit.replace(/s$/, "") : unit);

export function BackRoom() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [counting, setCounting] = useState<InventoryItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getJson<InventoryItem[]>("/api/supplies")
      .then((list) => live && setItems(list))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (failed) return null;
  if (!items) return <p className="text-lg text-ink-soft">Loading the back room…</p>;

  async function saveCount(item: InventoryItem, count: number) {
    const res = await fetch("/api/supplies/count", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inventoryItemId: item.id, stock: count }),
    });
    if (!res.ok) throw new Error("save failed");
    const updated: InventoryItem = await res.json();
    setItems((list) => list?.map((i) => (i.id === updated.id ? updated : i)) ?? list);
    setCounting(null);
    setNotice(`Saved: ${item.name} ${amount(count)} ${unitOf(count, item.unit)}`);
    setTimeout(() => setNotice(null), 4000);
  }

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      {notice && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 rounded-tile bg-sage/60 p-3 text-xl font-semibold"
        >
          <Icon name="check" className="size-6" />
          {notice}
        </p>
      )}
      {/* On big screens the tiles share the whole height (never shorter than 14.5rem). */}
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <section
          aria-label="In the back"
          className="grid gap-4 sm:grid-cols-2 lg:h-full lg:auto-rows-[minmax(14.5rem,1fr)] lg:grid-cols-4"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-3 rounded-tile bg-white p-4 ring-1 ring-ink/10 lg:p-5 2xl:p-6"
            >
              <div className="flex items-center gap-3">
                <Icon name={pictureOf(item)} className="size-14 lg:size-16 2xl:size-20" />
                <p className="min-w-0 flex-1 text-xl font-semibold 2xl:text-2xl">{item.name}</p>
                <p className="text-right">
                  <span className="block text-number leading-none font-bold tabular-nums lg:text-4xl 2xl:text-[3.25rem]">
                    {amount(item.stock)}
                  </span>
                  <span className="text-base text-ink-soft lg:text-lg">
                    {unitOf(item.stock, item.unit)}
                  </span>
                </p>
              </div>
              <StockLevel stock={item.stock} reorderLevel={item.reorderLevel} />
              <button
                type="button"
                aria-label={`Count ${item.name}`}
                onClick={() => setCounting(item)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-tile bg-cream text-lg font-semibold ring-1 ring-ink/15 lg:text-xl 2xl:min-h-16"
              >
                <Icon name="pencil" className="size-6" />
                Count
              </button>
            </div>
          ))}
        </section>
      </div>
      {counting && (
        <CountSheet
          key={counting.id}
          name={counting.name}
          picture={<Icon name={pictureOf(counting)} className="size-14" />}
          unit={counting.unit}
          current={Math.round(counting.stock)}
          onSave={(n) => saveCount(counting, n)}
          onClose={() => setCounting(null)}
        />
      )}
    </div>
  );
}

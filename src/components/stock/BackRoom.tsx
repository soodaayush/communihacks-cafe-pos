"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { pictureOf } from "@/components/icons/supplyPicture";
import { CountButton } from "@/components/stock/CountButton";
import { CountSheet } from "@/components/stock/CountSheet";
import { StockLevel } from "@/components/stock/StockLevel";
import type { InventoryItem } from "@/lib/types";
import { formatAmount, isMeasured, unitOf } from "@/lib/units";

// "In the back" (Tiger Data: inventory_items + the stock_movements ledger), in two parts:
//   For drinks:      what drinks are made from (beans, tea leaves, milk, lemonade, oranges). Every
//                    drink sold takes its recipe out of here, so these show how full they are and
//                    how much went into drinks this week.
//   Everything else: counted things (cups, lids, eggs, bread...), same look as the shelf.

const getJson = <T,>(url: string): Promise<T> =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));

const percent = (i: InventoryItem) =>
  i.fullQty ? Math.max(0, Math.min(100, Math.round((i.stock / i.fullQty) * 100))) : 0;

function Tile({ item, onCount }: { item: InventoryItem; onCount: () => void }) {
  const forDrinks = item.fullQty !== null;
  return (
    <div className="flex flex-col justify-between gap-3 rounded-tile bg-white p-4 ring-1 ring-ink/10 lg:p-5">
      <div className="flex items-center gap-3">
        <Icon name={pictureOf(item)} className="size-14 lg:size-16" />
        <p className="min-w-0 flex-1 text-xl font-semibold">{item.name}</p>
        {forDrinks ? (
          <p className="text-right text-3xl leading-none font-bold tabular-nums">
            {percent(item)}%<span className="block text-base font-normal text-ink-soft">full</span>
          </p>
        ) : (
          <p className="text-right">
            <span className="block text-number leading-none font-bold tabular-nums lg:text-4xl">
              {Math.round(item.stock)}
            </span>
            <span className="text-base text-ink-soft">{unitOf(item.stock, item.unit)}</span>
          </p>
        )}
      </div>
      {/* The level (and, for drinks, this week's use) fills the row; the small pencil is bottom-right. */}
      <div className="flex items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <StockLevel
            stock={item.stock}
            reorderLevel={item.reorderLevel}
            capacity={item.fullQty ?? undefined}
            note={forDrinks ? `${formatAmount(item.stock, item.unit)} left` : undefined}
          />
          {forDrinks && (
            <p className="text-lg text-ink-soft">
              Used this week:{" "}
              <span className="font-semibold text-ink tabular-nums">
                {formatAmount(item.usedLast7Days, item.unit)}
              </span>
            </p>
          )}
        </div>
        <CountButton name={item.name} onClick={onCount} />
      </div>
    </div>
  );
}

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

  const forDrinks = items
    .filter((i) => i.fullQty !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
  const others = items.filter((i) => i.fullQty === null);

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
    setNotice(`Saved: ${item.name} ${formatAmount(count, item.unit)}`);
    setTimeout(() => setNotice(null), 4000);
  }

  const heading = "text-2xl font-bold";
  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

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
      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <section aria-labelledby="for-drinks" className="flex flex-col gap-3">
          <div>
            <h2 id="for-drinks" className={heading}>
              For drinks
            </h2>
            <p className="text-lg text-ink-soft">
              Every drink sold uses some. Bigger cups use more.
            </p>
          </div>
          <div className={grid}>
            {forDrinks.map((item) => (
              <Tile key={item.id} item={item} onCount={() => setCounting(item)} />
            ))}
          </div>
        </section>
        <section aria-labelledby="everything-else" className="flex flex-col gap-3">
          <h2 id="everything-else" className={heading}>
            Everything else
          </h2>
          <div className={grid}>
            {others.map((item) => (
              <Tile key={item.id} item={item} onCount={() => setCounting(item)} />
            ))}
          </div>
        </section>
      </div>
      {counting && (
        <CountSheet
          key={counting.id}
          name={counting.name}
          picture={<Icon name={pictureOf(counting)} className="size-14" />}
          unit={isMeasured(counting.unit) ? counting.unit : unitOf(2, counting.unit)}
          current={Math.round(counting.stock)}
          stepBy={
            counting.unit === "g"
              ? 50
              : counting.unit === "ml"
                ? 100
                : counting.unit === "pouches"
                  ? 10
                  : 1
          }
          describe={isMeasured(counting.unit) ? (n) => formatAmount(n, counting.unit) : undefined}
          question={isMeasured(counting.unit) ? "How much is there?" : undefined}
          onSave={(n) => saveCount(counting, n)}
          onClose={() => setCounting(null)}
        />
      )}
    </div>
  );
}

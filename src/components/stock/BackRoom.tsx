"use client";

import { useEffect, useRef, useState } from "react";
import { CountSheet } from "@/components/stock/CountSheet";
import { StockLevel } from "@/components/stock/StockLevel";
import type { InventoryItem, StockPoint } from "@/lib/types";

// "In the back": ingredients and supplies (Tiger Data: inventory_items + the stock_movements ledger).
// Tap one to see how its stock moved over the last 30 days.

const getJson = <T,>(url: string): Promise<T> =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));

// Pictures first: one emoji per thing, with a fallback per kind.
const PICTURE: Record<string, string> = {
  "Coffee beans": "☕",
  Milk: "🥛",
  "Tea bags": "🍵",
  "Cocoa powder": "🍫",
  Flour: "🌾",
  Sugar: "🍬",
  Eggs: "🥚",
  Bread: "🍞",
  "Paper cups": "🥤",
  "Cup lids": "⭕",
  Napkins: "🧻",
  "Cleaning spray": "🧴",
};
const FALLBACK: Record<InventoryItem["category"], string> = {
  ingredient: "🥣",
  packaging: "📦",
  supply: "🧽",
};
const pictureOf = (i: InventoryItem) => PICTURE[i.name] ?? FALLBACK[i.category];

const amount = (n: number) => String(Math.round(n));
// Units are plain words ("bags", "cartons", "units"): "1 bag", "3 bags".
const unitOf = (n: number, unit: string) => (Math.round(n) === 1 ? unit.replace(/s$/, "") : unit);

function History({ item, points }: { item: InventoryItem; points: StockPoint[] }) {
  const W = 300;
  const H = 90;
  const max = Math.max(item.reorderLevel, ...points.map((p) => p.stock), 1);
  const x = (i: number) => (points.length < 2 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const line = points.map((p, i) => `${x(i)},${y(p.stock)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <>
      <p className="mb-3 flex items-center gap-3 text-2xl font-bold">
        <span aria-hidden className="text-5xl">
          {pictureOf(item)}
        </span>
        <span>
          {item.name}
          <span className="block text-lg font-normal text-ink-soft">The last 30 days</span>
        </span>
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-48 min-h-40 w-full flex-1 rounded-tile bg-cream"
        role="img"
        aria-label={`${item.name} went from ${amount(first.stock)} to ${amount(last.stock)} ${unitOf(last.stock, item.unit)}`}
        preserveAspectRatio="none"
      >
        <polygon points={`0,${H} ${line} ${W},${H}`} className="fill-sky/60" />
        <polyline
          points={line}
          fill="none"
          className="stroke-ink"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={0}
          x2={W}
          y1={y(item.reorderLevel)}
          y2={y(item.reorderLevel)}
          className="stroke-ink-soft"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="mt-2 flex justify-between text-lg text-ink-soft">
        <span>
          30 days ago: {amount(first.stock)} {unitOf(first.stock, item.unit)}
        </span>
        <span>
          Today: {amount(last.stock)} {unitOf(last.stock, item.unit)}
        </span>
      </p>
      <p className="text-base text-ink-soft">Dashed line = time to buy more</p>
    </>
  );
}

export function BackRoom() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; points: StockPoint[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [counting, setCounting] = useState<InventoryItem | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0); // bumps after a count, to reload the chart

  useEffect(() => {
    let live = true;
    getJson<InventoryItem[]>("/api/supplies")
      .then((list) => live && setItems(list))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  // The item that needs attention most comes first from the server, so it is open to start with.
  const selectedId = picked ?? items?.[0]?.id ?? null;

  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    getJson<StockPoint[]>(`/api/supplies/history?itemId=${selectedId}&days=30`)
      .then((points) => live && setHistory({ id: selectedId, points }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [selectedId, version]);

  if (failed) return null;
  if (!items) return <p className="text-lg text-ink-soft">Loading the back room…</p>;

  const selected = items.find((i) => i.id === selectedId);
  const points = history?.id === selectedId ? history.points : null;

  async function saveCount(item: InventoryItem, count: number) {
    const res = await fetch("/api/supplies/count", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inventoryItemId: item.id, stock: count }),
    });
    if (!res.ok) throw new Error("save failed");
    const updated: InventoryItem = await res.json();
    setItems((list) => list?.map((i) => (i.id === updated.id ? updated : i)) ?? list);
    setVersion((v) => v + 1);
    setCounting(null);
    setNotice(`✓ Saved: ${item.name} ${amount(count)} ${unitOf(count, item.unit)}`);
    setTimeout(() => setNotice(null), 4000);
  }

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      {notice && (
        <p role="status" className="rounded-tile bg-sage/60 p-3 text-center text-xl font-semibold">
          {notice}
        </p>
      )}
      <div className="flex flex-col gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:gap-6">
        {/* Tap a tile to see its last 30 days on the right. On big screens the tiles share the height. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:min-h-0 lg:auto-rows-[minmax(8.5rem,1fr)] lg:grid-cols-3 lg:overflow-y-auto lg:pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col justify-between gap-2 rounded-tile p-3 ring-1 lg:p-4 ${item.id === selectedId ? "bg-lavender/40 ring-ink/30" : "bg-white ring-ink/10"}`}
            >
              <button
                type="button"
                aria-pressed={item.id === selectedId}
                onClick={() => {
                  setPicked(item.id);
                  // On narrow screens the chart is below the tiles: bring it into view.
                  if (window.matchMedia("(max-width: 1023px)").matches) {
                    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }
                }}
                className="flex flex-col gap-2 text-left"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden className="text-4xl lg:text-5xl">
                    {pictureOf(item)}
                  </span>
                  <span className="flex-1 text-lg font-semibold lg:text-xl">{item.name}</span>
                  <span className="text-right leading-none">
                    <span className="block text-2xl font-bold tabular-nums lg:text-3xl">
                      {amount(item.stock)}
                    </span>
                    <span className="text-base text-ink-soft">{unitOf(item.stock, item.unit)}</span>
                  </span>
                </span>
                <StockLevel stock={item.stock} reorderLevel={item.reorderLevel} />
              </button>
              <button
                type="button"
                aria-label={`Count ${item.name}`}
                onClick={() => setCounting(item)}
                className="min-h-12 rounded-tile bg-cream text-lg font-semibold ring-1 ring-ink/15 lg:hidden"
              >
                ✏️ Count
              </button>
            </div>
          ))}
        </div>
        <section
          ref={panelRef}
          aria-label="Last 30 days"
          className="flex flex-col rounded-tile bg-white p-5 ring-1 ring-ink/10 lg:min-h-0"
        >
          {selected && points && points.length > 0 ? (
            <History item={selected} points={points} />
          ) : (
            <p className="text-lg text-ink-soft">Loading…</p>
          )}
          {selected && (
            <button
              type="button"
              aria-label={`Count ${selected.name}`}
              onClick={() => setCounting(selected)}
              className="mt-4 hidden min-h-16 rounded-tile bg-sage text-xl font-bold lg:block"
            >
              ✏️ Count {selected.name}
            </button>
          )}
        </section>
      </div>
      {counting && (
        <CountSheet
          key={counting.id}
          name={counting.name}
          picture={<span aria-hidden>{pictureOf(counting)}</span>}
          unit={counting.unit}
          current={Math.round(counting.stock)}
          onSave={(n) => saveCount(counting, n)}
          onClose={() => setCounting(null)}
        />
      )}
    </div>
  );
}

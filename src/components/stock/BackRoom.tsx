"use client";

import { useEffect, useState } from "react";
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
    <div className="rounded-tile bg-cream p-4">
      <p className="mb-2 text-lg font-semibold">
        {pictureOf(item)} {item.name}: last 30 days
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-28 w-full"
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
    </div>
  );
}

export function BackRoom() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; points: StockPoint[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getJson<InventoryItem[]>("/api/supplies")
      .then((list) => live && setItems(list))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  // Nothing is open until you tap an item (tap it again to close).
  const selectedId = picked;

  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    getJson<StockPoint[]>(`/api/supplies/history?itemId=${selectedId}&days=30`)
      .then((points) => live && setHistory({ id: selectedId, points }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [selectedId]);

  if (failed) return null;
  if (!items) return <p className="text-lg text-ink-soft">Loading the back room…</p>;

  const selected = items.find((i) => i.id === selectedId);
  const points = history?.id === selectedId ? history.points : null;

  return (
    <section aria-labelledby="back-room" className="rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <h2 id="back-room" className="text-2xl font-bold">
        In the back
      </h2>
      <p className="mb-4 text-lg text-ink-soft">What we use to make things</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === selectedId}
            onClick={() => setPicked(item.id === selectedId ? null : item.id)}
            className={`flex flex-col gap-2 rounded-tile p-3 text-left ring-1 ${item.id === selectedId ? "bg-lavender/40 ring-ink/30" : "bg-white ring-ink/10"}`}
          >
            <span className="flex items-center gap-3">
              <span aria-hidden className="text-4xl">
                {pictureOf(item)}
              </span>
              <span className="flex-1 text-lg font-semibold">{item.name}</span>
              <span className="text-right leading-none">
                <span className="block text-2xl font-bold tabular-nums">{amount(item.stock)}</span>
                <span className="text-base text-ink-soft">{unitOf(item.stock, item.unit)}</span>
              </span>
            </span>
            <StockLevel stock={item.stock} reorderLevel={item.reorderLevel} />
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-4">
          {points && points.length > 0 ? (
            <History item={selected} points={points} />
          ) : (
            <p className="text-lg text-ink-soft">Loading…</p>
          )}
        </div>
      )}
    </section>
  );
}

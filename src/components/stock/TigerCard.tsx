"use client";

import { useEffect, useState } from "react";
import type { SaleStats, TigerStats } from "@/lib/tiger-types";

// "Powered by Tiger Data": what the database is doing for this café, in plain words.

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const count = (n: number) => n.toLocaleString();

export function TigerCard() {
  const [tiger, setTiger] = useState<TigerStats | null>(null);
  const [stats, setStats] = useState<SaleStats | null>(null);

  useEffect(() => {
    let live = true;
    const get = <T,>(url: string): Promise<T> =>
      fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));
    get<TigerStats>("/api/tiger")
      .then((t) => live && setTiger(t))
      .catch(() => {});
    get<SaleStats>("/api/tiger/stats")
      .then((s) => live && setStats(s))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!tiger) return null;

  const before = tiger.hypertables.reduce((s, h) => s + h.bytesBefore, 0);
  const after = tiger.hypertables.reduce((s, h) => s + h.bytesAfter, 0);
  const saved = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  const live = tiger.aggregates.filter((a) => a.realTime).length;

  const rows: { icon: string; text: string }[] = [
    {
      icon: "🧠",
      text: `Remembers ${count(tiger.totals.sales)} sales and ${count(tiger.totals.stockMovements)} shelf changes`,
    },
    { icon: "🗜️", text: `Old records squeezed to save space: ${saved}% smaller` },
    { icon: "⚡", text: `${live} live summaries that update by themselves` },
  ];
  if (stats) {
    rows.push({
      icon: "🧾",
      text: `A usual sale is ${money(stats.basket.medianCents)}. A big one is ${money(stats.basket.p90Cents)} or more`,
    });
  }

  return (
    <section aria-labelledby="tiger" className="rounded-tile bg-lavender/40 p-5 ring-1 ring-ink/10">
      <h2 id="tiger" className="text-2xl font-bold">
        🐯 Powered by Tiger Data
      </h2>
      <p className="mb-4 text-lg text-ink-soft">The memory behind this café</p>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.icon} className="flex items-start gap-3 text-lg">
            <span aria-hidden className="text-3xl leading-none">
              {r.icon}
            </span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

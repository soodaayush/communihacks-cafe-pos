"use client";

import { useCallback, useEffect, useState } from "react";
import type { Insights, RushResult, TigerStats } from "@/lib/demo-types";
import type { BusyHour, DaySummary, MenuItem, RestockSuggestion } from "@/lib/types";

// Judges' view: shows what Tiger Data is doing under the café. Not part of the main navigation.
// "Simulate a rush" rings up real sales; every panel below re-reads the database afterwards.

interface Snapshot {
  today: DaySummary | undefined;
  hours: BusyHour[];
  restock: RestockSuggestion[];
  menu: MenuItem[];
  tiger: TigerStats;
  insights: Insights;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const mb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} failed (${res.status})`);
  return res.json();
}

async function loadSnapshot(): Promise<Snapshot> {
  const [summary, hours, restock, menu, tiger, insights] = await Promise.all([
    get<DaySummary[]>("/api/summary?range=day"),
    get<BusyHour[]>("/api/busy-hours?days=14"),
    get<RestockSuggestion[]>("/api/restock-suggestions"),
    get<MenuItem[]>("/api/menu"),
    get<TigerStats>("/api/demo/tiger"),
    get<Insights>("/api/insights"),
  ]);
  return { today: summary[0], hours, restock, menu, tiger, insights };
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-tile bg-white p-6 shadow-sm">
      <h2 className="text-label font-bold">{title}</h2>
      <p className="mb-4 text-sm text-ink-soft">{note}</p>
      {children}
    </section>
  );
}

export default function DemoPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastRush, setLastRush] = useState<RushResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnap(await loadSnapshot());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    // Initial load. State is set in the promise callbacks, after the fetches resolve.
    let live = true;
    loadSnapshot()
      .then((next) => live && setSnap(next))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Something went wrong"));
    return () => {
      live = false;
    };
  }, []);

  async function rush() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/rush", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count: 20 }),
      });
      if (!res.ok) throw new Error(`Rush failed (${res.status})`);
      setLastRush(await res.json());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const names = new Map(snap?.menu.map((m) => [m.id, m.name]));
  const maxHour = Math.max(1, ...(snap?.hours.map((h) => h.saleCount) ?? [0]));

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-gap">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-hero">Under the hood</h1>
          <p className="text-label text-ink-soft">Live from Tiger Data (TimescaleDB)</p>
        </div>
        <button
          onClick={rush}
          disabled={busy}
          className="min-h-touch rounded-tile bg-sage px-8 text-label font-bold disabled:opacity-50"
        >
          {busy ? "Ringing up sales…" : "⚡ Simulate a rush (20 sales)"}
        </button>
      </header>

      {error && <p className="rounded-tile bg-blush p-4">{error}</p>}
      {lastRush && (
        <p className="rounded-tile bg-butter p-4">
          Just rang up {lastRush.created} sales worth {money(lastRush.moneyInCents)}. Watch the
          panels change.
        </p>
      )}

      {!snap ? (
        <p className="text-label text-ink-soft">Loading…</p>
      ) : (
        <div className="grid gap-gap md:grid-cols-2">
          <Panel
            title="Today"
            note="Real-time continuous aggregates: stored rollups plus the newest sales, no refresh needed."
          >
            {snap.today ? (
              <dl className="grid grid-cols-2 gap-3 text-number">
                <div className="rounded-tile bg-money-in p-3">
                  <dt className="text-sm">Money in</dt>
                  <dd>{money(snap.today.moneyInCents)}</dd>
                </div>
                <div className="rounded-tile bg-money-left p-3">
                  <dt className="text-sm">Profit</dt>
                  <dd>{money(snap.today.profitCents)}</dd>
                </div>
              </dl>
            ) : (
              <p>No data yet.</p>
            )}
          </Panel>

          <Panel title="Busiest hours" note="sales_hourly aggregate, last 14 days (UTC).">
            <div className="flex h-32 items-end gap-1">
              {snap.hours.map((h) => (
                <div key={h.hour} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t bg-sky"
                    style={{ height: `${(h.saleCount / maxHour) * 100}%` }}
                    title={`${h.hour}:00 — ${h.saleCount} sales`}
                  />
                  <span className="text-[10px] text-ink-soft">{h.hour}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Restock forecast"
            note="Expected sales for each weekday from 28 days of history. Updates after a rush."
          >
            {snap.restock.length === 0 ? (
              <p>Everything is stocked.</p>
            ) : (
              <ul className="space-y-2">
                {snap.restock.slice(0, 6).map((r) => (
                  <li
                    key={r.menuItemId}
                    className="flex justify-between rounded-tile bg-stock-low px-4 py-2"
                  >
                    <span>{names.get(r.menuItemId) ?? "Item"}</span>
                    <span>
                      {r.stock} left · {r.daysLeft ?? "?"} days · order {r.suggestedQty}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Statistics in SQL"
            note="TimescaleDB Toolkit: percentile_agg and stats_agg, computed in the database."
          >
            <ul className="space-y-1">
              <li>Typical sale: {money(snap.insights.basket.medianCents)}</li>
              <li>Biggest 10% of sales: {money(snap.insights.basket.p90Cents)} or more</li>
              <li>
                Average day: {money(snap.insights.daily.avgCents)} (±
                {money(snap.insights.daily.stddevCents)})
              </li>
            </ul>
          </Panel>

          <Panel
            title="Columnstore compression"
            note="Chunks older than a week are compressed automatically."
          >
            <table className="w-full text-sm">
              <thead className="text-left text-ink-soft">
                <tr>
                  <th>Table</th>
                  <th>Chunks</th>
                  <th>Compressed</th>
                  <th>Size before → after</th>
                </tr>
              </thead>
              <tbody>
                {snap.tiger.hypertables.map((h) => (
                  <tr key={h.name}>
                    <td>{h.name}</td>
                    <td>{h.chunks}</td>
                    <td>{h.compressedChunks}</td>
                    <td>
                      {mb(h.bytesBefore)} → {mb(h.bytesAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="In the database" note="Row counts and continuous aggregates.">
            <p>
              {snap.tiger.totals.sales.toLocaleString()} sales ·{" "}
              {snap.tiger.totals.saleLines.toLocaleString()} sale lines ·{" "}
              {snap.tiger.totals.stockMovements.toLocaleString()} stock movements
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Aggregates:{" "}
              {snap.tiger.aggregates
                .map((a) => `${a.name}${a.realTime ? " (real-time)" : ""}`)
                .join(", ")}
            </p>
          </Panel>
        </div>
      )}
    </section>
  );
}

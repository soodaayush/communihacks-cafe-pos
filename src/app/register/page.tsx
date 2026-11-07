"use client";

import { useEffect, useState } from "react";
import { ItemTile } from "@/components/register/ItemTile";
import { OrderTray } from "@/components/register/OrderTray";
import { PaymentChoice } from "@/components/register/PaymentChoice";
import { SizePicker } from "@/components/register/SizePicker";
import { hasSizes, sizePriceCents } from "@/lib/sizes";
import type { DrinkSize, MenuItem, PaymentMethod, SaleItem } from "@/lib/types";

// The open order survives switching tabs (and a refresh) by living in this browser tab's sessionStorage.
const ORDER_KEY = "register-order";

function loadOrder(): SaleItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(sessionStorage.getItem(ORDER_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function RegisterPage() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Safe to read storage here: the first render shows "Loading…" (no order) on server and client alike.
  const [order, setOrder] = useState<SaleItem[]>(loadOrder);
  const [paying, setPaying] = useState(false);
  const [sizing, setSizing] = useState<MenuItem | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
    } catch {
      // Storage blocked (private mode): the order just won't survive a tab switch.
    }
  }, [order]);

  function loadMenu() {
    fetch("/api/menu")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m: MenuItem[]) => setMenu([...m].sort((a, b) => a.category.localeCompare(b.category))))
      .catch(() => setLoadFailed(true));
  }
  useEffect(loadMenu, []);

  // Each size of a drink is its own order line; stock counts all sizes together.
  const qtyOf = (id: string) =>
    order.filter((l) => l.menuItemId === id).reduce((s, l) => s + l.qty, 0);
  const totalCents = order.reduce((s, l) => s + l.qty * l.unitPriceCents, 0);
  const isLine = (l: SaleItem, id: string, size?: DrinkSize) =>
    l.menuItemId === id && l.size === size;

  function add(item: MenuItem, size?: DrinkSize) {
    setOrder((o) =>
      o.some((l) => isLine(l, item.id, size))
        ? o.map((l) => (isLine(l, item.id, size) ? { ...l, qty: l.qty + 1 } : l))
        : [
            ...o,
            {
              menuItemId: item.id,
              ...(size && { size }),
              qty: 1,
              unitPriceCents: sizePriceCents(item.priceCents, size),
              unitCostCents: item.costCents,
            },
          ],
    );
  }
  function removeOne(id: string, size?: DrinkSize) {
    setOrder((o) =>
      o.map((l) => (isLine(l, id, size) ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0),
    );
  }

  async function recordSale(paymentMethod: PaymentMethod) {
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod, totalCents, items: order }),
    });
    if (!res.ok) throw new Error(`Sale not saved: ${res.status}`);
    // The server lowers the stock too (DB or mock shelf); this just updates the tiles without a reload.
    setMenu((m) => m && m.map((it) => ({ ...it, stock: it.stock - qtyOf(it.id) })));
  }

  if (!menu) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-xl">
        {loadFailed ? (
          <>
            <p>Menu did not load.</p>
            <button
              type="button"
              onClick={() => {
                setLoadFailed(false);
                loadMenu();
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

  return (
    <div className="flex flex-col gap-6 lg:grid lg:h-full lg:grid-cols-[1fr_minmax(22rem,26rem)]">
      <section
        aria-label="Menu"
        className="grid auto-rows-max content-start gap-4 sm:grid-cols-2 lg:overflow-y-auto lg:pr-1 xl:grid-cols-4"
      >
        {menu.map((item) => (
          <ItemTile
            key={item.id}
            item={item}
            qtyInTray={qtyOf(item.id)}
            onTap={(it) => (hasSizes(it.category) ? setSizing(it) : add(it))}
          />
        ))}
      </section>

      <OrderTray
        items={order}
        menu={menu}
        totalCents={totalCents}
        onAdd={(id, size) => {
          const item = menu.find((m) => m.id === id);
          if (item) add(item, size);
        }}
        onRemove={removeOne}
        onClear={() => setOrder([])}
        onPay={() => setPaying(true)}
      />

      {sizing && (
        <SizePicker
          item={sizing}
          onPick={(size) => {
            add(sizing, size);
            setSizing(null);
          }}
          onClose={() => setSizing(null)}
        />
      )}

      {paying && (
        <PaymentChoice
          items={order}
          totalCents={totalCents}
          onPaid={recordSale}
          onClose={(paid) => {
            setPaying(false);
            if (paid) setOrder([]);
          }}
        />
      )}
    </div>
  );
}

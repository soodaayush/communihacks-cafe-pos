// Client-only. Keep selling when the Wi-Fi drops: a sale that cannot reach the server is kept in
// this tablet's localStorage and sent later (on "online", and every 30 s). Each sale carries a
// clientRef, so the server counts it once even if it arrives twice, and soldAt, so it keeps its time.
import { useSyncExternalStore } from "react";
import type { DrinkSize, PaymentMethod } from "./types";

export interface PendingSale {
  clientRef: string;
  soldAt: string;
  paymentMethod: PaymentMethod;
  items: { menuItemId: string; size?: DrinkSize; qty: number }[];
}

const KEY = "pending-sales";
const listeners = new Set<() => void>();
let snapshot: string | null = null;

function read(): PendingSale[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function write(list: PendingSale[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: nothing more we can do.
  }
  snapshot = null;
  listeners.forEach((l) => l());
}

/** Sends one sale. "saved", "offline" (kept for later), or the HTTP status of a real refusal. */
async function post(sale: PendingSale): Promise<"saved" | "offline" | number> {
  try {
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sale),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return "saved";
    // The server or database is down: safe to try again later (clientRef stops doubles).
    return res.status >= 500 ? "offline" : res.status;
  } catch {
    return "offline";
  }
}

export async function sendSale(sale: PendingSale): Promise<"saved" | "offline" | number> {
  const result = await post(sale);
  if (result === "offline") write([...read(), sale]);
  return result;
}

let syncing = false;
/** Sends the waiting sales, oldest first. Stops at the first one that still cannot get through. */
export async function syncPendingSales(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    for (const sale of read()) {
      const result = await post(sale);
      if (result === "offline") break;
      if (result !== "saved")
        console.warn("[offline-sales] the server refused a kept sale:", result);
      write(read().filter((s) => s.clientRef !== sale.clientRef));
    }
  } finally {
    syncing = false;
  }
}

/** How many sales are waiting on this tablet. Re-renders when it changes. */
export function usePendingCount(): number {
  const raw = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      window.addEventListener("storage", onChange);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => (snapshot ??= String(read().length)),
    () => "0",
  );
  return Number(raw);
}

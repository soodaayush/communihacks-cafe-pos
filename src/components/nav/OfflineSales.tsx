"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons/Icon";
import { syncPendingSales, usePendingCount } from "@/lib/offline-sales";

/**
 * Sends sales that waited on this tablet, and shows how many are waiting (nothing when none).
 * Also turns on the service worker in production, so the register opens without Wi-Fi.
 */
export function OfflineSales() {
  const waiting = usePendingCount();

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    void syncPendingSales();
    const sync = () => void syncPendingSales();
    window.addEventListener("online", sync);
    const timer = setInterval(sync, 30_000);
    return () => {
      window.removeEventListener("online", sync);
      clearInterval(timer);
    };
  }, []);

  if (!waiting) return null;
  return (
    <p
      role="status"
      className="fixed top-3 right-3 z-20 flex items-center gap-2 rounded-full bg-sky px-4 py-2 text-lg font-semibold shadow"
    >
      <Icon name="cloud" className="size-7" />
      {waiting} {waiting === 1 ? "sale" : "sales"} waiting for Wi-Fi
    </p>
  );
}

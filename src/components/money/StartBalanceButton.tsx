"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { CountButton } from "@/components/stock/CountButton";
import { CountSheet } from "@/components/stock/CountSheet";
import { playSound } from "@/lib/sounds";
import { staffFetch } from "@/lib/staff-client";

/**
 * The pencil next to "Start of November": staff type how much money the café really had on the 1st
 * (the till plus the bank). Every month's balance is then worked out from it.
 */
export function StartBalanceButton({
  month,
  monthLabel,
  cents,
}: {
  month: string;
  monthLabel: string;
  cents: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = Math.max(0, Math.round(cents / 100));

  async function save(dollars: number) {
    const res = await staffFetch("/api/opening-balance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ month, cents: dollars * 100 }),
    });
    if (!res.ok) throw new Error("save failed");
    playSound("success");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <CountButton name={`the money at the start of ${monthLabel}`} onClick={() => setOpen(true)} />
      {open && (
        <CountSheet
          name="Money at the start"
          picture={<Icon name="coin" className="size-12" />}
          unit="dollars"
          current={current}
          stepBy={10}
          question={`How much money was there on ${monthLabel} 1?`}
          onSave={save}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

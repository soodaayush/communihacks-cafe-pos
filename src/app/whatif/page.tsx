import { connection } from "next/server";
import { Suspense } from "react";
import { WhatIfScreen } from "@/components/whatif/WhatIfScreen";
import { getWhatIfData } from "@/lib/whatif-data";

// "What if I change the price?" The server starts loading the menu and sales right away and
// streams them in, so there is no extra round trip after the page opens.
export default async function WhatIfPage() {
  await connection(); // read live data on every visit, never at build time
  return (
    <Suspense fallback={<p className="text-xl text-ink-soft">Loading…</p>}>
      <WhatIfScreen data={getWhatIfData()} />
    </Suspense>
  );
}

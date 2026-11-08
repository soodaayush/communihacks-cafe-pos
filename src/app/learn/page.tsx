import { connection } from "next/server";
import { LearnScreen } from "@/components/learn/LearnScreen";
import { getTransactions } from "@/lib/learn-data";

const STEP = 40;
const MAX = 200;

// Every transaction is logged here; pick one to practise adding it up or making its change.
// Loaded on the server (no loading flash). "Show more" asks for 40 more.
export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n: raw } = await searchParams;
  const asked = Number(raw);
  // 40 to 200, in steps of 40: anything else falls back to the nearest allowed size.
  const n = Number.isFinite(asked)
    ? Math.min(MAX, Math.max(STEP, Math.round(asked / STEP) * STEP))
    : STEP;
  await connection();
  const transactions = await getTransactions(n);
  return (
    <LearnScreen
      transactions={transactions}
      more={transactions.length === n && n < MAX ? n + STEP : null}
    />
  );
}

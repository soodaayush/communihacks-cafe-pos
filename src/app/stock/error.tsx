"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function StockError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen what="Stock" error={error} retry={retry} />;
}

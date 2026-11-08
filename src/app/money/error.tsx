"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function MoneyError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen what="Money" error={error} retry={retry} />;
}

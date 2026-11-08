"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function RegisterError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen what="The register" error={error} retry={retry} />;
}

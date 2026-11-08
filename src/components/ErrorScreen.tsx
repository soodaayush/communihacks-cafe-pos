"use client";

import { useEffect } from "react";

/** What a tab shows if it crashes: one plain sentence and one big button. Used by each error.tsx. */
export function ErrorScreen({
  what,
  error,
  retry,
}: {
  what: string;
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => console.error(error), [error]);
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 text-xl">
      <p>{what} did not load.</p>
      <button
        type="button"
        onClick={retry}
        className="min-h-touch rounded-tile bg-sage px-8 text-2xl font-bold"
      >
        Try again
      </button>
    </div>
  );
}

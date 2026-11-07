"use client";

import { useEffect } from "react";

export default function WhatIfError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-xl">
      <p>Prices did not load.</p>
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

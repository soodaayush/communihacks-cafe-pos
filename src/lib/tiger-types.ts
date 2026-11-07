// Payloads for the Tiger Data endpoints (/api/tiger, /api/tiger/stats), shown on the Stock tab.

export interface HypertableStats {
  name: string;
  chunks: number;
  compressedChunks: number;
  bytesBefore: number; // size of the compressed chunks before columnstore
  bytesAfter: number; // and after
}

export interface TigerStats {
  hypertables: HypertableStats[];
  aggregates: { name: string; realTime: boolean }[];
  totals: { sales: number; saleLines: number; stockMovements: number };
}

// Computed in the database with TimescaleDB Toolkit hyperfunctions (percentile_agg, stats_agg).
export interface SaleStats {
  basket: { medianCents: number; p90Cents: number; avgCents: number }; // size of one sale, last 30 days
  daily: { avgCents: number; stddevCents: number }; // money in per day, last 30 days
}

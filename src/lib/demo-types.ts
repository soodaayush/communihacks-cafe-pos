// Payloads for the demo/showcase endpoints (/api/demo/*).

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

export interface RushResult {
  created: number;
  moneyInCents: number;
}

// Computed in the database with TimescaleDB Toolkit hyperfunctions (percentile_agg, stats_agg).
export interface Insights {
  basket: { medianCents: number; p90Cents: number; avgCents: number }; // size of one sale, last 30 days
  daily: { avgCents: number; stddevCents: number }; // money in per day, last 30 days
}

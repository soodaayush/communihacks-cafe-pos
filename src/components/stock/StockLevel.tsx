export interface StockLevelProps {
  stock: number;
  reorderLevel: number;
  /** Visual max, e.g. a full shelf. */
  capacity?: number;
}

// TODO(dev2): fill-level picture (shelf/jar), bg-stock-low when stock <= reorderLevel.
export function StockLevel(_props: StockLevelProps) {
  return null;
}

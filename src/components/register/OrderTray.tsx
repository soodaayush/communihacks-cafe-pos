"use client";

import type { MenuItem, SaleItem } from "@/lib/types";

export interface OrderTrayProps {
  items: SaleItem[];
  menu: MenuItem[];
  totalCents: number;
  onRemove: (menuItemId: string) => void;
  onClear: () => void;
}

// TODO(dev2): pictures of items in the order, total shown with CoinBarVisual.
export function OrderTray(_props: OrderTrayProps) {
  return null;
}

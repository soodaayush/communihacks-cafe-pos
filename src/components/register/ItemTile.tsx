import type { MenuItem } from "@/lib/types";

export interface ItemTileProps {
  item: MenuItem;
  qtyInTray: number;
  onTap: (item: MenuItem) => void;
}

// TODO(dev2): big picture tile (imageUrl from cloudinary.ts), min-h-touch, price as coins not text.
export function ItemTile(_props: ItemTileProps) {
  return null;
}

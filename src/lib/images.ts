// Safe to import on client and server. Menu pictures are the drawings in public/images/menu/.
const PLACEHOLDER = "/images/placeholder.svg";

/** The picture for a menu item, from its image id (e.g. "kwhab/menu/coffee" -> coffee.svg). */
export function imageUrl(publicId: string): string {
  if (!publicId) return PLACEHOLDER;
  return `/images/menu/${publicId.split("/").pop()}.svg`;
}

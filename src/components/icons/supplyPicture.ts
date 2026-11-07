import type { IconName } from "@/components/icons/Icon";

// One picture per thing in the back, shared by Stock and Money. Anything new gets a crate.
const PICTURE: Record<string, IconName> = {
  "Coffee beans": "coffeeBeans",
  Milk: "milk",
  "Tea bags": "teaBox",
  "Cocoa powder": "cocoa",
  Flour: "flour",
  Sugar: "sugar",
  Eggs: "eggs",
  Bread: "bread",
  "Paper cups": "cups",
  "Cup lids": "lids",
  Napkins: "napkins",
  "Cleaning spray": "spray",
};

export const pictureFor = (name: string): IconName => PICTURE[name] ?? "crate";
export const pictureOf = (item: { name: string }): IconName => pictureFor(item.name);

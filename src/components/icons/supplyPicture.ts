import type { IconName } from "@/components/icons/Icon";

// One picture per thing in the back, shared by Stock and Money. Anything new gets a crate.
const PICTURE: Record<string, IconName> = {
  "Coffee beans": "coffeeBeans",
  "Tea leaves": "teaLeaves",
  "Cocoa powder": "cocoa",
  Milk: "milk",
  Lemonade: "lemonade",
  Oranges: "oranges",
  Sugar: "sugar",
  Eggs: "eggs",
  Bread: "bread",
  "Paper cups": "cups",
  "Cup lids": "lids",
};

export const pictureFor = (name: string): IconName => PICTURE[name] ?? "crate";
export const pictureOf = (item: { name: string }): IconName => pictureFor(item.name);

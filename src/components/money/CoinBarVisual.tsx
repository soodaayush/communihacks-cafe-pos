export interface CoinBarVisualProps {
  cents: number;
  variant: "coins" | "bar";
  tone?: "in" | "out" | "left";
}

// TODO(dev3): teaching visual: stacks of coins/bills or a bar sized by cents. No equations.
export function CoinBarVisual(_props: CoinBarVisualProps) {
  return null;
}

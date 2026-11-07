import type { PaymentMethod } from "@/lib/types";

export interface PaymentChoiceProps {
  totalCents: number;
  onChoose: (method: PaymentMethod) => void;
}

// TODO(dev2): two huge buttons (cash picture, card picture). Cash flow: show change as coins.
export function PaymentChoice(_props: PaymentChoiceProps) {
  return null;
}

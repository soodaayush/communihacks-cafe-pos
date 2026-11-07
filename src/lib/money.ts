const CURRENCY = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

/** 132600 -> "$1,326.00" */
export const formatCents = (cents: number): string => CURRENCY.format(cents / 100);

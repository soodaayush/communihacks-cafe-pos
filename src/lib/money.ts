const CURRENCY = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

/** 132600 -> "$1,326.00" */
export const formatCents = (cents: number): string => CURRENCY.format(cents / 100);

const DOLLARS = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 61775 -> "$618". Rounded to whole dollars, for screens the cashier reads. */
export const formatDollars = (cents: number): string => DOLLARS.format(Math.round(cents / 100));

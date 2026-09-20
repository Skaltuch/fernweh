export const CURRENCY = "TND";

export function money(value, options = {}) {
  return new Intl.NumberFormat("en-TN", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: options.compact ? 0 : 3,
    maximumFractionDigits: options.compact ? 0 : 3,
  }).format(Number(value) || 0);
}

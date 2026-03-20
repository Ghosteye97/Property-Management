export const CURRENCY_OPTIONS = [
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "EUR" },
  { code: "GBP", label: "British Pound", symbol: "GBP" },
] as const;

export function getCurrencySymbol(currencyCode = "ZAR") {
  return CURRENCY_OPTIONS.find((option) => option.code === currencyCode)?.symbol ?? currencyCode;
}

export function getCurrencyLabel(currencyCode = "ZAR") {
  return CURRENCY_OPTIONS.find((option) => option.code === currencyCode)?.label ?? currencyCode;
}

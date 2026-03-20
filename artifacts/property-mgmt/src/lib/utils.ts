import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode = "ZAR") {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: currencyCode === "ZAR" ? "narrowSymbol" : "symbol",
  }).format(amount);
}

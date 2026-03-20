import { createContext, useContext } from "react";

const ComplexCurrencyContext = createContext("ZAR");

export function ComplexCurrencyProvider({
  currencyCode,
  children,
}: {
  currencyCode?: string;
  children: React.ReactNode;
}) {
  return (
    <ComplexCurrencyContext.Provider value={currencyCode || "ZAR"}>
      {children}
    </ComplexCurrencyContext.Provider>
  );
}

export function useComplexCurrency() {
  return useContext(ComplexCurrencyContext);
}

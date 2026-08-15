"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { parseLocale, t as translate, type AppLocale, type MessageKey } from "@/lib/i18n";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => undefined,
  t: (key, vars) => translate("en", key, vars),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState<AppLocale>(parseLocale(locale));

  useEffect(() => {
    setCurrent(parseLocale(locale));
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = current;
  }, [current]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: current,
      setLocale: setCurrent,
      t: (key, vars) => translate(current, key, vars),
    }),
    [current],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT() {
  return useContext(LocaleContext);
}

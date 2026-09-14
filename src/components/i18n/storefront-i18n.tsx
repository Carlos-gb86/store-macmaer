"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StorefrontLocale } from "@/modules/i18n/config";
import {
  storefrontMessages,
  type StorefrontMessageKey,
} from "@/modules/i18n/messages";

const LocaleContext = createContext<StorefrontLocale>("en");

export function StorefrontI18nProvider({
  locale,
  children,
}: {
  locale: StorefrontLocale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useStorefrontI18n() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (key: StorefrontMessageKey) => storefrontMessages[locale][key],
  };
}

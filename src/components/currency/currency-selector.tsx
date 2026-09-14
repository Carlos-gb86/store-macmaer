"use client";

import { useState, useTransition } from "react";
import { setCurrencyAction } from "@/modules/currency/actions";
import type { Currency } from "@/modules/currency/schema";
import { announceCartUpdate } from "@/modules/cart/events";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
import { StorefrontSelect } from "@/components/ui/storefront-select";

const currencyFlags: Record<Currency, string> = {
  SEK: "🇸🇪",
  EUR: "🇪🇺",
  USD: "🇺🇸",
};

export function CurrencySelector({
  currency,
  currencies,
  notice,
}: {
  currency: Currency;
  currencies: { code: Currency; available: boolean }[];
  notice?: string;
}) {
  const { t } = useStorefrontI18n();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="currency-selector">
      <div title={notice}>
        <span className="sr-only">{t("displayCurrency")}</span>
        <StorefrontSelect
          ariaLabel={t("displayCurrency")}
          ariaDescribedBy={notice ? "currency-notice" : undefined}
          value={currency}
          disabled={pending}
          className="currency-select-trigger"
          options={currencies.map((option) => ({
            value: option.code,
            label: `${option.code}${option.available ? "" : ` — ${t("currencyUnavailable")}`}`,
            leading: currencyFlags[option.code],
            disabled: !option.available,
          }))}
          onValueChange={(value) => {
            startTransition(async () => {
              const result = await setCurrencyAction(value);
              setMessage(result.message ?? "");
              if (result.ok) announceCartUpdate({ open: false });
            });
          }}
        />
      </div>
      {notice && (
        <span id="currency-notice" className="sr-only">
          {notice}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {pending ? t("updatingCurrency") : message}
      </span>
    </div>
  );
}

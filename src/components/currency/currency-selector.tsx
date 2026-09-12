"use client";

import { useState, useTransition } from "react";
import { setCurrencyAction } from "@/modules/currency/actions";
import type { Currency } from "@/modules/currency/schema";
import { announceCartUpdate } from "@/modules/cart/events";

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
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="currency-selector">
      <label title={notice}>
        <span className="sr-only">Display currency</span>
        <select
          aria-label="Display currency"
          aria-describedby={notice ? "currency-notice" : undefined}
          value={currency}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value;
            startTransition(async () => {
              const result = await setCurrencyAction(value);
              setMessage(result.message ?? "");
              if (result.ok) announceCartUpdate({ open: false });
            });
          }}
        >
          {currencies.map((option) => (
            <option
              key={option.code}
              value={option.code}
              disabled={!option.available}
            >
              {currencyFlags[option.code]} {option.code}
              {option.available ? "" : " — unavailable"}
            </option>
          ))}
        </select>
      </label>
      {notice && (
        <span id="currency-notice" className="sr-only">
          {notice}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {pending ? "Updating currency" : message}
      </span>
    </div>
  );
}

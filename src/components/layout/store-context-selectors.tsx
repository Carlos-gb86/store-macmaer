"use client";
import { useState, useTransition } from "react";
import {
  setCurrencyAction,
  setDestinationAction,
} from "@/modules/currency/actions";
import type { Currency } from "@/modules/currency/schema";

export function StoreContextSelectors({
  currency,
  currencies,
  destination,
  countries,
}: {
  currency: Currency;
  currencies: { code: Currency; available: boolean }[];
  destination: string;
  countries: { code: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="store-context" aria-label="Shopping preferences">
      <label>
        <span className="sr-only">Display currency</span>
        <select
          aria-label="Display currency"
          value={currency}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value;
            startTransition(async () => {
              const result = await setCurrencyAction(value);
              setMessage(result.message ?? "");
            });
          }}
        >
          {currencies.map((option) => (
            <option
              key={option.code}
              value={option.code}
              disabled={!option.available}
            >
              {option.code}
              {option.available ? "" : " — unavailable"}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Shopping destination</span>
        <select
          aria-label="Shopping destination"
          value={destination}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value;
            startTransition(async () => {
              const result = await setDestinationAction(value);
              setMessage(result.message ?? "");
            });
          }}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <span className="sr-only" aria-live="polite">
        {pending ? "Updating shopping preferences" : message}
      </span>
    </div>
  );
}

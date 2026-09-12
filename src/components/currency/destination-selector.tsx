"use client";

import { useState, useTransition } from "react";
import { setDestinationAction } from "@/modules/currency/actions";

export function DestinationSelector({
  destination,
  countries,
}: {
  destination: string;
  countries: { code: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="destination-selector">
      <label htmlFor="cart-destination">Shipping destination</label>
      <select
        id="cart-destination"
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
      <span className="small muted" aria-live="polite">
        {pending ? "Updating destination…" : message}
      </span>
    </div>
  );
}

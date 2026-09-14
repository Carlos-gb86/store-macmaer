"use client";

import { useState, useTransition } from "react";
import { setDestinationAction } from "@/modules/currency/actions";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
import { StorefrontSelect } from "@/components/ui/storefront-select";
import { countryFlag } from "@/modules/country/flag";

export function DestinationSelector({
  destination,
  countries,
}: {
  destination: string;
  countries: { code: string; name: string }[];
}) {
  const { t } = useStorefrontI18n();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="destination-selector">
      <label htmlFor="cart-destination">{t("shippingDestination")}</label>
      <StorefrontSelect
        id="cart-destination"
        ariaLabel={t("shoppingDestination")}
        value={destination}
        disabled={pending}
        options={countries.map((country) => ({
          value: country.code,
          label: country.name,
          leading: countryFlag(country.code),
        }))}
        onValueChange={(value) => {
          startTransition(async () => {
            const result = await setDestinationAction(value);
            setMessage(result.message ?? "");
          });
        }}
      />
      <span className="small muted" aria-live="polite">
        {pending ? t("updatingDestination") : message}
      </span>
    </div>
  );
}

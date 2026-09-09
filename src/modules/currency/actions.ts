"use server";
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { countryCodeSchema } from "@/modules/country/countries";
import { updateCartContext } from "@/modules/cart/repository";
import { requireAdmin } from "@/modules/admin/auth";
import { mutationError } from "@/modules/admin/errors";
import type { Json } from "@/lib/supabase/database.types";
import { EcbFxProvider } from "./provider";
import {
  CURRENCY_COOKIE,
  DESTINATION_COOKIE,
  readStorefrontContext,
} from "./repository";
import { currencySchema } from "./schema";

export type ContextActionResult = { ok: boolean; message?: string };
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  priority: "medium" as const,
};

export async function setCurrencyAction(
  input: unknown,
): Promise<ContextActionResult> {
  const currency = currencySchema.safeParse(input);
  if (!currency.success)
    return { ok: false, message: "Choose a valid currency." };
  const context = await readStorefrontContext();
  if (!context.pricing.availableCurrencies.includes(currency.data))
    return { ok: false, message: "That currency is not currently available." };
  (await cookies()).set(CURRENCY_COOKIE, currency.data, cookieOptions);
  await updateCartContext(currency.data, context.destinationCountry);
  refresh();
  return { ok: true, message: "Currency updated." };
}

export async function setDestinationAction(
  input: unknown,
): Promise<ContextActionResult> {
  const country = countryCodeSchema.safeParse(input);
  if (!country.success)
    return { ok: false, message: "Choose a valid country." };
  const context = await readStorefrontContext();
  if (!context.supportedCountries.includes(country.data))
    return { ok: false, message: "We do not currently ship there." };
  (await cookies()).set(DESTINATION_COOKIE, country.data, cookieOptions);
  await updateCartContext(context.pricing.currency, country.data);
  refresh();
  return { ok: true, message: "Destination updated." };
}

const currencySettingsSchema = z
  .array(
    z.object({
      code: currencySchema,
      enabled: z.boolean(),
      markup_basis_points: z.number().int().min(0).max(10_000),
      rounding_increment_minor: z.number().int().min(1).max(10_000),
    }),
  )
  .length(3)
  .refine(
    (settings) => settings.find((setting) => setting.code === "SEK")?.enabled,
    "SEK must remain enabled.",
  );

export async function saveCurrencySettingsAction(input: unknown) {
  try {
    const settings = currencySettingsSchema.parse(input);
    const { client } = await requireAdmin();
    const { error } = await client.rpc("admin_save_currency_settings", {
      document: settings as unknown as Json,
    });
    if (error) throw error;
    refresh();
    return {
      ok: true as const,
      data: {},
      message: "Currency settings saved.",
    };
  } catch (error) {
    return mutationError(error, "save_currency_settings");
  }
}

export async function refreshCurrencyRatesAction() {
  try {
    const { client } = await requireAdmin();
    const rates = await new EcbFxProvider().fetchRates();
    const records = rates.map((rate) => {
      const numerator = Number(rate.numerator);
      const denominator = Number(rate.denominator);
      if (
        !Number.isSafeInteger(numerator) ||
        !Number.isSafeInteger(denominator)
      )
        throw new Error("The provider rate is outside the supported range.");
      return {
        base_currency: "SEK",
        quote_currency: rate.quoteCurrency,
        rate_numerator: numerator,
        rate_denominator: denominator,
        source: rate.source,
        source_effective_at: rate.effectiveAt,
      };
    });
    const { error } = await client.from("currency_rates").upsert(records, {
      onConflict: "base_currency,quote_currency,source,source_effective_at",
      ignoreDuplicates: true,
    });
    if (error) throw error;
    refresh();
    return {
      ok: true as const,
      data: {},
      message: "Latest ECB rates saved.",
    };
  } catch (error) {
    return mutationError(error, "refresh_currency_rates");
  }
}

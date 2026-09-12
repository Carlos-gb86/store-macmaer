import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getServerEnv } from "@/lib/env/server";
import {
  countryCodeSchema,
  initialSupportedCountryCodes,
} from "@/modules/country/countries";
import {
  currencySchema,
  type Currency,
  type CurrencySetting,
  type FxRate,
  type PricingContext,
} from "./schema";

export const CURRENCY_COOKIE = "macmaer_currency";
export const DESTINATION_COOKIE = "macmaer_destination";

const defaultSetting: CurrencySetting = {
  code: "SEK",
  enabled: true,
  sortOrder: 0,
  markupBasisPoints: 0,
  roundingIncrementMinor: 1,
};
const demoSettings: CurrencySetting[] = [
  defaultSetting,
  { ...defaultSetting, code: "EUR", enabled: false, sortOrder: 1 },
  { ...defaultSetting, code: "USD", enabled: false, sortOrder: 2 },
];

function readCurrency(value?: string): Currency {
  return currencySchema.safeParse(value).data ?? "SEK";
}

function mapSetting(row: {
  code: string;
  enabled: boolean;
  sort_order: number;
  markup_basis_points: number;
  rounding_increment_minor: number;
}): CurrencySetting {
  return {
    code: currencySchema.parse(row.code),
    enabled: row.enabled,
    sortOrder: row.sort_order,
    markupBasisPoints: row.markup_basis_points,
    roundingIncrementMinor: row.rounding_increment_minor,
  };
}

function mapRate(row: {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate_numerator: number;
  rate_denominator: number;
  source: string;
  source_effective_at: string;
  fetched_at: string;
}): FxRate {
  return {
    id: row.id,
    baseCurrency: "SEK",
    quoteCurrency: currencySchema.exclude(["SEK"]).parse(row.quote_currency),
    numerator: BigInt(row.rate_numerator),
    denominator: BigInt(row.rate_denominator),
    source: row.source,
    effectiveAt: row.source_effective_at,
    fetchedAt: row.fetched_at,
  };
}

export type StorefrontContext = {
  destinationCountry: string;
  pricing: PricingContext;
  settings: CurrencySetting[];
  supportedCountries: string[];
};

type CurrencyConfiguration = {
  settings: CurrencySetting[];
  rates: FxRate[];
  supportedCountries: string[];
};

let lastKnownConfiguration: CurrencyConfiguration | null = null;

function fallbackConfiguration(): CurrencyConfiguration {
  return {
    settings: demoSettings,
    rates: [],
    supportedCountries: [...initialSupportedCountryCodes],
  };
}

function buildStorefrontContext(
  requestedCurrency: Currency,
  requestedCountry: string,
  configuration: CurrencyConfiguration,
  configurationUnavailable = false,
): StorefrontContext {
  const { settings, rates, supportedCountries } = configuration;
  const destinationCountry = supportedCountries.includes(requestedCountry)
    ? requestedCountry
    : supportedCountries.includes("SE")
      ? "SE"
      : (supportedCountries[0] ?? "SE");
  const latestRates = new Map<Currency, FxRate>();
  for (const rate of rates)
    if (!latestRates.has(rate.quoteCurrency))
      latestRates.set(rate.quoteCurrency, rate);
  const availableCurrencies = settings
    .filter((setting) => setting.enabled)
    .filter(
      (setting) => setting.code === "SEK" || latestRates.has(setting.code),
    )
    .map((setting) => setting.code);
  const requestedSetting = settings.find(
    (setting) => setting.code === requestedCurrency && setting.enabled,
  );
  const requestedRate = latestRates.get(requestedCurrency) ?? null;
  const usable =
    requestedSetting && (requestedCurrency === "SEK" || requestedRate);
  const setting = usable ? requestedSetting : defaultSetting;
  const currency = usable ? requestedCurrency : "SEK";
  return {
    destinationCountry,
    settings,
    supportedCountries,
    pricing: {
      currency,
      requestedCurrency,
      rate: currency === "SEK" ? null : requestedRate,
      setting,
      availableCurrencies,
      ...(configurationUnavailable
        ? {
            unavailableReason: usable
              ? "Using the most recently loaded currency configuration while the live settings reconnect."
              : "Currency options are temporarily unavailable. Prices are shown in SEK.",
          }
        : !usable && requestedCurrency !== "SEK"
          ? {
              unavailableReason:
                "That currency does not have an available rate.",
            }
          : {}),
    },
  };
}

async function loadCurrencyConfiguration(): Promise<CurrencyConfiguration> {
  const client = createServiceSupabaseClient();
  const [settingsResult, ratesResult, countriesResult] = await Promise.all([
    client.from("store_currencies").select().order("sort_order"),
    client
      .from("currency_rates")
      .select()
      .order("source_effective_at", { ascending: false })
      .order("fetched_at", { ascending: false }),
    client.from("shipping_zone_countries").select("country_code"),
  ]);
  if (settingsResult.error || ratesResult.error || countriesResult.error)
    throw new Error("Currency configuration could not be loaded.");
  const configuration = {
    settings: settingsResult.data.map(mapSetting),
    rates: ratesResult.data.map(mapRate),
    supportedCountries: countriesResult.data.map(
      (country) => country.country_code,
    ),
  };
  lastKnownConfiguration = configuration;
  return configuration;
}

async function readStorefrontContextWithMode(
  strict: boolean,
): Promise<StorefrontContext> {
  const cookieStore = await cookies();
  const requestedCurrency = readCurrency(
    cookieStore.get(CURRENCY_COOKIE)?.value,
  );
  const parsedCountry = countryCodeSchema.safeParse(
    cookieStore.get(DESTINATION_COOKIE)?.value,
  );
  const requestedCountry = parsedCountry.success ? parsedCountry.data : "SE";

  if (getServerEnv().CATALOG_SOURCE === "demo")
    return buildStorefrontContext(
      requestedCurrency,
      requestedCountry,
      fallbackConfiguration(),
      true,
    );

  try {
    return buildStorefrontContext(
      requestedCurrency,
      requestedCountry,
      await loadCurrencyConfiguration(),
    );
  } catch (error) {
    if (strict) throw error;
    console.warn(
      "[currency] Live configuration unavailable; using the last known configuration or SEK fallback.",
    );
    return buildStorefrontContext(
      requestedCurrency,
      requestedCountry,
      lastKnownConfiguration ?? fallbackConfiguration(),
      true,
    );
  }
}

export async function readStorefrontContext(): Promise<StorefrontContext> {
  return readStorefrontContextWithMode(false);
}

export async function readStrictStorefrontContext(): Promise<StorefrontContext> {
  return readStorefrontContextWithMode(true);
}

export const getStorefrontContext = cache(readStorefrontContext);
export const getStrictStorefrontContext = cache(readStrictStorefrontContext);

export async function latestRatesForAdmin() {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("currency_rates")
    .select()
    .order("source_effective_at", { ascending: false });
  if (error) throw error;
  const rates = new Map<Currency, FxRate>();
  for (const row of data) {
    const rate = mapRate(row);
    if (!rates.has(rate.quoteCurrency)) rates.set(rate.quoteCurrency, rate);
  }
  return rates;
}

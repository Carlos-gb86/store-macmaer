import { requireAdminPage } from "@/modules/admin/auth";
import { currencySchema } from "@/modules/currency/schema";
import { CurrencyEditor } from "@/components/admin/currency-editor";

export default async function CurrencySettingsPage() {
  const { client } = await requireAdminPage();
  const [settingsResult, ratesResult] = await Promise.all([
    client.from("store_currencies").select().order("sort_order"),
    client
      .from("currency_rates")
      .select()
      .order("source_effective_at", { ascending: false }),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (ratesResult.error) throw ratesResult.error;
  const latest = new Map<string, (typeof ratesResult.data)[number]>();
  for (const rate of ratesResult.data)
    if (!latest.has(rate.quote_currency)) latest.set(rate.quote_currency, rate);
  return (
    <CurrencyEditor
      initial={settingsResult.data.map((setting) => ({
        code: currencySchema.parse(setting.code),
        enabled: setting.enabled,
        markup_basis_points: setting.markup_basis_points,
        rounding_increment_minor: setting.rounding_increment_minor,
      }))}
      rates={(["EUR", "USD"] as const).map((code) => {
        const rate = latest.get(code);
        return rate
          ? {
              code,
              source: rate.source,
              effectiveAt: rate.source_effective_at,
              fetchedAt: rate.fetched_at,
            }
          : null;
      })}
    />
  );
}

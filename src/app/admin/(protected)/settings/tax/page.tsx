import { TaxEditor } from "@/components/admin/tax-editor";
import { requireAdminPage } from "@/modules/admin/auth";
import { countries } from "@/modules/country/countries";

export default async function TaxSettingsPage() {
  const { client } = await requireAdminPage();
  const [settings, categories, rules] = await Promise.all([
    client.from("tax_settings").select().single(),
    client.from("tax_categories").select().order("name"),
    client.from("tax_rules").select().order("country_code"),
  ]);
  if (settings.error) throw settings.error;
  if (categories.error) throw categories.error;
  if (rules.error) throw rules.error;
  return (
    <TaxEditor
      countries={countries}
      initial={{
        eu_mode: settings.data.eu_mode,
        catalogue_prices_include_vat:
          settings.data.catalogue_prices_include_vat,
        export_rate_basis_points: settings.data.export_rate_basis_points,
        export_message: settings.data.export_message,
        reviewed_at: settings.data.reviewed_at,
        categories: categories.data.map((category) => ({
          key: category.key,
          name: category.name,
          active: category.active,
        })),
        rules: rules.data.map((rule) => ({
          id: rule.id,
          country_code: rule.country_code,
          tax_category_key: rule.tax_category_key,
          rate_basis_points: rule.rate_basis_points,
          valid_from: rule.valid_from,
          valid_to: rule.valid_to,
          enabled: rule.enabled,
          source: rule.source,
          reviewed_at: rule.reviewed_at,
        })),
      }}
    />
  );
}

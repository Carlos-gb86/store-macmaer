import { requireAdminPage } from "@/modules/admin/auth";
import { minorUnitsInput } from "@/modules/admin/money";
import { countries } from "@/modules/country/countries";
import { ShippingEditor } from "@/components/admin/shipping-editor";

export default async function ShippingSettingsPage() {
  const { client } = await requireAdminPage();
  const [
    settings,
    packageClasses,
    zones,
    zoneCountries,
    methods,
    rules,
    taxCategories,
  ] = await Promise.all([
    client.from("shipping_settings").select().single(),
    client.from("shipping_package_classes").select().order("name"),
    client.from("shipping_zones").select().order("sort_order"),
    client.from("shipping_zone_countries").select(),
    client.from("shipping_methods").select().order("sort_order"),
    client.from("shipping_rate_rules").select().order("priority"),
    client.from("tax_categories").select("key,name").eq("active", true),
  ]);
  const failure = [
    settings,
    packageClasses,
    zones,
    zoneCountries,
    methods,
    rules,
    taxCategories,
  ].find((result) => result.error);
  if (failure?.error) throw failure.error;
  return (
    <ShippingEditor
      availableCountries={countries}
      taxCategories={taxCategories.data!}
      initial={{
        packaging_weight_grams: settings.data!.packaging_weight_grams,
        package_classes: packageClasses.data!.map((item) => ({
          key: item.key,
          name: item.name,
          active: item.active,
        })),
        countries: zoneCountries.data!.map((item) => ({
          country_code: item.country_code,
          zone_id: item.zone_id,
        })),
        zones: zones.data!.map((zone) => ({
          id: zone.id,
          key: zone.key,
          name: zone.name,
          active: zone.active,
          sort_order: zone.sort_order,
          methods: methods
            .data!.filter((method) => method.zone_id === zone.id)
            .map((method) => ({
              id: method.id,
              name: method.name,
              carrier: method.carrier,
              tracked: method.tracked,
              estimated_delivery: method.estimated_delivery,
              active: method.active,
              sort_order: method.sort_order,
              rules: rules
                .data!.filter((rule) => rule.method_id === method.id)
                .map((rule) => ({
                  id: rule.id,
                  calculation_type: rule.calculation_type,
                  base_amount: minorUnitsInput(rule.base_amount),
                  additional_item_amount: minorUnitsInput(
                    rule.additional_item_amount,
                  ),
                  min_weight_grams: rule.min_weight_grams,
                  max_weight_grams: rule.max_weight_grams,
                  min_subtotal: minorUnitsInput(rule.min_subtotal),
                  max_subtotal: minorUnitsInput(rule.max_subtotal),
                  package_class_key: rule.package_class_key,
                  free_shipping_threshold: minorUnitsInput(
                    rule.free_shipping_threshold,
                  ),
                  threshold_basis: rule.threshold_basis,
                  price_includes_vat: rule.price_includes_vat,
                  shipping_tax_category_key: rule.shipping_tax_category_key,
                  active: rule.active,
                  priority: rule.priority,
                })),
            })),
        })),
      }}
    />
  );
}

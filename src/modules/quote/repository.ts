import "server-only";
import { cache } from "react";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { CartView } from "@/modules/cart/schema";
import { getStorefrontContext } from "@/modules/currency/repository";
import type { PricingContext } from "@/modules/currency/schema";
import type { DiscountDefinition } from "@/modules/discount/schema";
import type { ShippingZone } from "@/modules/shipping/schema";
import type { TaxRule, TaxSettings } from "@/modules/tax/schema";
import { calculateQuote, displayQuote } from "./calculate";
import type { QuoteConfiguration } from "./schema";

export const getQuoteConfiguration = cache(
  async (): Promise<QuoteConfiguration> => {
    const client = createServiceSupabaseClient();
    const [
      shippingSettings,
      zones,
      countries,
      methods,
      shippingRules,
      taxSettings,
      taxRules,
      discounts,
      discountProducts,
      discountCollections,
      collections,
      redemptions,
    ] = await Promise.all([
      client.from("shipping_settings").select().single(),
      client.from("shipping_zones").select(),
      client.from("shipping_zone_countries").select(),
      client.from("shipping_methods").select(),
      client.from("shipping_rate_rules").select(),
      client.from("tax_settings").select().single(),
      client.from("tax_rules").select(),
      client.from("discounts").select(),
      client.from("discount_products").select(),
      client.from("discount_collections").select(),
      client.from("collections").select("id,slug"),
      client
        .from("discount_redemptions")
        .select("discount_id")
        .eq("status", "REDEEMED"),
    ]);
    const failure = [
      shippingSettings,
      zones,
      countries,
      methods,
      shippingRules,
      taxSettings,
      taxRules,
      discounts,
      discountProducts,
      discountCollections,
      collections,
      redemptions,
    ].find((result) => result.error);
    if (failure?.error)
      throw new Error("Commerce configuration could not be loaded.");
    const shippingZones: ShippingZone[] = zones.data!.map((zone) => ({
      id: zone.id,
      key: zone.key,
      name: zone.name,
      active: zone.active,
      sortOrder: zone.sort_order,
      countryCodes: countries
        .data!.filter((country) => country.zone_id === zone.id)
        .map((country) => country.country_code),
      methods: methods
        .data!.filter((method) => method.zone_id === zone.id)
        .map((method) => ({
          id: method.id,
          name: method.name,
          carrier: method.carrier,
          tracked: method.tracked,
          estimatedDelivery: method.estimated_delivery,
          active: method.active,
          sortOrder: method.sort_order,
          rules: shippingRules
            .data!.filter((rule) => rule.method_id === method.id)
            .map((rule) => ({
              id: rule.id,
              calculationType: rule.calculation_type,
              baseAmount: rule.base_amount,
              additionalItemAmount: rule.additional_item_amount,
              minWeightGrams: rule.min_weight_grams,
              maxWeightGrams: rule.max_weight_grams,
              minSubtotal: rule.min_subtotal,
              maxSubtotal: rule.max_subtotal,
              packageClassKey: rule.package_class_key,
              freeShippingThreshold: rule.free_shipping_threshold,
              thresholdBasis: rule.threshold_basis,
              priceIncludesVat: rule.price_includes_vat,
              shippingTaxCategoryKey: rule.shipping_tax_category_key,
              active: rule.active,
              priority: rule.priority,
            })),
        })),
    }));
    const categorySlugs = new Map(
      collections.data!.map((collection) => [collection.id, collection.slug]),
    );
    const redeemedCounts = new Map<string, number>();
    for (const redemption of redemptions.data!)
      redeemedCounts.set(
        redemption.discount_id,
        (redeemedCounts.get(redemption.discount_id) ?? 0) + 1,
      );
    const discountDefinitions: DiscountDefinition[] = discounts.data!.map(
      (discount) => ({
        id: discount.id,
        code: discount.code,
        name: discount.name,
        kind: discount.kind,
        percentageBasisPoints: discount.percentage_basis_points,
        fixedAmount: discount.fixed_amount,
        minimumSubtotal: discount.minimum_subtotal,
        startsAt: discount.starts_at,
        endsAt: discount.ends_at,
        active: discount.active,
        totalUsageLimit: discount.total_usage_limit,
        redeemedCount: redeemedCounts.get(discount.id) ?? 0,
        perCustomerLimit: discount.per_customer_limit,
        productIds: discountProducts
          .data!.filter((item) => item.discount_id === discount.id)
          .map((item) => item.product_id),
        collectionIds: discountCollections
          .data!.filter((item) => item.discount_id === discount.id)
          .map((item) => categorySlugs.get(item.collection_id))
          .filter((slug): slug is string => Boolean(slug)),
      }),
    );
    const settingsRow = taxSettings.data!;
    const settings: TaxSettings = {
      euMode: settingsRow.eu_mode,
      cataloguePricesIncludeVat: settingsRow.catalogue_prices_include_vat,
      exportRateBasisPoints: settingsRow.export_rate_basis_points,
      exportMessage: settingsRow.export_message,
      reviewedAt: settingsRow.reviewed_at,
    };
    const mappedTaxRules: TaxRule[] = taxRules.data!.map((rule) => ({
      id: rule.id,
      countryCode: rule.country_code,
      taxCategoryKey: rule.tax_category_key,
      rateBasisPoints: rule.rate_basis_points,
      validFrom: rule.valid_from,
      validTo: rule.valid_to,
      enabled: rule.enabled,
      source: rule.source,
      reviewedAt: rule.reviewed_at,
    }));
    return {
      shippingZones,
      packagingWeightGrams: shippingSettings.data!.packaging_weight_grams,
      taxSettings: settings,
      taxRules: mappedTaxRules,
      discounts: discountDefinitions,
    };
  },
);

export async function quoteCart(
  cart: CartView,
  discountCode = cart.discountCode,
  pricingOverride?: PricingContext,
) {
  const [pricing, configuration] = await Promise.all([
    pricingOverride
      ? Promise.resolve(pricingOverride)
      : getStorefrontContext().then((context) => context.pricing),
    getQuoteConfiguration(),
  ]);
  const quote = calculateQuote({
    destinationCountry: cart.destinationCountry,
    discountCode,
    configuration,
    lines: cart.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      collectionIds: line.collectionIds,
      unitAmount: line.baseUnitAmount,
      quantity: line.quantity,
      unitWeightGrams: line.unitWeightGrams,
      shippingClassKey: line.shippingClassKey,
      taxCategoryKey: line.taxCategoryKey,
      valid: line.valid,
    })),
  });
  return displayQuote({
    quote,
    pricing,
    displayedMerchandiseAmount: cart.subtotal,
  });
}

import { getServerEnv } from "@/lib/env/server";
import { getPublicEnv } from "@/lib/env/public";
import { stripeKeyMode } from "@/lib/env/provider-mode";
import { requireAdminPage } from "@/modules/admin/auth";
import { initialSupportedCountryCodes } from "@/modules/country/countries";
import { currentTimestamp } from "@/modules/readiness/clock";

type ReadinessStatus = "READY" | "REVIEW" | "BLOCKED";
type ReadinessCheck = {
  status: ReadinessStatus;
  title: string;
  detail: string;
};

function item(
  status: ReadinessStatus,
  title: string,
  detail: string,
): ReadinessCheck {
  return { status, title, detail };
}

export default async function ReadinessPage() {
  const { client } = await requireAdminPage();
  const env = getServerEnv();
  const publicEnv = getPublicEnv();
  const now = await currentTimestamp();
  const [
    products,
    images,
    currencies,
    rates,
    zones,
    zoneCountries,
    methods,
    shippingRules,
    taxSettings,
    taxRules,
    discounts,
    policies,
    failedEmails,
    webhookEvents,
  ] = await Promise.all([
    client
      .from("products")
      .select(
        "id,title,status,base_price,currency,tax_category_key,inventory_strategy,processing_time,weight_grams,seo_title,seo_description",
      ),
    client.from("product_images").select("product_id,alt"),
    client.from("store_currencies").select().order("sort_order"),
    client
      .from("currency_rates")
      .select("quote_currency,source,source_effective_at,fetched_at")
      .order("source_effective_at", { ascending: false }),
    client.from("shipping_zones").select("id,name,active"),
    client.from("shipping_zone_countries").select("zone_id,country_code"),
    client.from("shipping_methods").select("id,zone_id,name,active"),
    client
      .from("shipping_rate_rules")
      .select("method_id,active,base_amount,free_shipping_threshold"),
    client.from("tax_settings").select().single(),
    client
      .from("tax_rules")
      .select("country_code,enabled,reviewed_at,valid_from,valid_to"),
    client
      .from("discounts")
      .select(
        "code,kind,percentage_basis_points,active,per_customer_limit,starts_at,ends_at",
      ),
    client
      .from("policy_versions")
      .select("policy_type,version,published_at,created_at")
      .order("created_at", { ascending: false }),
    client
      .from("email_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "FAILED"),
    client
      .from("processed_webhook_events")
      .select("event_id", { count: "exact", head: true }),
  ]);
  const results = [
    products,
    images,
    currencies,
    rates,
    zones,
    zoneCountries,
    methods,
    shippingRules,
    taxSettings,
    taxRules,
    discounts,
    policies,
    failedEmails,
    webhookEvents,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const checks: ReadinessCheck[] = [];
  const site = new URL(publicEnv.NEXT_PUBLIC_SITE_URL);
  const publishableMode = stripeKeyMode(
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    "publishable",
  );
  const secretMode = stripeKeyMode(env.STRIPE_SECRET_KEY, "secret");
  checks.push(
    item(
      env.CATALOG_SOURCE === "supabase" ? "READY" : "BLOCKED",
      "Connected catalogue",
      env.CATALOG_SOURCE === "supabase"
        ? "The deployed application uses Supabase rather than sample data."
        : "Production must not use the illustrative demo catalogue.",
    ),
    item(
      site.protocol === "https:" ? "READY" : "BLOCKED",
      "Canonical HTTPS origin",
      `${site.origin}${site.hostname.endsWith("vercel.app") ? " is the safe temporary origin; replace it after the custom domain is connected." : " is configured as the canonical storefront origin."}`,
    ),
    item(
      env.CHECKOUT_ENABLED ? "READY" : "BLOCKED",
      "Checkout feature gate",
      env.CHECKOUT_ENABLED
        ? "Checkout is enabled and all required credentials parsed successfully."
        : "Checkout is disabled.",
    ),
    item(
      publishableMode && publishableMode === secretMode ? "READY" : "BLOCKED",
      "Stripe key pairing",
      publishableMode && publishableMode === secretMode
        ? `The publishable and secret keys both use Stripe ${publishableMode} mode.`
        : "Stripe publishable and secret key modes are missing or do not match.",
    ),
    item(
      env.STRIPE_WEBHOOK_SECRET ? "READY" : "BLOCKED",
      "Stripe webhook signing",
      env.STRIPE_WEBHOOK_SECRET
        ? `${webhookEvents.count ?? 0} signed Stripe event(s) have been recorded. Event subscriptions still require a Dashboard check.`
        : "No webhook signing secret is configured.",
    ),
    item(
      env.REFUNDS_ENABLED ? "READY" : "BLOCKED",
      "Refund feature gate",
      env.REFUNDS_ENABLED
        ? "Provider-authoritative refunds are enabled."
        : "Refund requests are disabled.",
    ),
    item(
      !env.EMAIL_ENABLED
        ? "BLOCKED"
        : (failedEmails.count ?? 0) > 0
          ? "REVIEW"
          : "READY",
      "Transactional email",
      env.EMAIL_ENABLED
        ? `Resend delivery is enabled. ${failedEmails.count ?? 0} delivery record(s) currently have failed status.`
        : "Transactional email delivery is disabled.",
    ),
    item(
      env.SEO_INDEXING_ENABLED ? "REVIEW" : "READY",
      "Search indexing gate",
      env.SEO_INDEXING_ENABLED
        ? "Indexing is enabled; confirm the canonical domain and final content immediately."
        : "Indexing is intentionally disabled for the Vercel-address soft launch.",
    ),
  );

  const activeProducts = products.data!.filter(
    (product) => product.status === "active",
  );
  const imageProductIds = new Set(
    images.data!.map((image) => image.product_id),
  );
  const incompleteProducts = activeProducts.filter(
    (product) =>
      product.base_price <= 0 ||
      product.currency !== "SEK" ||
      !product.tax_category_key ||
      !product.processing_time ||
      !product.weight_grams ||
      !imageProductIds.has(product.id),
  );
  const missingAlt = images.data!.filter((image) => !image.alt.trim()).length;
  const missingSeo = activeProducts.filter(
    (product) => !product.seo_title?.trim() || !product.seo_description?.trim(),
  ).length;
  checks.push(
    item(
      activeProducts.length ? "READY" : "BLOCKED",
      "Active catalogue",
      `${activeProducts.length} active product(s) are available. Final WooCommerce migration and product approval remain owner launch tasks.`,
    ),
    item(
      incompleteProducts.length === 0 ? "READY" : "REVIEW",
      "Purchasable product data",
      incompleteProducts.length
        ? `${incompleteProducts.length} active product(s) need price, SEK currency, tax category, processing time, weight, or photography reviewed.`
        : "Every active product has the operational data needed for pricing and shipping.",
    ),
    item(
      missingAlt === 0 ? "READY" : "REVIEW",
      "Product image descriptions",
      missingAlt
        ? `${missingAlt} product image(s) need alternative text.`
        : "Every product image has alternative text.",
    ),
    item(
      missingSeo === 0 ? "READY" : "REVIEW",
      "Product search metadata",
      missingSeo
        ? `${missingSeo} active product(s) need a search title or description.`
        : "Every active product has explicit search metadata.",
    ),
    item(
      activeProducts.every(
        (product) => product.inventory_strategy === "MADE_TO_ORDER",
      )
        ? "READY"
        : "REVIEW",
      "Made-to-order configuration",
      "Every Macmaer product should be reviewed as made to order before launch.",
    ),
  );

  const activeZones = new Set(
    zones.data!.filter((zone) => zone.active).map((zone) => zone.id),
  );
  const activeMethods = methods.data!.filter(
    (method) => method.active && activeZones.has(method.zone_id),
  );
  const activeMethodIds = new Set(activeMethods.map((method) => method.id));
  const activeRules = shippingRules.data!.filter(
    (rule) => rule.active && activeMethodIds.has(rule.method_id),
  );
  const methodZone = new Map(
    methods.data!.map((method) => [method.id, method.zone_id]),
  );
  const countriesByZone = new Map<string, string[]>();
  for (const country of zoneCountries.data!)
    countriesByZone.set(country.zone_id, [
      ...(countriesByZone.get(country.zone_id) ?? []),
      country.country_code,
    ]);
  const configuredCountries = new Set(
    zoneCountries.data!.map((country) => country.country_code),
  );
  const destinationsMatch =
    configuredCountries.size === initialSupportedCountryCodes.length &&
    initialSupportedCountryCodes.every((country) =>
      configuredCountries.has(country),
    );
  const freeShippingCountries = new Set(
    activeRules
      .filter((rule) => rule.free_shipping_threshold !== null)
      .flatMap(
        (rule) =>
          countriesByZone.get(methodZone.get(rule.method_id) ?? "") ?? [],
      ),
  );
  const swedenFreeRule = activeRules.some(
    (rule) =>
      rule.free_shipping_threshold === 50_000 &&
      (
        countriesByZone.get(methodZone.get(rule.method_id) ?? "") ?? []
      ).includes("SE"),
  );
  checks.push(
    item(
      destinationsMatch ? "READY" : "REVIEW",
      "Shipping destinations",
      `${zoneCountries.data!.length} of ${initialSupportedCountryCodes.length} approved countries are assigned to a shipping zone.`,
    ),
    item(
      activeMethods.length > 0 &&
        activeMethods.every((method) =>
          activeRules.some((rule) => rule.method_id === method.id),
        )
        ? "READY"
        : "BLOCKED",
      "Active shipping coverage",
      `${activeZones.size} active zone(s), ${activeMethods.length} active method(s), and ${activeRules.length} active rate rule(s) are configured.`,
    ),
    item(
      swedenFreeRule &&
        [...freeShippingCountries].every((country) => country === "SE")
        ? "READY"
        : "BLOCKED",
      "Domestic free shipping",
      "The 500 SEK free-shipping threshold must apply only to Sweden; other destinations must have no free threshold.",
    ),
    item(
      "REVIEW",
      "Shipping owner review",
      "Confirm the 80 SEK Sweden fee, 250 SEK international fee, marginal formulas, delivery estimates, PostNord/UPS workflow, and packaging weight in Shipping settings.",
    ),
  );

  const activeTaxRules = taxRules.data!.filter((rule) => rule.enabled);
  const unreviewedTaxRules = activeTaxRules.filter((rule) => !rule.reviewed_at);
  checks.push(
    item(
      activeTaxRules.length ? "READY" : "BLOCKED",
      "Destination VAT coverage",
      `${activeTaxRules.length} active destination rule(s) are configured.`,
    ),
    item(
      taxSettings.data!.reviewed_at && unreviewedTaxRules.length === 0
        ? "READY"
        : "REVIEW",
      "Tax owner/accountant review",
      taxSettings.data!.reviewed_at && unreviewedTaxRules.length === 0
        ? "The tax strategy and every active rate are marked reviewed."
        : `${unreviewedTaxRules.length} active rate(s), or the overall destination/OSS strategy, still require explicit review.`,
    ),
  );

  type RateRow = NonNullable<typeof rates.data>[number];
  const latestRate = new Map<string, RateRow>();
  for (const rate of rates.data!)
    if (!latestRate.has(rate.quote_currency))
      latestRate.set(rate.quote_currency, rate);
  const missingRates = currencies
    .data!.filter((currency) => currency.enabled && currency.code !== "SEK")
    .filter((currency) => !latestRate.has(currency.code));
  const staleRates = [...latestRate.values()].filter(
    (rate) => now - new Date(rate.fetched_at).getTime() > 7 * 86_400_000,
  );
  checks.push(
    item(
      missingRates.length === 0 ? "READY" : "BLOCKED",
      "Display currencies",
      missingRates.length
        ? `${missingRates.map((currency) => currency.code).join(", ")} is enabled without a stored rate.`
        : "Every enabled non-SEK currency has a stored fallback exchange rate.",
    ),
    item(
      staleRates.length === 0 ? "READY" : "REVIEW",
      "Exchange-rate freshness",
      staleRates.length
        ? `${staleRates.length} latest exchange rate(s) were fetched more than seven days ago.`
        : "Latest stored rates were fetched within seven days.",
    ),
  );

  const activeDiscounts = discounts.data!.filter((discount) => discount.active);
  const macmaer10 = activeDiscounts.find(
    (discount) => discount.code === "MACMAER10",
  );
  checks.push(
    item(
      activeDiscounts.length === 1 &&
        macmaer10?.kind === "PERCENTAGE" &&
        macmaer10.percentage_basis_points === 1000 &&
        macmaer10.per_customer_limit === 1
        ? "READY"
        : "REVIEW",
      "Active promotion",
      `${activeDiscounts.length} active discount(s) found. Expected only MACMAER10 at 10%, once per email or telephone identity.`,
    ),
  );

  const policyTypes = new Set(
    policies.data!.map((policy) => policy.policy_type),
  );
  const publishedPolicyTypes = new Set(
    policies
      .data!.filter((policy) => policy.published_at)
      .map((policy) => policy.policy_type),
  );
  checks.push(
    item(
      policyTypes.size === 5 ? "READY" : "BLOCKED",
      "Checkout policy snapshots",
      `${policyTypes.size} of 5 required policy types have immutable database snapshots.`,
    ),
    item(
      publishedPolicyTypes.size === 5 ? "READY" : "REVIEW",
      "Policy approval",
      `${publishedPolicyTypes.size} of 5 policy types are marked published. Legal wording and the future macmaer.se reference require final owner review.`,
    ),
    item(
      "REVIEW",
      "Backup and recovery",
      "Confirm the Supabase plan, latest database backup, Storage backup procedure, restoration owner, and recovery steps in the provider dashboards.",
    ),
    item(
      "REVIEW",
      "Final acceptance run",
      "After macmaer.se is connected: register Stripe payment domains, verify wallets, submit one small live payment and refund, test email delivery, review redirects, and then enable indexing.",
    ),
  );

  const totals = checks.reduce(
    (summary, check) => {
      summary[check.status] += 1;
      return summary;
    },
    { READY: 0, REVIEW: 0, BLOCKED: 0 },
  );

  return (
    <>
      <h1>Launch readiness</h1>
      <p className="section-intro">
        A read-only production checklist. It never displays credentials or
        customer data. “Review” includes deliberate soft-launch gates and owner
        decisions; “Blocked” identifies a technical prerequisite that is
        currently missing.
      </p>
      <div className="readiness-summary" aria-label="Readiness summary">
        {(["READY", "REVIEW", "BLOCKED"] as const).map((status) => (
          <div className={`readiness-count readiness-${status}`} key={status}>
            <strong>{totals[status]}</strong>
            <span>{status.toLowerCase()}</span>
          </div>
        ))}
      </div>
      <div className="readiness-list">
        {checks.map((check) => (
          <section className="admin-card readiness-item" key={check.title}>
            <span className={`readiness-badge readiness-${check.status}`}>
              {check.status}
            </span>
            <div>
              <h2>{check.title}</h2>
              <p>{check.detail}</p>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

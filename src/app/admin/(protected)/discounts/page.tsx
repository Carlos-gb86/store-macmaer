import { DiscountEditor } from "@/components/admin/discount-editor";
import { requireAdminPage } from "@/modules/admin/auth";
import { minorUnitsInput } from "@/modules/admin/money";

function localDateTime(value: string | null) {
  return value ? value.slice(0, 16) : null;
}

export default async function DiscountsPage() {
  const { client } = await requireAdminPage();
  const [
    discounts,
    products,
    collections,
    productRestrictions,
    collectionRestrictions,
    redemptions,
  ] = await Promise.all([
    client.from("discounts").select().order("created_at"),
    client.from("products").select("id,title").order("title"),
    client.from("collections").select("id,name").order("name"),
    client.from("discount_products").select(),
    client.from("discount_collections").select(),
    client
      .from("discount_redemptions")
      .select("discount_id")
      .eq("status", "REDEEMED"),
  ]);
  const failure = [
    discounts,
    products,
    collections,
    productRestrictions,
    collectionRestrictions,
    redemptions,
  ].find((result) => result.error);
  if (failure?.error) throw failure.error;
  return (
    <DiscountEditor
      products={products.data!}
      collections={collections.data!}
      redemptionCounts={Object.fromEntries(
        discounts.data!.map((discount) => [
          discount.id,
          redemptions.data!.filter((item) => item.discount_id === discount.id)
            .length,
        ]),
      )}
      initial={discounts.data!.map((discount) => ({
        id: discount.id,
        code: discount.code,
        name: discount.name,
        kind: discount.kind,
        percentage_basis_points: discount.percentage_basis_points,
        fixed_amount: minorUnitsInput(discount.fixed_amount),
        minimum_subtotal: minorUnitsInput(discount.minimum_subtotal),
        starts_at: localDateTime(discount.starts_at),
        ends_at: localDateTime(discount.ends_at),
        active: discount.active,
        total_usage_limit: discount.total_usage_limit,
        per_customer_limit: discount.per_customer_limit,
        product_ids: productRestrictions
          .data!.filter((item) => item.discount_id === discount.id)
          .map((item) => item.product_id),
        collection_ids: collectionRestrictions
          .data!.filter((item) => item.discount_id === discount.id)
          .map((item) => item.collection_id),
      }))}
    />
  );
}

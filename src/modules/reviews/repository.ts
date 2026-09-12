import "server-only";

import { createHmac } from "node:crypto";
import { unstable_cache } from "next/cache";
import { getServerEnv } from "@/lib/env/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { normalizeEmail } from "@/modules/checkout/repository";
import {
  reviewSchema,
  testimonialSchema,
  type ProductReview,
  type Testimonial,
} from "./schema";

function emailHash(email: string) {
  const secret = getServerEnv().CUSTOMER_IDENTITY_HASH_SECRET;
  if (!secret) throw new Error("Review identity protection is not configured.");
  return createHmac("sha256", secret)
    .update(normalizeEmail(email))
    .digest("hex");
}

const readProductReviews = unstable_cache(
  async (productId: string): Promise<ProductReview[]> => {
    const { data, error } = await createPublicSupabaseClient()
      .from("product_reviews")
      .select(
        "id,product_id,display_name,rating,title,body,status,verified_purchase,source,created_at,updated_at",
      )
      .eq("product_id", productId)
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return reviewSchema.array().parse(data);
  },
  ["public-product-reviews-v1"],
  { revalidate: 60, tags: ["reviews"] },
);

export async function getProductReviews(productId: string) {
  if (getServerEnv().CATALOG_SOURCE === "demo") return [];
  try {
    return await readProductReviews(productId);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "reviews_read_failed",
        productId,
        code:
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "unknown",
      }),
    );
    return [];
  }
}

const readTestimonials = unstable_cache(
  async (): Promise<Testimonial[]> => {
    const { data, error } = await createPublicSupabaseClient()
      .from("testimonials")
      .select("id,review_id,quote,attribution,active,sort_order")
      .eq("active", true)
      .order("sort_order")
      .order("id")
      .limit(12);
    if (error) throw error;
    return testimonialSchema.array().parse(data);
  },
  ["public-testimonials-v1"],
  { revalidate: 60, tags: ["reviews"] },
);

export async function getTestimonials() {
  if (getServerEnv().CATALOG_SOURCE === "demo") return [];
  try {
    return await readTestimonials();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "testimonials_read_failed",
        code:
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "unknown",
      }),
    );
    return [];
  }
}

export async function saveReviewSubmission(input: {
  productId: string;
  displayName: string;
  email: string;
  rating: number;
  title: string;
  body: string;
}) {
  const client = createServiceSupabaseClient();
  const { data: product, error: productError } = await client
    .from("products")
    .select("id")
    .eq("id", input.productId)
    .eq("status", "active")
    .maybeSingle();
  if (productError) throw productError;
  if (!product) throw new Error("The product is not available for review.");
  const hash = emailHash(input.email);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await client
    .from("product_reviews")
    .select("id", { count: "exact", head: true })
    .eq("email_hash", hash)
    .gte("created_at", since);
  if (countError) throw countError;
  if ((count ?? 0) >= 3)
    throw new Error("Too many reviews were submitted recently.");

  const { data: orders, error: orderError } = await client
    .from("orders")
    .select("id")
    .eq("email_identity_hash", hash)
    .in("payment_status", ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (orderError) throw orderError;
  let orderId: string | null = null;
  if (orders.length) {
    const { data: item, error: itemError } = await client
      .from("order_items")
      .select("order_id")
      .eq("product_id", input.productId)
      .in(
        "order_id",
        orders.map((order) => order.id),
      )
      .limit(1)
      .maybeSingle();
    if (itemError) throw itemError;
    orderId = item?.order_id ?? null;
  }

  const { error } = await client.from("product_reviews").insert({
    product_id: input.productId,
    order_id: orderId,
    display_name: input.displayName,
    email_hash: hash,
    rating: input.rating,
    title: input.title,
    body: input.body,
    verified_purchase: orderId !== null,
    status: "PENDING",
    source: "CUSTOMER",
  });
  if (error) throw error;
}

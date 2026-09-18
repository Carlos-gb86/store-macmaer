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

export type ProductReviewSummary = {
  average: number;
  count: number;
};

export type ProductReviewSummaries = Record<string, ProductReviewSummary>;

export function summarizeProductReviews(
  reviews: Pick<ProductReview, "product_id" | "rating">[],
): ProductReviewSummaries {
  const totals: Record<string, { count: number; total: number }> = {};
  for (const review of reviews) {
    const current = totals[review.product_id] ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += review.rating;
    totals[review.product_id] = current;
  }
  return Object.fromEntries(
    Object.entries(totals).map(([productId, value]) => [
      productId,
      { average: value.total / value.count, count: value.count },
    ]),
  );
}

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

const readProductReviewSummaries = unstable_cache(
  async (): Promise<ProductReviewSummaries> => {
    const pageSize = 500;
    const reviews: Pick<ProductReview, "product_id" | "rating">[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await createPublicSupabaseClient()
        .from("product_reviews")
        .select("product_id,rating")
        .eq("status", "APPROVED")
        .order("product_id")
        .order("id")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      reviews.push(...data);
      if (data.length < pageSize) break;
    }
    return summarizeProductReviews(reviews);
  },
  ["public-product-review-summaries-v1"],
  { revalidate: 60, tags: ["reviews"] },
);

export async function getProductReviewSummaries() {
  if (getServerEnv().CATALOG_SOURCE === "demo") return {};
  try {
    return await readProductReviewSummaries();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "review_summaries_read_failed",
        code:
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "unknown",
      }),
    );
    return {};
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
  const hash = emailHash(input.email);
  const { error } = await client.rpc("submit_product_review", {
    document: {
      product_id: input.productId,
      display_name: input.displayName,
      email_hash: hash,
      rating: input.rating,
      title: input.title,
      body: input.body,
    },
  });
  if (error) {
    if (/too many reviews/i.test(error.message))
      throw new Error("Too many reviews were submitted recently.");
    if (/not available for review/i.test(error.message))
      throw new Error("The product is not available for review.");
    throw error;
  }
}

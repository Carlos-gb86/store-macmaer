"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/modules/admin/auth";
import { saveReviewSubmission } from "./repository";
import {
  reviewStatusSchema,
  reviewSubmissionSchema,
  type ReviewFormState,
} from "./schema";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function submitReviewAction(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const sv = (await getStorefrontLocale()) === "sv";
  const submissionId = Date.now();
  const parsed = reviewSubmissionSchema.safeParse({
    productId: formData.get("productId"),
    productSlug: formData.get("productSlug"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body"),
    company: formData.get("company") ?? "",
  });
  if (!parsed.success) {
    const errors: ReviewFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        typeof field === "string" &&
        field in
          {
            displayName: 1,
            email: 1,
            rating: 1,
            title: 1,
            body: 1,
          }
      )
        errors[field as keyof NonNullable<ReviewFormState["fieldErrors"]>] =
          issue.message;
    }
    return {
      ok: false,
      message: sv
        ? "Kontrollera de markerade fälten."
        : "Please check the highlighted fields.",
      submissionId,
      fieldErrors: errors,
    };
  }
  if (parsed.data.company)
    return {
      ok: true,
      message: sv
        ? "Tack. Din recension har skickats för granskning."
        : "Thank you. Your review was submitted for moderation.",
      submissionId,
    };
  try {
    await saveReviewSubmission(parsed.data);
    return {
      ok: true,
      message: sv
        ? "Tack. Din recension har skickats och visas efter granskning."
        : "Thank you. Your review was submitted and will appear after moderation.",
      submissionId,
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "review_submission_failed",
        code:
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "unknown",
      }),
    );
    return {
      ok: false,
      message:
        error instanceof Error && /too many reviews/i.test(error.message)
          ? sv
            ? "För många recensioner har skickats nyligen. Försök igen senare."
            : "Too many reviews were submitted recently. Please try again later."
          : sv
            ? "Din recension kunde inte skickas just nu. Försök igen."
            : "Your review could not be submitted right now. Please try again.",
      submissionId,
    };
  }
}

export async function moderateReviewAction(formData: FormData) {
  const { client } = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const status = reviewStatusSchema.parse(formData.get("status"));
  const { error } = await client
    .from("product_reviews")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
  updateTag("reviews");
  redirect("/admin/reviews");
}

export async function featureReviewAction(formData: FormData) {
  const { client } = await requireAdmin();
  const reviewId = z.uuid().parse(formData.get("id"));
  const { data: review, error } = await client
    .from("product_reviews")
    .select("id,display_name,body,status")
    .eq("id", reviewId)
    .single();
  if (error) throw error;
  if (review.status !== "APPROVED")
    throw new Error("Approve the review first.");
  const { error: saveError } = await client.from("testimonials").upsert(
    {
      review_id: review.id,
      quote: review.body.slice(0, 1000),
      attribution: review.display_name,
      active: true,
    },
    { onConflict: "review_id" },
  );
  if (saveError) throw saveError;
  updateTag("reviews");
  redirect("/admin/reviews");
}

export async function saveTestimonialAction(formData: FormData) {
  const { client } = await requireAdmin();
  const idValue = String(formData.get("id") ?? "");
  const document = z
    .object({
      quote: z.string().trim().min(10).max(1000),
      attribution: z.string().trim().min(1).max(120),
      active: z.string().nullable().transform(Boolean),
      sort_order: z.coerce.number().int().min(-10000).max(10000),
    })
    .parse({
      quote: formData.get("quote"),
      attribution: formData.get("attribution"),
      active: formData.get("active"),
      sort_order: formData.get("sort_order"),
    });
  const query = idValue
    ? client
        .from("testimonials")
        .update(document)
        .eq("id", z.uuid().parse(idValue))
    : client.from("testimonials").insert(document);
  const { error } = await query;
  if (error) throw error;
  updateTag("reviews");
  redirect("/admin/reviews");
}

export async function deleteTestimonialAction(formData: FormData) {
  const { client } = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const { error } = await client.from("testimonials").delete().eq("id", id);
  if (error) throw error;
  updateTag("reviews");
  redirect("/admin/reviews");
}

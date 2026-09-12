import { z } from "zod";

const cleanText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const reviewSubmissionSchema = z.object({
  productId: z.uuid(),
  productSlug: cleanText(1, 200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayName: cleanText(1, 100),
  email: z.string().trim().max(320).pipe(z.email()),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).default(""),
  body: cleanText(10, 5000),
  company: z.string().max(200).default(""),
});

export const reviewStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const reviewSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  display_name: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string(),
  body: z.string(),
  status: reviewStatusSchema,
  verified_purchase: z.boolean(),
  source: z.enum(["CUSTOMER", "WOOCOMMERCE", "ADMIN"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export const testimonialSchema = z.object({
  id: z.uuid(),
  review_id: z.uuid().nullable(),
  quote: z.string(),
  attribution: z.string(),
  active: z.boolean(),
  sort_order: z.number().int(),
});

export type ProductReview = z.infer<typeof reviewSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;

export type ReviewFormState = {
  ok: boolean;
  message: string;
  submissionId: number;
  fieldErrors?: Partial<
    Record<"displayName" | "email" | "rating" | "title" | "body", string>
  >;
};

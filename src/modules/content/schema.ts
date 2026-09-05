import { z } from "zod";
const text = z.string().max(10000);
export const homepageSchema = z.object({
  id: z.literal(true),
  announcement: text,
  hero_eyebrow: text,
  hero_title: text,
  hero_subtitle: text,
  hero_image: text,
  hero_alt: text,
  hero_asset_id: z.uuid().nullable(),
  hero_cta_label: text,
  hero_cta_path: z
    .string()
    .regex(/^\/(?!\/)[^\\\s]*$/, "Use a local path such as /shop."),
  hero_visible: z.boolean(),
  story_eyebrow: text,
  story_title: text,
  story_text: text,
  story_image: text,
  story_alt: text,
  story_asset_id: z.uuid().nullable(),
  story_visible: z.boolean(),
  featured_visible: z.boolean(),
  collections_visible: z.boolean(),
  updated_at: z.string(),
  product_ids: z.array(z.uuid()).max(50),
  collection_ids: z.array(z.uuid()).max(50),
});
export type Homepage = z.infer<typeof homepageSchema>;
export const homepageDefaults: Homepage = {
  id: true,
  announcement: "A little handmade warmth, from Sweden to your home",
  hero_eyebrow: "Sculptural shapes. Everyday softness.",
  hero_title: "A softer kind of home.",
  hero_subtitle:
    "Thoughtfully knotted pillows and little things to love. Made by hand, to make a space your own.",
  hero_image: "/images/catalogue/story.jpg",
  hero_alt: "Sculptural ivory knot pillow beside a ceramic vase",
  hero_asset_id: null,
  hero_cta_label: "Discover the collection",
  hero_cta_path: "/shop",
  hero_visible: true,
  story_eyebrow: "From our hands to your home",
  story_title: "Made slowly. Loved for longer.",
  story_text:
    "We believe the things around us should have a little soul. A beautiful texture. An unexpected shape. The quiet character of something made by hand.\n\nMacmaer brings together Scandinavian simplicity and a love of making — one knot at a time.",
  story_image: "/images/catalogue/cotton.jpg",
  story_alt: "A handmade ivory knot pillow held close",
  story_asset_id: null,
  story_visible: true,
  featured_visible: true,
  collections_visible: true,
  updated_at: "",
  product_ids: [],
  collection_ids: [],
};

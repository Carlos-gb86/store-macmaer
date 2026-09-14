import type { Catalogue, Collection, Product } from "@/modules/catalog/schema";
import type { Homepage } from "@/modules/content/schema";
import type { StorefrontLocale } from "./config";

function swedish(value: string | null | undefined, fallback: string) {
  return value?.trim() ? value : fallback;
}

export function localizeProduct(
  product: Product,
  locale: StorefrontLocale,
): Product {
  if (locale === "en") return product;
  return {
    ...product,
    title: swedish(product.title_sv, product.title),
    subtitle: swedish(product.subtitle_sv, product.subtitle ?? "") || null,
    short_description: swedish(
      product.short_description_sv,
      product.short_description,
    ),
    description: swedish(product.description_sv, product.description),
    description_document:
      product.description_document_sv ?? product.description_document,
    materials: swedish(product.materials_sv, product.materials),
    care: swedish(product.care_sv, product.care),
    processing_time:
      swedish(product.processing_time_sv, product.processing_time ?? "") ||
      null,
    seo_title: swedish(product.seo_title_sv, product.seo_title ?? "") || null,
    seo_description:
      swedish(product.seo_description_sv, product.seo_description ?? "") ||
      null,
    images: product.images.map((image) => ({
      ...image,
      alt: swedish(image.alt_sv, image.alt),
    })),
    options: product.options.map((option) => ({
      ...option,
      label: swedish(option.label_sv, option.label),
      values: option.values.map((value) => ({
        ...value,
        label: swedish(value.label_sv, value.label),
      })),
    })),
    variants: product.variants.map((variant) => ({
      ...variant,
      title: swedish(variant.title_sv, variant.title),
    })),
  };
}

export function localizeCollection(
  collection: Collection,
  locale: StorefrontLocale,
): Collection {
  if (locale === "en") return collection;
  return {
    ...collection,
    name: swedish(collection.name_sv, collection.name),
    description: swedish(collection.description_sv, collection.description),
    description_document:
      collection.description_document_sv ?? collection.description_document,
    image_alt: swedish(collection.image_alt_sv, collection.image_alt),
    seo_title:
      swedish(collection.seo_title_sv, collection.seo_title ?? "") || null,
    seo_description:
      swedish(
        collection.seo_description_sv,
        collection.seo_description ?? "",
      ) || null,
  };
}

export function localizeCatalogue(
  catalogue: Catalogue,
  locale: StorefrontLocale,
): Catalogue {
  if (locale === "en") return catalogue;
  return {
    products: catalogue.products.map((product) =>
      localizeProduct(product, locale),
    ),
    collections: catalogue.collections.map((collection) =>
      localizeCollection(collection, locale),
    ),
    tagDefinitions: catalogue.tagDefinitions.map((tag) => ({
      ...tag,
      name: swedish(tag.name_sv, tag.name),
    })),
  };
}

export function localizeHomepage(
  content: Homepage,
  locale: StorefrontLocale,
): Homepage {
  if (locale === "en") return content;
  return {
    ...content,
    announcement: swedish(content.announcement_sv, content.announcement),
    hero_eyebrow: swedish(content.hero_eyebrow_sv, content.hero_eyebrow),
    hero_title: swedish(content.hero_title_sv, content.hero_title),
    hero_subtitle: swedish(content.hero_subtitle_sv, content.hero_subtitle),
    hero_alt: swedish(content.hero_alt_sv, content.hero_alt),
    hero_cta_label: swedish(content.hero_cta_label_sv, content.hero_cta_label),
    story_eyebrow: swedish(content.story_eyebrow_sv, content.story_eyebrow),
    story_title: swedish(content.story_title_sv, content.story_title),
    story_text: swedish(content.story_text_sv, content.story_text),
    story_alt: swedish(content.story_alt_sv, content.story_alt),
  };
}

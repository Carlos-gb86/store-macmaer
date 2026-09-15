"use client";

import Image, { type CatalogueImageProps } from "./catalogue-image";
import { resolveImage } from "@/modules/media/resolve-image";
import type { ProductImage as ImageData } from "@/modules/catalog/schema";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
export function ProductImage({
  image,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  onLoad,
  onUnavailable,
}: {
  image?: ImageData;
  sizes?: string;
  priority?: boolean;
  onLoad?: CatalogueImageProps["onLoad"];
  onUnavailable?: () => void;
}) {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  if (!image)
    return (
      <div className="image-placeholder">
        <span className="placeholder-colours" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>{sv ? "Färgstudier" : "Colour studies"}</span>
        <small>
          {sv ? "Fotografi kommer snart" : "Photography coming soon"}
        </small>
      </div>
    );
  return (
    <Image
      src={image.resolved_src ?? resolveImage(image.path)}
      unoptimized={image.private}
      alt={image.alt}
      fill
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className="product-photo"
      onLoad={onLoad}
      onUnavailable={onUnavailable}
    />
  );
}

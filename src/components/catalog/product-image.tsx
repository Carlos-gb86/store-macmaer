import Image from "next/image";
import { resolveImage } from "@/modules/media/resolve-image";
import type { ProductImage as ImageData } from "@/modules/catalog/schema";
export function ProductImage({
  image,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
}: {
  image?: ImageData;
  sizes?: string;
  priority?: boolean;
}) {
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
        <span>Colour studies</span>
        <small>Photography coming soon</small>
      </div>
    );
  return (
    <Image
      src={image.resolved_src ?? resolveImage(image.path)}
      unoptimized={image.private}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      className="product-photo"
    />
  );
}

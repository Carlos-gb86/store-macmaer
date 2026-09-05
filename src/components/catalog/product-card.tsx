import Link from "next/link";
import type { Product } from "@/modules/catalog/schema";
import { formatCataloguePrice } from "@/modules/catalog/format";
import { ProductImage } from "./product-image";
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <article className="product-card">
      <Link href={"/products/" + product.slug}>
        <div className="product-card-image">
          <ProductImage image={product.images[0]} priority={priority} />
          {product.inventory_strategy === "UNAVAILABLE" && (
            <span className="image-label">Currently unavailable</span>
          )}
        </div>
        <div className="product-card-caption">
          <h3>{product.title}</h3>
          <span aria-hidden="true">↗</span>
        </div>
        <p className="small muted">
          {product.variants.length > 0 ||
          product.options.some((o) => o.affects_price)
            ? "From "
            : ""}
          {formatCataloguePrice(product.base_price, product.currency)}
        </p>
      </Link>
    </article>
  );
}

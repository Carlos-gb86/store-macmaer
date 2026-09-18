import Link from "next/link";
import type { Product } from "@/modules/catalog/schema";
import type { PricingContext } from "@/modules/currency/schema";
import { formatMoney } from "@/modules/currency/money";
import {
  calculateProductStartingPrice,
  displayAmount,
} from "@/modules/pricing/calculate";
import { ProductImage } from "./product-image";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { storefrontMessages } from "@/modules/i18n/messages";
import type { ProductReviewSummary } from "@/modules/reviews/repository";

function StarRating({
  summary,
  label,
}: {
  summary: ProductReviewSummary;
  label: string;
}) {
  const percentage = (summary.average / 5) * 100;
  const stars = Array.from({ length: 5 }, (_, index) => (
    <svg key={index} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2.6 2.83 5.74 6.34.92-4.59 4.47 1.08 6.31L12 17.06l-5.66 2.98 1.08-6.31-4.59-4.47 6.34-.92L12 2.6Z" />
    </svg>
  ));
  return (
    <span className="product-card-rating" aria-label={label}>
      <span className="product-card-stars" aria-hidden="true">
        <span className="product-card-stars-empty">{stars}</span>
        <span
          className="product-card-stars-filled"
          style={{ width: `${percentage}%` }}
        >
          {stars}
        </span>
      </span>
      <span className="product-card-rating-value">
        {summary.average.toFixed(1)} ({summary.count})
      </span>
    </span>
  );
}

export function ProductCard({
  product,
  pricing,
  priority = false,
  locale,
  reviewSummary,
}: {
  product: Product;
  pricing: PricingContext;
  priority?: boolean;
  locale: StorefrontLocale;
  reviewSummary?: ProductReviewSummary;
}) {
  const t = storefrontMessages[locale];
  const price = displayAmount(calculateProductStartingPrice(product), pricing);
  const configurable =
    product.variants.length > 0 || product.options.length > 0;
  const ratingLabel = reviewSummary
    ? `${reviewSummary.average.toFixed(1)} ${t.ratingOutOfFive}, ${reviewSummary.count} ${reviewSummary.count === 1 ? t.review : t.reviews}`
    : "";
  return (
    <article className="product-card">
      <Link href={"/products/" + product.slug}>
        <div className="product-card-image">
          <ProductImage image={product.images[0]} priority={priority} />
          {product.inventory_strategy === "UNAVAILABLE" && (
            <span className="image-label">{t.currentlyUnavailable}</span>
          )}
        </div>
        <div className="product-card-body">
          <h3>{product.title}</h3>
          <div className="product-card-footer">
            <div className="product-card-meta">
              {reviewSummary && (
                <StarRating summary={reviewSummary} label={ratingLabel} />
              )}
              <p className="product-card-price">
                {product.variants.length > 0 ||
                product.options.some((o) => o.affects_price)
                  ? `${t.from} `
                  : ""}
                {formatMoney(price, pricing.currency)}
              </p>
            </div>
            <span className="product-card-action">
              {configurable && product.inventory_strategy !== "UNAVAILABLE"
                ? t.customize
                : t.viewProduct}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

import type { ProductReview } from "@/modules/reviews/schema";
import { ReviewForm } from "./review-form";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { storefrontMessages } from "@/modules/i18n/messages";

function Stars({
  rating,
  locale,
}: {
  rating: number;
  locale: StorefrontLocale;
}) {
  return (
    <span
      className="review-stars"
      aria-label={
        locale === "sv" ? `${rating} av 5 stjärnor` : `${rating} out of 5 stars`
      }
    >
      <span aria-hidden="true">{"★".repeat(rating)}</span>
      <span aria-hidden="true" className="empty-stars">
        {"★".repeat(5 - rating)}
      </span>
    </span>
  );
}

export function ProductReviews({
  reviews,
  productId,
  productSlug,
  locale,
}: {
  reviews: ProductReview[];
  productId: string;
  productSlug: string;
  locale: StorefrontLocale;
}) {
  const t = storefrontMessages[locale];
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;
  return (
    <section className="section reviews-section" id="reviews">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t.reviewsEyebrow}</p>
          <h2>{t.customerReviews}</h2>
        </div>
        {average !== null && (
          <p className="review-average">
            <Stars rating={Math.round(average)} locale={locale} />
            {average.toFixed(1)} {locale === "sv" ? "från" : "from"}{" "}
            {reviews.length} {reviews.length === 1 ? t.review : t.reviews}
          </p>
        )}
      </div>
      {reviews.length ? (
        <div className="review-grid">
          {reviews.map((review) => (
            <article key={review.id} className="review-card">
              <Stars rating={review.rating} locale={locale} />
              {review.title && <h3>{review.title}</h3>}
              <blockquote>“{review.body}”</blockquote>
              <p>
                {review.display_name}
                {review.verified_purchase && (
                  <span className="verified-review">{t.verifiedPurchase}</span>
                )}
              </p>
              <time dateTime={review.created_at}>
                {new Date(review.created_at).toLocaleDateString(
                  locale === "sv" ? "sv-SE" : "en-SE",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">{t.noReviews}</p>
      )}
      <ReviewForm productId={productId} productSlug={productSlug} />
    </section>
  );
}

import type { ProductReview } from "@/modules/reviews/schema";
import { ReviewForm } from "./review-form";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="review-stars" aria-label={`${rating} out of 5 stars`}>
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
}: {
  reviews: ProductReview[];
  productId: string;
  productSlug: string;
}) {
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;
  return (
    <section className="section reviews-section" id="reviews">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Made for real homes</p>
          <h2>Customer reviews</h2>
        </div>
        {average !== null && (
          <p className="review-average">
            <Stars rating={Math.round(average)} />
            {average.toFixed(1)} from {reviews.length} review
            {reviews.length === 1 ? "" : "s"}
          </p>
        )}
      </div>
      {reviews.length ? (
        <div className="review-grid">
          {reviews.map((review) => (
            <article key={review.id} className="review-card">
              <Stars rating={review.rating} />
              {review.title && <h3>{review.title}</h3>}
              <blockquote>“{review.body}”</blockquote>
              <p>
                {review.display_name}
                {review.verified_purchase && (
                  <span className="verified-review">Verified purchase</span>
                )}
              </p>
              <time dateTime={review.created_at}>
                {new Date(review.created_at).toLocaleDateString("en-SE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          No reviews yet. If this piece has found a home with you, we’d love to
          hear about it.
        </p>
      )}
      <ReviewForm productId={productId} productSlug={productSlug} />
    </section>
  );
}

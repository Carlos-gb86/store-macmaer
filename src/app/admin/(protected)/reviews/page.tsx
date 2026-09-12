import {
  deleteTestimonialAction,
  featureReviewAction,
  moderateReviewAction,
  saveTestimonialAction,
} from "@/modules/reviews/actions";
import { requireAdminPage } from "@/modules/admin/auth";

export default async function ReviewsAdminPage() {
  const { client } = await requireAdminPage();
  const [reviewsResult, testimonialsResult, productsResult] = await Promise.all(
    [
      client
        .from("product_reviews")
        .select(
          "id,product_id,display_name,rating,title,body,status,verified_purchase,source,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(250),
      client
        .from("testimonials")
        .select("id,review_id,quote,attribution,active,sort_order")
        .order("sort_order")
        .order("id"),
      client.from("products").select("id,title"),
    ],
  );
  if (reviewsResult.error) throw reviewsResult.error;
  if (testimonialsResult.error) throw testimonialsResult.error;
  if (productsResult.error) throw productsResult.error;
  const productNames = new Map(
    productsResult.data.map((product) => [product.id, product.title]),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Reviews & testimonials</h1>
          <p className="section-intro">
            Customer reviews remain private until approved. Feature only quotes
            you are comfortable presenting on the homepage.
          </p>
        </div>
      </div>
      <section className="admin-section">
        <h2>Review moderation</h2>
        {reviewsResult.data.length ? (
          <div className="review-admin-list">
            {reviewsResult.data.map((review) => (
              <article key={review.id} className="admin-card">
                <header>
                  <div>
                    <strong>
                      {"★".repeat(review.rating)} · {review.display_name}
                    </strong>
                    <small>
                      {productNames.get(review.product_id) ??
                        "Archived product"}
                      {review.verified_purchase ? " · verified purchase" : ""}
                      {` · ${review.source.toLowerCase()}`}
                    </small>
                  </div>
                  <span className="status-badge">
                    {review.status.toLowerCase()}
                  </span>
                </header>
                {review.title && <h3>{review.title}</h3>}
                <p>{review.body}</p>
                <small>
                  {new Date(review.created_at).toLocaleString("en-SE")}
                </small>
                <div className="admin-actions">
                  {(["APPROVED", "REJECTED", "PENDING"] as const).map(
                    (status) => (
                      <form action={moderateReviewAction} key={status}>
                        <input type="hidden" name="id" value={review.id} />
                        <input type="hidden" name="status" value={status} />
                        <button
                          className={
                            status === "APPROVED" ? undefined : "secondary"
                          }
                          disabled={review.status === status}
                        >
                          {status === "PENDING"
                            ? "Return to pending"
                            : status === "APPROVED"
                              ? "Approve"
                              : "Reject"}
                        </button>
                      </form>
                    ),
                  )}
                  {review.status === "APPROVED" && (
                    <form action={featureReviewAction}>
                      <input type="hidden" name="id" value={review.id} />
                      <button className="secondary">Feature on homepage</button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No reviews have been submitted.</p>
        )}
      </section>
      <section className="admin-section">
        <h2>Homepage testimonials</h2>
        <p className="field-note">
          A featured review is copied here so shortening it never alters the
          original customer review.
        </p>
        <div className="review-admin-list">
          {testimonialsResult.data.map((item) => (
            <form
              action={saveTestimonialAction}
              className="admin-card"
              key={item.id}
            >
              <input type="hidden" name="id" value={item.id} />
              <label>
                Quote
                <textarea
                  name="quote"
                  defaultValue={item.quote}
                  required
                  maxLength={1000}
                />
              </label>
              <div className="admin-grid">
                <label>
                  Attribution
                  <input
                    name="attribution"
                    defaultValue={item.attribution}
                    required
                    maxLength={120}
                  />
                </label>
                <label>
                  Display order
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={item.sort_order}
                  />
                </label>
              </div>
              <label className="check-field">
                <span>
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={item.active}
                  />
                  Published on homepage
                </span>
              </label>
              <div className="admin-actions">
                <button>Save testimonial</button>
                <button
                  formAction={deleteTestimonialAction}
                  className="danger secondary"
                >
                  Delete
                </button>
              </div>
            </form>
          ))}
          <form action={saveTestimonialAction} className="admin-card">
            <h3>Add a manual testimonial</h3>
            <label>
              Quote
              <textarea name="quote" required minLength={10} maxLength={1000} />
            </label>
            <div className="admin-grid">
              <label>
                Attribution
                <input name="attribution" required maxLength={120} />
              </label>
              <label>
                Display order
                <input name="sort_order" type="number" defaultValue="0" />
              </label>
            </div>
            <label className="check-field">
              <span>
                <input name="active" type="checkbox" />
                Publish immediately
              </span>
            </label>
            <button>Add testimonial</button>
          </form>
        </div>
      </section>
    </>
  );
}

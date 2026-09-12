import type { Testimonial } from "@/modules/reviews/schema";

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <section
      className="testimonials-section"
      aria-labelledby="testimonials-title"
    >
      <p className="eyebrow">A few kind words</p>
      <h2 id="testimonials-title">Loved in homes near and far.</h2>
      <div className="testimonial-grid">
        {items.map((item) => (
          <figure key={item.id}>
            <blockquote>“{item.quote}”</blockquote>
            <figcaption>— {item.attribution}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

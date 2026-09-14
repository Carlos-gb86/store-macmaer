import type { Testimonial } from "@/modules/reviews/schema";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { storefrontMessages } from "@/modules/i18n/messages";

export function Testimonials({
  items,
  locale,
}: {
  items: Testimonial[];
  locale: StorefrontLocale;
}) {
  if (!items.length) return null;
  const t = storefrontMessages[locale];
  return (
    <section
      className="testimonials-section"
      aria-labelledby="testimonials-title"
    >
      <p className="eyebrow">{t.testimonialEyebrow}</p>
      <h2 id="testimonials-title">{t.testimonialTitle}</h2>
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

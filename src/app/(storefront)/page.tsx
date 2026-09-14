import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogue } from "@/modules/catalog/repository";
import { getHomepage } from "@/modules/content/repository";
import { resolveImage } from "@/modules/media/resolve-image";
import { getStorefrontContext } from "@/modules/currency/repository";
import { getTestimonials } from "@/modules/reviews/repository";
import { Testimonials } from "@/components/reviews/testimonials";
import type { Metadata } from "next";
import { ExternalArrow } from "@/components/ui/external-arrow";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { storefrontMessages } from "@/modules/i18n/messages";
import { localizeCatalogue, localizeHomepage } from "@/modules/i18n/localize";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const [rawCatalogue, rawContent, context, testimonials, locale] =
    await Promise.all([
      getCatalogue(),
      getHomepage(),
      getStorefrontContext(),
      getTestimonials(),
      getStorefrontLocale(),
    ]);
  const catalogue = localizeCatalogue(rawCatalogue, locale);
  const content = localizeHomepage(rawContent, locale);
  const t = storefrontMessages[locale];
  return (
    <>
      {content.hero_visible && (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{content.hero_eyebrow}</p>
            <h1>{content.hero_title}</h1>
            <p>{content.hero_subtitle}</p>
            <Link href={content.hero_cta_path} className="button">
              {content.hero_cta_label} <ExternalArrow />
            </Link>
            <span className="hero-footnote">{t.designedHandmade}</span>
          </div>
          <div className="hero-image">
            <Image
              src={resolveImage(content.hero_image)}
              alt={content.hero_alt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 800px) 100vw, 55vw"
            />
            <span className="hero-image-caption">{t.beautyDetails}</span>
          </div>
        </section>
      )}
      <Container>
        {content.featured_visible && (
          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t.favouriteEyebrow}</p>
                <h2>{t.favouriteTitle}</h2>
              </div>
              <Link href="/shop" className="text-link">
                {t.exploreAll} <ExternalArrow />
              </Link>
            </div>
            <div className="product-grid">
              {content.product_ids
                .map((id) => catalogue.products.find((p) => p.id === id))
                .filter((p) => p !== undefined)
                .map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pricing={context.pricing}
                    locale={locale}
                  />
                ))}
            </div>
          </section>
        )}
        {content.collections_visible && (
          <section className="texture-section">
            <p className="eyebrow">{t.textureEyebrow}</p>
            <h2>{t.textureTitle}</h2>
            <div className="texture-links">
              {content.collection_ids
                .map((id) => catalogue.collections.find((c) => c.id === id))
                .filter((c) => c !== undefined)
                .map((collection, index) => (
                  <Link
                    key={collection.id}
                    href={"/collections/" + collection.slug}
                  >
                    <span className="small">0{index + 1}</span>
                    <span>{collection.name}</span>
                    <ExternalArrow size={18} />
                  </Link>
                ))}
            </div>
          </section>
        )}
      </Container>
      <Container>
        <Testimonials items={testimonials} locale={locale} />
        <div className="values-strip">
          <p>
            <span>01</span> {t.madeByHand}
          </p>
          <p>
            <span>02</span> {t.thoughtfulTextures}
          </p>
          <p>
            <span>03</span> {t.playfulView}
          </p>
        </div>
      </Container>
    </>
  );
}

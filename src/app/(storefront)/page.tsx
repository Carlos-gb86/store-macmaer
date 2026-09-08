import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogue } from "@/modules/catalog/repository";
import { getHomepage } from "@/modules/content/repository";
import { resolveImage } from "@/modules/media/resolve-image";
import { getStorefrontContext } from "@/modules/currency/repository";
export default async function Home() {
  const [catalogue, content, context] = await Promise.all([
    getCatalogue(),
    getHomepage(),
    getStorefrontContext(),
  ]);
  return (
    <>
      {content.hero_visible && (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{content.hero_eyebrow}</p>
            <h1>{content.hero_title}</h1>
            <p>{content.hero_subtitle}</p>
            <Link href={content.hero_cta_path} className="button">
              {content.hero_cta_label} <span aria-hidden="true">↗</span>
            </Link>
            <span className="hero-footnote">DESIGNED & HANDMADE IN SWEDEN</span>
          </div>
          <div className="hero-image">
            <Image
              src={resolveImage(content.hero_image)}
              alt={content.hero_alt}
              fill
              priority
              sizes="(max-width: 800px) 100vw, 55vw"
            />
            <span className="hero-image-caption">
              The beauty is in the details.
            </span>
          </div>
        </section>
      )}
      <Container>
        {content.featured_visible && (
          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Find your favourite</p>
                <h2>Small pieces. Big personality.</h2>
              </div>
              <Link href="/shop" className="text-link">
                Explore all pieces ↗
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
                  />
                ))}
            </div>
          </section>
        )}
        {content.collections_visible && (
          <section className="texture-section">
            <p className="eyebrow">A feeling for every room</p>
            <h2>Fall in love with texture.</h2>
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
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
            </div>
          </section>
        )}
      </Container>
      {content.story_visible && (
        <section className="story-section" id="story">
          <div className="story-image">
            <Image
              src={resolveImage(content.story_image)}
              alt={content.story_alt}
              fill
              sizes="(max-width: 800px) 100vw, 50vw"
            />
          </div>
          <div className="story-copy">
            <p className="eyebrow">{content.story_eyebrow}</p>
            <h2>{content.story_title}</h2>
            {content.story_text.split(/\n\s*\n/).map((text, i) => (
              <p key={i}>{text}</p>
            ))}
            <Link href="/collections" className="text-link">
              Find your own little piece ↗
            </Link>
          </div>
        </section>
      )}
      <Container>
        <div className="values-strip">
          <p>
            <span>01</span> Made by hand
          </p>
          <p>
            <span>02</span> Thoughtful textures
          </p>
          <p>
            <span>03</span> A playful point of view
          </p>
        </div>
      </Container>
    </>
  );
}

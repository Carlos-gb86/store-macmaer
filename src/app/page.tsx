import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogue } from "@/modules/catalog/repository";
export default async function Home() {
  const catalogue = await getCatalogue();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Sculptural shapes. Everyday softness.</p>
          <h1>
            A softer
            <br />
            kind of <em>home.</em>
          </h1>
          <p>
            Thoughtfully knotted pillows and little things to love. Made by
            hand, to make a space your own.
          </p>
          <Link href="/shop" className="button">
            Discover the collection <span aria-hidden="true">↗</span>
          </Link>
          <span className="hero-footnote">DESIGNED & HANDMADE IN SWEDEN</span>
        </div>
        <div className="hero-image">
          <Image
            src="/images/catalogue/story.jpg"
            alt="Sculptural ivory bouclé knot pillow beside a ceramic vase and a branch"
            fill
            priority
            sizes="(max-width: 800px) 100vw, 55vw"
          />
          <span className="hero-image-caption">
            The beauty is in the details.
          </span>
        </div>
      </section>
      <Container>
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
            {catalogue.products
              .filter((p) => p.featured)
              .slice(0, 4)
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </section>
        <section className="texture-section">
          <p className="eyebrow">A feeling for every room</p>
          <h2>Fall in love with texture.</h2>
          <div className="texture-links">
            {catalogue.collections.map((collection, index) => (
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
      </Container>
      <section className="story-section" id="story">
        <div className="story-image">
          <Image
            src="/images/catalogue/cotton.jpg"
            alt="A handmade ivory knot pillow held close, showing its soft bouclé texture"
            fill
            sizes="(max-width: 800px) 100vw, 50vw"
          />
        </div>
        <div className="story-copy">
          <p className="eyebrow">From our hands to your home</p>
          <h2>
            Made slowly.
            <br />
            Loved for longer.
          </h2>
          <p>
            We believe the things around us should have a little soul. A
            beautiful texture. An unexpected shape. The quiet character of
            something made by hand.
          </p>
          <p>
            Macmaer brings together Scandinavian simplicity and a love of making
            — one knot at a time.
          </p>
          <Link href="/collections" className="text-link">
            Find your own little piece ↗
          </Link>
        </div>
      </section>
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductConfigurator } from "@/components/catalog/product-configurator";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogue, getProduct } from "@/modules/catalog/repository";
import { formatCataloguePrice } from "@/modules/catalog/format";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return {
    title: product?.seo_title ?? product?.title ?? "Product not found",
    description: product?.seo_description ?? product?.short_description,
  };
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCatalogue();
  const product = data.products.find((product) => product.slug === slug);
  if (!product) notFound();
  const collection = data.collections.find((collection) =>
    product.collections.includes(collection.slug),
  );
  const related = data.products
    .filter(
      (p) =>
        p.id !== product.id &&
        p.collections.some((slug) => product.collections.includes(slug)),
    )
    .slice(0, 4);
  return (
    <Container className="page-section">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/shop">All pieces</Link>
        <span>/</span>
        {collection && (
          <>
            <Link href={"/collections/" + collection.slug}>
              {collection.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span>{product.title}</span>
      </nav>
      <div className="product-detail">
        <ProductGallery images={product.images} />
        <div className="product-information">
          <p className="eyebrow">{collection?.name ?? "Macmaer"}</p>
          <h1>{product.title}</h1>
          <p className="product-price">
            {product.variants.length ? "From " : ""}
            {formatCataloguePrice(product.base_price, product.currency)}
          </p>
          {product.compare_at_price !== null && (
            <p className="small muted">
              <span className="sr-only">Previous catalogue price </span>
              <s>
                {formatCataloguePrice(
                  product.compare_at_price,
                  product.currency,
                )}
              </s>
            </p>
          )}
          <p className="small muted">
            Catalogue price. Final pricing will be available when ordering
            opens.
          </p>
          <p className="product-description">{product.short_description}</p>
          <ProductConfigurator product={product} />
          <div className="product-details-list">
            <details open>
              <summary>The details</summary>
              <p>{product.description}</p>
            </details>
            <details>
              <summary>Materials & care</summary>
              <p>{product.materials}</p>
              <p>{product.care}</p>
            </details>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <h2>A little more to love.</h2>
          </div>
          <div className="product-grid">
            {related.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}

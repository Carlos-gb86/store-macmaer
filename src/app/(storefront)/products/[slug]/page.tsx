import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductConfigurator } from "@/components/catalog/product-configurator";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogue, getProduct } from "@/modules/catalog/repository";
import { formatMoney } from "@/modules/currency/money";
import { clientPricingContext } from "@/modules/currency/schema";
import { getStorefrontContext } from "@/modules/currency/repository";
import {
  calculateProductStartingPrice,
  displayAmount,
} from "@/modules/pricing/calculate";
import { getServerEnv } from "@/lib/env/server";
import { RichText } from "@/components/content/rich-text";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { getProductReviews } from "@/modules/reviews/repository";
import { ProductReviews } from "@/components/reviews/product-reviews";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteAsset, siteUrl } from "@/modules/seo/site";
import { resolveImage } from "@/modules/media/resolve-image";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { storefrontMessages } from "@/modules/i18n/messages";
import { localizeCatalogue, localizeProduct } from "@/modules/i18n/localize";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [rawProduct, locale] = await Promise.all([
    getProduct((await params).slug),
    getStorefrontLocale(),
  ]);
  const product = rawProduct ? localizeProduct(rawProduct, locale) : undefined;
  return {
    title:
      product?.seo_title ??
      product?.title ??
      (locale === "sv" ? "Produkten hittades inte" : "Product not found"),
    description: product?.seo_description ?? product?.short_description,
    alternates: { canonical: `/products/${(await params).slug}` },
    openGraph: product
      ? {
          type: "website",
          title: product.seo_title ?? product.title,
          description: product.seo_description ?? product.short_description,
          images: product.images.slice(0, 4).map((image) => ({
            url: resolveImage(image.path),
            alt: image.alt,
          })),
        }
      : undefined,
  };
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [rawData, context, locale] = await Promise.all([
    getCatalogue(),
    getStorefrontContext(),
    getStorefrontLocale(),
  ]);
  const data = localizeCatalogue(rawData, locale);
  const t = storefrontMessages[locale];
  const product = data.products.find((product) => product.slug === slug);
  if (!product) notFound();
  const reviews = await getProductReviews(product.id);
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
  const startingPrice = displayAmount(
    calculateProductStartingPrice(product),
    context.pricing,
  );
  const aggregateRating = reviews.length
    ? {
        "@type": "AggregateRating",
        ratingValue:
          reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length,
        reviewCount: reviews.length,
      }
    : undefined;
  return (
    <Container className="page-section">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.short_description,
            sku: product.sku ?? undefined,
            image: product.images.map((image) =>
              absoluteAsset(resolveImage(image.path)),
            ),
            url: siteUrl(`/products/${product.slug}`),
            brand: { "@type": "Brand", name: "Macmaer" },
            offers: {
              "@type": "Offer",
              url: siteUrl(`/products/${product.slug}`),
              priceCurrency: "SEK",
              price: (calculateProductStartingPrice(product) / 100).toFixed(2),
              availability:
                product.inventory_strategy === "UNAVAILABLE" ||
                (product.inventory_strategy === "TRACKED" &&
                  !product.stock_quantity)
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
              itemCondition: "https://schema.org/NewCondition",
            },
            aggregateRating,
            review: reviews.slice(0, 20).map((review) => ({
              "@type": "Review",
              author: { "@type": "Person", name: review.display_name },
              datePublished: review.created_at.slice(0, 10),
              name: review.title || undefined,
              reviewBody: review.body,
              reviewRating: {
                "@type": "Rating",
                ratingValue: review.rating,
                bestRating: 5,
              },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: t.shopAll,
                item: siteUrl("/shop"),
              },
              ...(collection
                ? [
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: collection.name,
                      item: siteUrl(`/collections/${collection.slug}`),
                    },
                  ]
                : []),
              {
                "@type": "ListItem",
                position: collection ? 3 : 2,
                name: product.title,
                item: siteUrl(`/products/${product.slug}`),
              },
            ],
          },
        ]}
      />
      <nav aria-label={t.breadcrumbLabel} className="breadcrumb">
        <Link href="/shop">{t.allPieces}</Link>
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
          <div className="product-price-row">
            <p className="product-price">
              {product.variants.length ? `${t.from} ` : ""}
              {formatMoney(startingPrice, context.pricing.currency)}
            </p>
            <CurrencySelector
              currency={context.pricing.currency}
              currencies={context.settings.map((setting) => ({
                code: setting.code,
                available: context.pricing.availableCurrencies.includes(
                  setting.code,
                ),
              }))}
              notice={context.pricing.unavailableReason}
            />
          </div>
          {product.compare_at_price !== null && !product.variants.length && (
            <p className="small muted">
              <span className="sr-only">{t.previousPrice} </span>
              <s>
                {formatMoney(
                  displayAmount(product.compare_at_price, context.pricing),
                  context.pricing.currency,
                )}
              </s>
            </p>
          )}
          <p className="small muted">{t.displayEstimate}</p>
          <p className="product-description">{product.short_description}</p>
          <ProductConfigurator
            product={product}
            pricing={clientPricingContext(context.pricing)}
            commerceEnabled={getServerEnv().CATALOG_SOURCE === "supabase"}
          />
          <div className="product-details-list">
            <details open>
              <summary>{t.productDetails}</summary>
              <RichText
                document={product.description_document}
                fallback={product.description}
              />
            </details>
            <details>
              <summary>{t.materialsCare}</summary>
              <p>{product.materials}</p>
              <p>{product.care}</p>
            </details>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <h2>{t.moreToLove}</h2>
          </div>
          <div className="product-grid">
            {related.map((product) => (
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
      <ProductReviews
        reviews={reviews}
        productId={product.id}
        productSlug={product.slug}
        locale={locale}
      />
    </Container>
  );
}

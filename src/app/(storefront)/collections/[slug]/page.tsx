import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Catalogue } from "@/components/catalog/catalogue";
import { getCatalogue, getCollection } from "@/modules/catalog/repository";
import { resolveImage } from "@/modules/media/resolve-image";
import type { SearchParams } from "@/modules/catalog/query";
import { RichText } from "@/components/content/rich-text";
import { getStorefrontContext } from "@/modules/currency/repository";
import { JsonLd } from "@/components/seo/json-ld";
import { siteUrl } from "@/modules/seo/site";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { storefrontMessages } from "@/modules/i18n/messages";
import { localizeCatalogue, localizeCollection } from "@/modules/i18n/localize";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [collection, locale] = await Promise.all([
    getCollection((await params).slug),
    getStorefrontLocale(),
  ]);
  const localized = collection
    ? localizeCollection(collection, locale)
    : undefined;
  return {
    title:
      localized?.seo_title ??
      localized?.name ??
      (locale === "sv" ? "Kollektionen hittades inte" : "Collection not found"),
    description: localized?.seo_description ?? localized?.description,
    alternates: { canonical: `/collections/${(await params).slug}` },
  };
}
export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [rawData, query, context, locale] = await Promise.all([
    getCatalogue(),
    searchParams,
    getStorefrontContext(),
    getStorefrontLocale(),
  ]);
  const data = localizeCatalogue(rawData, locale);
  const t = storefrontMessages[locale];
  const collection = data.collections.find(
    (collection) => collection.slug === slug,
  );
  if (!collection) notFound();
  return (
    <Container className="page-section">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: t.collections,
              item: siteUrl("/collections"),
            },
            {
              "@type": "ListItem",
              position: 2,
              name: collection.name,
              item: siteUrl(`/collections/${collection.slug}`),
            },
          ],
        }}
      />
      <Link href="/collections" className="breadcrumb">
        {t.collections} / {collection.name}
      </Link>
      <div className="collection-intro">
        <div>
          <p className="eyebrow">
            {locale === "sv"
              ? `${t.collectionPrefix} ${collection.name}`
              : `${t.collectionPrefix} ${collection.name} ${t.collectionSuffix}`}
          </p>
          <h1>{collection.name}</h1>
          <RichText
            document={collection.description_document}
            fallback={collection.description}
          />
        </div>
        {collection.image_path && (
          <div className="collection-cover">
            <Image
              src={resolveImage(collection.image_path)}
              alt={collection.image_alt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 640px) 100vw, 35vw"
              className="product-photo"
            />
          </div>
        )}
      </div>
      <Catalogue
        data={data}
        params={query}
        collection={slug}
        pricing={context.pricing}
        locale={locale}
      />
    </Container>
  );
}

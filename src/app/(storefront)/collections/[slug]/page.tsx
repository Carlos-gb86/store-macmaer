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
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollection((await params).slug);
  return {
    title: collection?.seo_title ?? collection?.name ?? "Collection not found",
    description: collection?.seo_description ?? collection?.description,
  };
}
export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [data, query, context] = await Promise.all([
    getCatalogue(),
    searchParams,
    getStorefrontContext(),
  ]);
  const collection = data.collections.find(
    (collection) => collection.slug === slug,
  );
  if (!collection) notFound();
  return (
    <Container className="page-section">
      <Link href="/collections" className="breadcrumb">
        Collections / {collection.name}
      </Link>
      <div className="collection-intro">
        <div>
          <p className="eyebrow">The {collection.name} collection</p>
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
              priority
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
      />
    </Container>
  );
}

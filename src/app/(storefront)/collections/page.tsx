import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { CollectionCard } from "@/components/catalog/collection-card";
import { getCatalogue } from "@/modules/catalog/repository";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { storefrontMessages } from "@/modules/i18n/messages";
import { localizeCatalogue } from "@/modules/i18n/localize";
import { storefrontCollections } from "@/modules/catalog/taxonomy";
export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv" ? "Kollektioner" : "Collections",
    alternates: { canonical: "/collections" },
  };
}
export default async function Collections() {
  const [catalogue, locale] = await Promise.all([
    getCatalogue(),
    getStorefrontLocale(),
  ]);
  const collections = storefrontCollections(
    localizeCatalogue(catalogue, locale).collections,
  );
  const t = storefrontMessages[locale];
  const cards = collections.map((collection) => ({
    collection,
    productCount: catalogue.products.filter((product) =>
      product.collections.includes(collection.slug),
    ).length,
  }));
  return (
    <Container className="page-section collections-page">
      <div className="collections-overview-intro">
        <div>
          <p className="eyebrow">{t.collectionsEyebrow}</p>
          <h1>{t.collectionsTitle}</h1>
        </div>
        <p>{t.collectionsIntro}</p>
      </div>
      <div className="collections-grid">
        {cards.map(({ collection, productCount }, index) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            index={index + 1}
            countLabel={`${productCount} ${productCount === 1 ? t.piece : t.pieces}`}
            priority={index < 2}
          />
        ))}
      </div>
      {!collections.length && <p>{t.collectionsEmpty}</p>}
    </Container>
  );
}

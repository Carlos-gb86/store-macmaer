import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { CollectionCard } from "@/components/catalog/collection-card";
import { getCatalogue } from "@/modules/catalog/repository";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { storefrontMessages } from "@/modules/i18n/messages";
import { localizeCatalogue } from "@/modules/i18n/localize";
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
  const { collections } = localizeCatalogue(catalogue, locale);
  const t = storefrontMessages[locale];
  return (
    <Container className="page-section">
      <div className="page-intro">
        <p className="eyebrow">{t.collectionsEyebrow}</p>
        <h1>{t.collectionsTitle}</h1>
        <p>{t.collectionsIntro}</p>
      </div>
      <div className="collections-grid">
        {collections.map((collection, index) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            priority={index < 2}
          />
        ))}
      </div>
      {!collections.length && <p>{t.collectionsEmpty}</p>}
    </Container>
  );
}

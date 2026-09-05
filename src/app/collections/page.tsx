import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { CollectionCard } from "@/components/catalog/collection-card";
import { getCatalogue } from "@/modules/catalog/repository";
export const metadata: Metadata = { title: "Collections" };
export default async function Collections() {
  const { collections } = await getCatalogue();
  return (
    <Container className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Explore by texture</p>
        <h1>A collection to call your own.</h1>
        <p>
          From cloud-like bouclé to the gentle sheen of velvet. Follow your
          feeling.
        </p>
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
      {!collections.length && (
        <p>Our collections are taking shape. Please visit again soon.</p>
      )}
    </Container>
  );
}

import Image from "./catalogue-image";
import Link from "next/link";
import type { Collection } from "@/modules/catalog/schema";
import { resolveImage } from "@/modules/media/resolve-image";
import { ExternalArrow } from "@/components/ui/external-arrow";
export function CollectionCard({
  collection,
  priority = false,
}: {
  collection: Collection;
  priority?: boolean;
}) {
  return (
    <Link href={"/collections/" + collection.slug} className="collection-card">
      <div className="collection-image">
        {collection.image_path && (
          <Image
            src={resolveImage(collection.image_path)}
            alt={collection.image_alt}
            fill
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            sizes="(max-width: 640px) 100vw, 50vw"
            className="product-photo"
          />
        )}
      </div>
      <div className="collection-caption">
        <h2>{collection.name}</h2>
        <ExternalArrow size={18} />
      </div>
      <p className="muted">{collection.description}</p>
    </Link>
  );
}

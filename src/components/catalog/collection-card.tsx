import Image from "./catalogue-image";
import Link from "next/link";
import type { Collection } from "@/modules/catalog/schema";
import { resolveImage } from "@/modules/media/resolve-image";
import { ExternalArrow } from "@/components/ui/external-arrow";
export function CollectionCard({
  collection,
  index,
  countLabel,
  priority = false,
}: {
  collection: Collection;
  index: number;
  countLabel: string;
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
            sizes="(max-width: 800px) 50vw, 25vw"
            className="product-photo"
          />
        )}
        <span className="collection-index" aria-hidden="true">
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <div className="collection-caption">
        <div>
          <p className="collection-count">{countLabel}</p>
          <h2>{collection.name}</h2>
        </div>
        <span className="collection-card-arrow" aria-hidden="true">
          <ExternalArrow size={16} />
        </span>
      </div>
      <p className="muted">{collection.description}</p>
    </Link>
  );
}

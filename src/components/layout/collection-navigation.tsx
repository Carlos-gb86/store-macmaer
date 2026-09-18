"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

type NavigationCollection = {
  slug: string;
  name: string;
};

export function CollectionNavigation({
  label,
  collections,
}: {
  label: string;
  collections: NavigationCollection[];
}) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div
      className={`nav-dropdown${dismissed ? " is-dismissed" : ""}`}
      onMouseLeave={() => setDismissed(false)}
    >
      <Link
        href="/collections"
        className="nav-dropdown-trigger"
        onFocus={() => setDismissed(false)}
      >
        {label}
        <ChevronDown aria-hidden="true" />
      </Link>
      <div className="nav-dropdown-menu">
        <div className="nav-dropdown-panel">
          {collections.map((collection) => (
            <Link
              key={collection.slug}
              href={`/collections/${collection.slug}`}
              onClick={(event) => {
                setDismissed(true);
                event.currentTarget.blur();
              }}
            >
              {collection.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

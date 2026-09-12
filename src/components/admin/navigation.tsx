"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AdminNavigation() {
  const path = usePathname();
  return (
    <nav aria-label="Administration">
      {[
        ["orders", "Orders"],
        ["products", "Products"],
        ["collections", "Collections"],
        ["tags", "Tags"],
        ["media", "Media"],
        ["content", "Homepage"],
        ["discounts", "Discounts"],
        ["settings/shipping", "Shipping"],
        ["settings/tax", "Tax"],
        ["settings/currency", "Currency"],
      ].map(([item, label]) => (
        <Link
          key={item}
          href={"/admin/" + item}
          aria-current={path.startsWith("/admin/" + item) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

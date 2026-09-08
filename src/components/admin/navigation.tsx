"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AdminNavigation() {
  const path = usePathname();
  return (
    <nav aria-label="Administration">
      {["products", "collections", "tags", "media", "content"].map((item) => (
        <Link
          key={item}
          href={"/admin/" + item}
          aria-current={path.startsWith("/admin/" + item) ? "page" : undefined}
        >
          {item === "content" ? "Homepage" : item}
        </Link>
      ))}
    </nav>
  );
}
